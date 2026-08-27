import type {
  ChallengeId,
  CharacterId,
  Choice,
  Condition,
  DecisionRecord,
  Effects,
  Ending,
  GameEvent,
  GameSettings,
  Message,
  PendingConsequence,
  Relationships,
  StatKey,
  Stats,
} from '../types/game'

export const INITIAL_STATS: Stats = {
  deadlines: 64,
  team: 70,
  client: 72,
}

export const INITIAL_RELATIONSHIPS: Relationships = {
  alexey: 60,
  mikhail: 60,
  irina: 60,
  olga: 60,
  vera: 60,
}

export const DEFAULT_SETTINGS: GameSettings = {
  mode: 'training',
  challengeId: null,
  timedCrises: false,
}

export const STAT_META: Record<StatKey, { label: string; shortLabel: string }> = {
  deadlines: { label: 'Срок', shortLabel: 'Срок' },
  team: { label: 'Команда', shortLabel: 'Команда' },
  client: { label: 'Клиент', shortLabel: 'Клиент' },
}

export const STAT_KEYS: StatKey[] = ['deadlines', 'team', 'client']

export const CHALLENGES: Record<ChallengeId, { title: string; description: string }> = {
  balance: {
    title: 'Удержать систему',
    description: 'Не опустить ни один ресурс ниже 45 за весь день.',
  },
  humane: {
    title: 'Без героизма',
    description: 'Завершить день без переработок, больничного онлайн и последнего рывка.',
  },
  lean: {
    title: 'Сдержать расходы',
    description: 'Обойтись без экстренной закупки, неоплаченного объёма и платного рывка.',
  },
}

export const CRISIS_RECOVERY: Record<StatKey, { title: string; action: string; effects: Effects; flag: string }> = {
  deadlines: {
    title: 'График остановлен',
    action: 'Открыть аварийную ночную смену',
    effects: { deadlines: 25, team: -14 },
    flag: 'deadlineCrisisRecovered',
  },
  team: {
    title: 'Команда остановила работу',
    action: 'Остановить линию и перераспределить нагрузку',
    effects: { team: 25, deadlines: -12, client: -6 },
    flag: 'teamCrisisRecovered',
  },
  client: {
    title: 'Клиент остановил приёмку',
    action: 'Провести аварийную эскалацию',
    effects: { client: 25, team: -8 },
    flag: 'clientCrisisRecovered',
  },
}

export function clampStat(value: number) {
  return Math.max(0, Math.min(100, value))
}

export function applyEffects(stats: Stats, effects: Effects): Stats {
  const next = { ...stats }
  for (const key of STAT_KEYS) next[key] = clampStat(stats[key] + (effects[key] ?? 0))
  return next
}

export function updateMinimumStats(minimums: Stats, current: Stats): Stats {
  const next = { ...minimums }
  for (const key of STAT_KEYS) next[key] = Math.min(minimums[key], current[key])
  return next
}

export function mergeEffects(...effectSets: Effects[]): Effects {
  const merged: Effects = {}
  for (const effects of effectSets) {
    for (const key of STAT_KEYS) {
      const value = effects[key] ?? 0
      if (value !== 0) merged[key] = (merged[key] ?? 0) + value
    }
  }
  return merged
}

export function collectFlags(current: string[], choiceOrFlags: Choice | string[]) {
  const flags = Array.isArray(choiceOrFlags) ? choiceOrFlags : (choiceOrFlags.flags ?? [])
  return Array.from(new Set([...current, ...flags]))
}

const relationshipStat: Partial<Record<CharacterId, StatKey>> = {
  alexey: 'team',
  mikhail: 'deadlines',
  irina: 'team',
  olga: 'client',
}

export function getRelationshipEffects(choice: Choice): Partial<Relationships> {
  const authors = Array.from(new Set(choice.reactions.map((message) => message.author)))
  const effects: Partial<Relationships> = { ...choice.relationshipEffects }

  for (const author of authors) {
    if (choice.relationshipEffects?.[author] !== undefined) continue
    const key = relationshipStat[author]
    if (!key) continue
    const statValue = choice.effects[key] ?? 0
    if (statValue === 0) continue
    const magnitude = Math.min(6, Math.max(1, Math.ceil(Math.abs(statValue) / 3)))
    effects[author] = statValue > 0 ? magnitude : -magnitude
  }

  return effects
}

export function applyRelationshipEffects(
  relationships: Relationships,
  effects: Partial<Relationships>,
): Relationships {
  const next = { ...relationships }
  for (const character of Object.keys(next) as CharacterId[]) {
    next[character] = clampStat(next[character] + (effects[character] ?? 0))
  }
  return next
}

export function matchesCondition(
  condition: Condition | undefined,
  stats: Stats,
  flags: string[],
  relationships: Relationships = INITIAL_RELATIONSHIPS,
): boolean {
  if (!condition) return true

  if (condition.type === 'flag') {
    const isPresent = flags.includes(condition.flag)
    return condition.present === false ? !isPresent : isPresent
  }

  if (condition.type === 'all') {
    return condition.conditions.every((item) => matchesCondition(item, stats, flags, relationships))
  }

  if (condition.type === 'any') {
    return condition.conditions.some((item) => matchesCondition(item, stats, flags, relationships))
  }

  if (condition.type === 'relationship') {
    const current = relationships[condition.character]
    if (condition.operator === 'lt') return current < condition.value
    if (condition.operator === 'lte') return current <= condition.value
    if (condition.operator === 'gt') return current > condition.value
    return current >= condition.value
  }

  const current = stats[condition.key]
  if (condition.operator === 'lt') return current < condition.value
  if (condition.operator === 'lte') return current <= condition.value
  if (condition.operator === 'gt') return current > condition.value
  return current >= condition.value
}

export function getEventById(events: GameEvent[], eventId: string) {
  const event = events.find((item) => item.id === eventId)
  if (!event) throw new Error(`Unknown event: ${eventId}`)
  return event
}

export function getNextEvent(
  events: GameEvent[],
  currentStage: number,
  stats: Stats,
  flags: string[],
  relationships: Relationships = INITIAL_RELATIONSHIPS,
): GameEvent | undefined {
  const nextStage = Math.min(
    ...events.filter((event) => event.stage > currentStage).map((event) => event.stage),
  )

  if (!Number.isFinite(nextStage)) return undefined
  return events.find(
    (event) => event.stage === nextStage && matchesCondition(event.when, stats, flags, relationships),
  )
}

export function createPendingConsequences(
  choice: Choice,
  source: { eventId: string; eventTime: string; eventTitle: string } = {
    eventId: 'unknown',
    eventTime: '—',
    eventTitle: 'Предыдущее решение',
  },
): PendingConsequence[] {
  return (choice.delayedConsequences ?? []).map((consequence) => ({
    ...consequence,
    remaining: consequence.afterEvents,
    sourceChoiceId: choice.id,
    sourceChoiceText: choice.text,
    sourceEventId: source.eventId,
    sourceEventTime: source.eventTime,
    sourceEventTitle: source.eventTitle,
  }))
}

export function advanceConsequences(pending: PendingConsequence[]) {
  const next: PendingConsequence[] = []
  const dueEffects: Effects[] = []
  const dueMessages: Message[] = []
  const dueFlags: string[] = []
  const resolved: PendingConsequence[] = []

  for (const consequence of pending) {
    const remaining = consequence.remaining - 1
    if (remaining > 0) {
      next.push({ ...consequence, remaining })
      continue
    }
    dueEffects.push(consequence.effects)
    const consequenceSource = {
      eventId: consequence.sourceEventId,
      eventTime: consequence.sourceEventTime,
      eventTitle: consequence.sourceEventTitle,
      choiceId: consequence.sourceChoiceId,
      choiceText: consequence.sourceChoiceText,
    }
    dueMessages.push(...consequence.messages.map((message) => ({ ...message, consequenceSource })))
    dueFlags.push(...(consequence.flags ?? []))
    resolved.push(consequence)
  }

  return {
    pending: next,
    effects: mergeEffects(...dueEffects),
    messages: dueMessages,
    flags: Array.from(new Set(dueFlags)),
    resolved,
  }
}

export function getEnding(stats: Stats, flags: string[] = []): Ending {
  const values = STAT_KEYS.map((key) => stats[key])
  const lowest = Math.min(...values)
  const average = values.reduce((total, value) => total + value, 0) / values.length

  if (lowest <= 18 || average < 32) {
    return {
      id: 'tomorrow',
      kicker: 'Рабочий день формально завершён',
      title: 'Планёрка продолжается завтра',
      description:
        'Сегодня решений было больше, чем доступного ресурса. Критические задачи не исчезли — они просто сменили дату и пришли вместе с процентами.',
      strength: 'Вы не прятались от сложных решений и довели день до финала.',
      risk: 'Один из ресурсов оказался ниже безопасного минимума. Завтра придётся начинать с восстановления системы.',
    }
  }

  if (stats.deadlines >= 76 && stats.team <= 44) {
    return {
      id: 'firefighter',
      kicker: 'Задача закрыта. Цена проявится позже',
      title: 'Пожарный менеджмент',
      description:
        'Вы удерживали темп любой ценой и почти каждый раз находили быстрый выход. Это эффективно в остром кризисе — и опасно, если кризис становится рабочим методом.',
      strength: 'Высокая решительность и умение защищать критический срок.',
      risk: 'Команда стала топливом для результата. Этот запас не бесконечен.',
    }
  }

  if (stats.client >= 78 && stats.client >= stats.team + 14) {
    return {
      id: 'client-first',
      kicker: 'Клиент услышан. Внутри стало громче',
      title: 'Всегда на связи',
      description:
        'Вы последовательно защищали отношения с клиентом и сохраняли контакт даже в неприятных ситуациях. Внешнее доверие выросло, но часть обязательств перекочевала внутрь команды.',
      strength: 'Вы умеете удерживать диалог и превращать напряжение в договорённость.',
      risk: 'Согласие с клиентом не всегда равно управляемому обязательству для команды.',
    }
  }

  if (stats.team >= 78 && stats.team >= stats.deadlines + 10) {
    return {
      id: 'team-first',
      kicker: 'Люди — не расходный материал',
      title: 'Команда прежде всего',
      description:
        'Вы инвестировали время в устойчивость людей, передачу знаний и честные разговоры. Иногда график сопротивлялся, зато к концу дня у проекта осталась команда, способная продолжать работу.',
      strength: 'Доверие, ясные границы и способность развивать людей в кризисе.',
      risk: 'Забота о процессе должна сопровождаться жёсткой приоритизацией результата.',
    }
  }

  const systemsFlags = ['juniorReview', 'scopeNegotiated', 'qualityContained', 'teamReset', 'partialShipment']
  const systemsScore = systemsFlags.filter((flag) => flags.includes(flag)).length
  if (systemsScore >= 3 && lowest >= 42) {
    return {
      id: 'systems',
      kicker: 'Не только потушили — изменили схему',
      title: 'Системный архитектор',
      description:
        'Вместо героизма вы чаще создавали правила, границы и резервные маршруты. День не стал спокойным, но каждое следующее решение опиралось на чуть более устойчивую систему.',
      strength: 'Вы связываете отдельные инциденты и улучшаете способ работы, а не только результат дня.',
      risk: 'Системные решения требуют времени; важно не потерять скорость в действительно срочный момент.',
    }
  }

  return {
    id: 'balanced',
    kicker: 'Система удержалась',
    title: 'Балансировщик',
    description:
      'День закончился без красивой победы и без катастрофы. Вы несколько раз платили одним ресурсом за другой, но сохранили проект целиком — редкий и вполне практичный управленческий результат.',
    strength: 'Вы видите компромиссы и не позволяете одному приоритету поглотить остальные.',
    risk: 'Баланс полезен, пока не превращается в избегание решающей ставки.',
  }
}

export function formatDelta(value = 0) {
  if (value === 0) return '±0'
  return value > 0 ? `+${value}` : `−${Math.abs(value)}`
}

export function getResourceSummary(stats: Stats) {
  let best: StatKey = 'deadlines'
  let weakest: StatKey = 'deadlines'

  for (const key of STAT_KEYS.slice(1)) {
    if (stats[key] > stats[best]) best = key
    if (stats[key] < stats[weakest]) weakest = key
  }

  return { best, weakest }
}

export function describeEffect(value = 0) {
  const absolute = Math.abs(value)
  if (value === 0) return { short: 'без изменений', label: 'без явного изменения' }
  const direction = value > 0 ? 'улучшит' : 'ухудшит'
  const arrow = value > 0 ? '↑' : '↓'
  if (absolute >= 10) return { short: `${arrow} сильно`, label: `сильно ${direction}` }
  if (absolute >= 5) return { short: `${arrow} заметно`, label: `заметно ${direction}` }
  return { short: `${arrow} слегка`, label: `слегка ${direction}` }
}

export function getCrisisKey(stats: Stats): StatKey | null {
  return STAT_KEYS.find((key) => stats[key] <= 0) ?? null
}

export function evaluateChallenge(
  challengeId: ChallengeId | null,
  stats: Stats,
  minimumStats: Stats,
  flags: string[],
) {
  if (!challengeId) return null

  if (challengeId === 'balance') {
    const lowest = Math.min(...STAT_KEYS.map((key) => minimumStats[key]))
    return {
      id: challengeId,
      passed: lowest >= 45,
      detail: lowest >= 45 ? 'Ни один ресурс не опускался ниже 45.' : `Минимальная отметка дня — ${lowest}.`,
      ...CHALLENGES[challengeId],
    }
  }

  if (challengeId === 'humane') {
    const blockedFlags = ['overloadEmployee', 'overtimePrep', 'paidOvertime', 'teamExhausted']
    const used = blockedFlags.filter((flag) => flags.includes(flag))
    return {
      id: challengeId,
      passed: used.length === 0,
      detail: used.length === 0 ? 'День завершён без героического перегруза.' : 'В маршруте была использована переработка или перегруз.',
      ...CHALLENGES[challengeId],
    }
  }

  const costlyFlags = ['reserveSupplier', 'scopeDebt', 'paidOvertime', 'budgetRisk']
  const passed = costlyFlags.every((flag) => !flags.includes(flag))
  return {
    id: challengeId,
    passed,
    detail: passed ? 'Маршрут пройден без экстренных расходов.' : 'В маршруте была экстренная закупка, неоплаченный объём или платный рывок.',
    ...CHALLENGES[challengeId],
  }
}

function totalPositive(effects: Effects) {
  return STAT_KEYS.reduce((total, key) => total + Math.max(0, effects[key] ?? 0), 0)
}

function totalNegative(effects: Effects) {
  return STAT_KEYS.reduce((total, key) => total + Math.min(0, effects[key] ?? 0), 0)
}

function totalImpact(decision: DecisionRecord) {
  return STAT_KEYS.reduce(
    (total, key) => total + Math.abs(decision.effects[key] ?? 0) + Math.abs(decision.delayedEffects[key] ?? 0),
    0,
  )
}

export function getPivotalDecisions(decisions: DecisionRecord[]) {
  if (decisions.length === 0) return []

  const candidates = [
    {
      label: 'Поворот дня',
      decision: decisions.reduce((best, current) => totalImpact(current) > totalImpact(best) ? current : best),
    },
    {
      label: 'Сильное восстановление',
      decision: decisions.reduce((best, current) => totalPositive(current.effects) > totalPositive(best.effects) ? current : best),
    },
    {
      label: 'Цена стратегии',
      decision: decisions.reduce((worst, current) => totalNegative(current.effects) < totalNegative(worst.effects) ? current : worst),
    },
  ]

  const seen = new Set<string>()
  return candidates.filter(({ decision }) => {
    if (seen.has(decision.eventId)) return false
    seen.add(decision.eventId)
    return true
  })
}

export function getMessageVariant(event: GameEvent, seed: number): Message[] {
  if (!event.messageVariants?.length) return []
  let hash = seed
  for (const char of event.id) hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0
  const index = Math.abs(hash) % event.messageVariants.length
  return event.messageVariants[index]
}

export type ThreadStatus = {
  id: 'supply' | 'quality' | 'team' | 'client'
  title: string
  state: 'stable' | 'watch' | 'critical'
  detail: string
}

export function getThreadStatuses(stats: Stats, flags: string[]): ThreadStatus[] {
  const supplyRisk = flags.includes('supplierRisk') || flags.includes('budgetRisk')
  const qualityRisk = flags.includes('qualityRisk') || flags.includes('qualityPressure')
  const teamRisk = stats.team <= 35 || flags.includes('teamExhausted')
  const clientRisk = stats.client <= 35 || flags.includes('scopeDebt')

  return [
    {
      id: 'supply',
      title: 'Поставка',
      state: supplyRisk ? 'critical' : flags.includes('reserveSupplier') ? 'watch' : 'stable',
      detail: supplyRisk ? 'Есть документальный или финансовый хвост' : flags.includes('reserveSupplier') ? 'Резервный маршрут активен' : 'Маршрут поставки контролируется',
    },
    {
      id: 'quality',
      title: 'Качество',
      state: qualityRisk ? 'critical' : flags.includes('qualityContained') || flags.includes('qualityPairing') ? 'stable' : 'watch',
      detail: qualityRisk ? 'Риск дефекта вернётся позже' : flags.includes('qualityContained') ? 'Риск локализован' : 'Границы риска уточняются',
    },
    {
      id: 'team',
      title: 'Команда',
      state: teamRisk ? 'critical' : stats.team <= 55 ? 'watch' : 'stable',
      detail: teamRisk ? 'Запас людей исчерпан' : stats.team <= 55 ? 'Нагрузка требует внимания' : 'Команда сохраняет рабочий ритм',
    },
    {
      id: 'client',
      title: 'Клиент',
      state: clientRisk ? 'critical' : stats.client <= 55 ? 'watch' : 'stable',
      detail: clientRisk ? 'Ожидания вышли из договорённости' : stats.client <= 55 ? 'Нужна ясная коммуникация' : 'Контакт и ожидания удерживаются',
    },
  ]
}
