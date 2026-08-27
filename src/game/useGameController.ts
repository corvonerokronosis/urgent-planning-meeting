import { useCallback, useEffect, useState } from 'react'
import { scenario } from '../data/scenario'
import type {
  Choice,
  CrisisState,
  DecisionRecord,
  GameSettings,
  Message,
  PendingConsequence,
  Relationships,
  Stats,
} from '../types/game'
import {
  advanceConsequences,
  applyEffects,
  applyRelationshipEffects,
  collectFlags,
  createPendingConsequences,
  CRISIS_RECOVERY,
  DEFAULT_SETTINGS,
  getCrisisKey,
  getEventById,
  getNextEvent,
  getRelationshipEffects,
  INITIAL_RELATIONSHIPS,
  INITIAL_STATS,
  matchesCondition,
  mergeEffects,
  updateMinimumStats,
} from './engine'

export const STORAGE_KEY = 'urgent-planning-meeting:run:v5'
export const INCOMPATIBLE_STORAGE_KEYS = [
  'urgent-planning-meeting:run:v4',
  'urgent-planning-meeting:run:v3',
  'urgent-planning-meeting:run:v2',
]

type RemovableStorage = Pick<Storage, 'removeItem'>

function clearIncompatibleSavedRuns(storage: RemovableStorage) {
  INCOMPATIBLE_STORAGE_KEYS.forEach((key) => storage.removeItem(key))
}

export function clearSavedRuns(storage: RemovableStorage) {
  storage.removeItem(STORAGE_KEY)
  clearIncompatibleSavedRuns(storage)
}

export type FinishReason = 'completed' | 'crisis' | null

export type GameSnapshot = {
  currentEventId: string
  selectedChoiceId: string | null
  stats: Stats
  minimumStats: Stats
  relationships: Relationships
  settings: GameSettings
  runSeed: number
  flags: string[]
  decisions: DecisionRecord[]
  lastEffects: Choice['effects'] | null
  pendingConsequences: PendingConsequence[]
  carryOverMessages: Message[]
  crisis: CrisisState | null
  finishedReason: FinishReason
  endTime: string | null
}

const firstEvent = getNextEvent(scenario, 0, INITIAL_STATS, [], INITIAL_RELATIONSHIPS)

if (!firstEvent) throw new Error('Scenario has no starting event')

const createInitialSnapshot = (settings: GameSettings = DEFAULT_SETTINGS): GameSnapshot => ({
  currentEventId: firstEvent.id,
  selectedChoiceId: null,
  stats: { ...INITIAL_STATS },
  minimumStats: { ...INITIAL_STATS },
  relationships: { ...INITIAL_RELATIONSHIPS },
  settings: { ...settings },
  runSeed: Date.now(),
  flags: [],
  decisions: [],
  lastEffects: null,
  pendingConsequences: [],
  carryOverMessages: [],
  crisis: null,
  finishedReason: null,
  endTime: null,
})

function migratePendingConsequences(
  pending: Partial<PendingConsequence>[] | undefined,
  decisions: DecisionRecord[],
): PendingConsequence[] {
  return (pending ?? []).flatMap((consequence) => {
    if (!consequence.id || typeof consequence.remaining !== 'number') return []
    const decision = decisions.find((item) => item.choiceId === consequence.sourceChoiceId)
    return [{
      ...consequence,
      afterEvents: consequence.afterEvents ?? consequence.remaining,
      effects: consequence.effects ?? {},
      messages: consequence.messages ?? [],
      sourceChoiceId: consequence.sourceChoiceId ?? decision?.choiceId ?? 'unknown',
      sourceChoiceText: consequence.sourceChoiceText ?? decision?.choiceText ?? 'Предыдущее решение',
      sourceEventId: consequence.sourceEventId ?? decision?.eventId ?? 'unknown',
      sourceEventTime: consequence.sourceEventTime ?? decision?.eventTime ?? '—',
      sourceEventTitle: consequence.sourceEventTitle ?? decision?.eventTitle ?? 'Предыдущее решение',
    } as PendingConsequence]
  })
}

export function isStats(value: unknown): value is Stats {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<Stats>
  return (['deadlines', 'team', 'client'] as const).every((key) => {
    const stat = candidate[key]
    return Number.isFinite(stat) && stat! >= 0 && stat! <= 100
  })
}

function readSavedSnapshot(): GameSnapshot {
  if (typeof window === 'undefined') return createInitialSnapshot()

  try {
    clearIncompatibleSavedRuns(window.localStorage)
    const currentRaw = window.localStorage.getItem(STORAGE_KEY)
    if (!currentRaw) return createInitialSnapshot()

    const saved = JSON.parse(currentRaw) as Partial<GameSnapshot>
    if (
      !saved.currentEventId
      || !isStats(saved.stats)
      || (saved.minimumStats !== undefined && !isStats(saved.minimumStats))
      || !Array.isArray(saved.flags)
      || !Array.isArray(saved.decisions)
    ) {
      window.localStorage.removeItem(STORAGE_KEY)
      return createInitialSnapshot()
    }
    getEventById(scenario, saved.currentEventId)

    const base = createInitialSnapshot(saved.settings ?? DEFAULT_SETTINGS)
    const lastDecision = saved.decisions.at(-1)
    const migrated: GameSnapshot = {
      ...base,
      ...saved,
      currentEventId: saved.currentEventId,
      stats: saved.stats,
      minimumStats: saved.minimumStats ?? saved.stats,
      relationships: saved.relationships ?? INITIAL_RELATIONSHIPS,
      settings: { ...DEFAULT_SETTINGS, ...saved.settings },
      flags: saved.flags,
      decisions: saved.decisions,
      selectedChoiceId:
        saved.selectedChoiceId ?? (lastDecision?.eventId === saved.currentEventId ? lastDecision.choiceId : null),
      pendingConsequences: migratePendingConsequences(saved.pendingConsequences, saved.decisions),
      carryOverMessages: saved.carryOverMessages ?? [],
      crisis: saved.crisis ?? null,
      finishedReason: saved.finishedReason ?? null,
      endTime: saved.endTime ?? null,
    }

    return migrated
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    clearIncompatibleSavedRuns(window.localStorage)
    return createInitialSnapshot()
  }
}

export function emitGameEvent(
  name: 'start' | 'resume' | 'choice' | 'crisis' | 'finish',
  detail: Record<string, unknown> = {},
) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('urgent-planning:game-event', { detail: { name, ...detail } }))
}

export function useGameController() {
  const [snapshot, setSnapshot] = useState<GameSnapshot>(readSavedSnapshot)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  useEffect(() => {
    if (snapshot.decisions.length === 0) return
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
    setLastSavedAt(new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' }))
  }, [snapshot])

  const startRun = useCallback((settings: GameSettings) => {
    clearSavedRuns(window.localStorage)
    setLastSavedAt(null)
    setSnapshot(createInitialSnapshot(settings))
  }, [])

  const choose = useCallback((choice: Choice) => {
    setSnapshot((current) => {
      if (current.selectedChoiceId || current.crisis) return current
      const event = getEventById(scenario, current.currentEventId)
      const selectedChoice = event.choices.find((candidate) => candidate.id === choice.id)
      if (!selectedChoice || !matchesCondition(
        selectedChoice.availableWhen,
        current.stats,
        current.flags,
        current.relationships,
      )) return current
      const delayedEffects = mergeEffects(
        ...(selectedChoice.delayedConsequences ?? []).map((consequence) => consequence.effects),
      )
      const delayedConsequenceTexts = (selectedChoice.delayedConsequences ?? [])
        .flatMap((consequence) => consequence.messages.map((message) => message.text))
      const relationshipEffects = getRelationshipEffects(selectedChoice)
      const stats = applyEffects(current.stats, selectedChoice.effects)
      const crisisKey = getCrisisKey(stats)
      const next: GameSnapshot = {
        ...current,
        selectedChoiceId: selectedChoice.id,
        stats,
        minimumStats: updateMinimumStats(current.minimumStats, stats),
        relationships: applyRelationshipEffects(current.relationships, relationshipEffects),
        flags: collectFlags(current.flags, selectedChoice),
        lastEffects: selectedChoice.effects,
        pendingConsequences: [
          ...current.pendingConsequences,
          ...createPendingConsequences(selectedChoice, {
            eventId: event.id,
            eventTime: event.time,
            eventTitle: event.title,
          }),
        ],
        crisis: crisisKey ? { key: crisisKey, eventId: event.id } : null,
        decisions: [
          ...current.decisions,
          {
            eventId: event.id,
            eventTitle: event.title,
            eventTime: event.time,
            choiceId: selectedChoice.id,
            choiceLabel: selectedChoice.label,
            choiceText: selectedChoice.text,
            effects: selectedChoice.effects,
            delayedEffects,
            delayedConsequenceTexts,
            relationshipEffects,
            insight: selectedChoice.insight,
          },
        ],
      }
      emitGameEvent('choice', { eventId: event.id, choiceId: selectedChoice.id, mode: current.settings.mode })
      if (crisisKey) emitGameEvent('crisis', { resource: crisisKey, eventId: event.id })
      return next
    })
  }, [])

  const nextEvent = useCallback(() => {
    setSnapshot((current) => {
      if (current.crisis) return current
      const event = getEventById(scenario, current.currentEventId)
      const due = advanceConsequences(current.pendingConsequences)
      const stats = applyEffects(current.stats, due.effects)
      const flags = collectFlags(current.flags, due.flags)
      const crisisKey = getCrisisKey(stats)

      if (crisisKey) {
        emitGameEvent('crisis', { resource: crisisKey, eventId: event.id, delayed: true })
        const crisisEvent = getNextEvent(scenario, event.stage, stats, flags, current.relationships)
        return {
          ...current,
          currentEventId: crisisEvent?.id ?? current.currentEventId,
          selectedChoiceId: crisisEvent ? null : current.selectedChoiceId,
          stats,
          minimumStats: updateMinimumStats(current.minimumStats, stats),
          flags,
          lastEffects: Object.keys(due.effects).length > 0 ? due.effects : null,
          pendingConsequences: due.pending,
          carryOverMessages: due.messages,
          crisis: { key: crisisKey, eventId: crisisEvent?.id ?? event.id },
        }
      }

      const next = getNextEvent(scenario, event.stage, stats, flags, current.relationships)
      if (!next) return current

      return {
        ...current,
        currentEventId: next.id,
        selectedChoiceId: null,
        stats,
        minimumStats: updateMinimumStats(current.minimumStats, stats),
        flags,
        lastEffects: Object.keys(due.effects).length > 0 ? due.effects : null,
        pendingConsequences: due.pending,
        carryOverMessages: due.messages,
      }
    })
  }, [])

  const resolveCrisis = useCallback(() => {
    setSnapshot((current) => {
      if (!current.crisis) return current
      const recovery = CRISIS_RECOVERY[current.crisis.key]
      const stats = applyEffects(current.stats, recovery.effects)
      const nextCrisisKey = getCrisisKey(stats)
      return {
        ...current,
        stats,
        minimumStats: updateMinimumStats(current.minimumStats, stats),
        flags: collectFlags(current.flags, [recovery.flag, 'crisisRecovered']),
        lastEffects: recovery.effects,
        crisis: nextCrisisKey ? { key: nextCrisisKey, eventId: current.currentEventId } : null,
      }
    })
  }, [])

  const finishRun = useCallback((reason: Exclude<FinishReason, null> = 'completed') => {
    setSnapshot((current) => ({
      ...current,
      finishedReason: reason,
      endTime: reason === 'completed' ? '18:18' : getEventById(scenario, current.currentEventId).time,
    }))
  }, [])

  const reset = useCallback(() => {
    clearSavedRuns(window.localStorage)
    setLastSavedAt(null)
    setSnapshot((current) => createInitialSnapshot(current.settings))
  }, [])

  return {
    snapshot,
    choose,
    nextEvent,
    resolveCrisis,
    finishRun,
    reset,
    startRun,
    lastSavedAt,
    hasSavedRun: snapshot.decisions.length > 0 && snapshot.finishedReason === null,
  }
}
