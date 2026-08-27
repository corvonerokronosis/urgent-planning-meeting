import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { scenario, TOTAL_STAGES } from '../data/scenario'
import { formatDelta, getEventById, getMessageVariant, matchesCondition, STAT_KEYS, STAT_META } from '../game/engine'
import type { Choice, Message } from '../types/game'
import type { GameSnapshot } from '../game/useGameController'
import { Brand } from './Brand'
import { CrisisPanel } from './CrisisPanel'
import { DecisionPanel } from './DecisionPanel'
import { DecisionTimer } from './DecisionTimer'
import { ArrowIcon } from './Icons'
import { MessageList } from './MessageList'
import { ParticipantsRail } from './ParticipantsRail'
import { StatusPanel } from './StatusPanel'
import { ThreadTracker } from './ThreadTracker'

type GameScreenProps = {
  snapshot: GameSnapshot
  lastSavedAt: string | null
  onChoose: (choice: Choice) => void
  onCrisisEnd: () => void
  onCrisisRecover: () => void
  onNext: () => void
  onFinish: () => void
}

type Phase = 'incoming' | 'choosing' | 'reaction' | 'ready'

export function GameScreen({
  snapshot,
  lastSavedAt,
  onChoose,
  onCrisisEnd,
  onCrisisRecover,
  onNext,
  onFinish,
}: GameScreenProps) {
  const event = getEventById(scenario, snapshot.currentEventId)
  const incoming = useMemo(
    () => [
      ...snapshot.carryOverMessages.map((message, index) => ({
        ...message,
        time: message.time ?? event.time.replace(/\d{2}$/, (minutes) => String(Math.max(0, Number(minutes) - index - 1)).padStart(2, '0')),
      })),
      ...event.messages,
      ...getMessageVariant(event, snapshot.runSeed),
      ...(event.conditionalMessages?.filter((message) => matchesCondition(
        message.when,
        snapshot.stats,
        snapshot.flags,
        snapshot.relationships,
      )) ?? []),
    ],
    [event, snapshot.carryOverMessages, snapshot.flags, snapshot.relationships, snapshot.runSeed, snapshot.stats],
  )
  const restoredChoice = event.choices.find((choice) => choice.id === snapshot.selectedChoiceId) ?? null
  const [visibleCount, setVisibleCount] = useState(() => restoredChoice ? incoming.length : 0)
  const [reactionCount, setReactionCount] = useState(() => restoredChoice?.reactions.length ?? 0)
  const [selected, setSelected] = useState<Choice | null>(restoredChoice)
  const [phase, setPhase] = useState<Phase>(() => restoredChoice ? 'ready' : 'incoming')
  const consequenceRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    const savedChoice = event.choices.find((choice) => choice.id === snapshot.selectedChoiceId) ?? null
    setVisibleCount(savedChoice ? incoming.length : 0)
    setReactionCount(savedChoice?.reactions.length ?? 0)
    setSelected(savedChoice)
    setPhase(savedChoice ? 'ready' : 'incoming')
    // Event id is the transition boundary; choice updates in one event use local animated state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot.currentEventId])

  useEffect(() => {
    if (phase !== 'incoming') return
    if (visibleCount >= incoming.length) {
      setPhase('choosing')
      return
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const delay = reducedMotion ? 10 : visibleCount === 0 ? 260 : snapshot.carryOverMessages.length > visibleCount ? 420 : 620
    const timer = window.setTimeout(() => setVisibleCount((count) => count + 1), delay)
    return () => window.clearTimeout(timer)
  }, [incoming.length, phase, snapshot.carryOverMessages.length, visibleCount])

  useEffect(() => {
    if (phase !== 'reaction' || !selected) return
    if (reactionCount >= selected.reactions.length) {
      setPhase('ready')
      return
    }
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const timer = window.setTimeout(() => setReactionCount((count) => count + 1), reducedMotion ? 10 : 620)
    return () => window.clearTimeout(timer)
  }, [phase, reactionCount, selected])

  useEffect(() => {
    if (phase === 'ready') consequenceRef.current?.focus({ preventScroll: true })
  }, [phase, snapshot.crisis])

  const visibleMessages: Message[] = [
    ...incoming.slice(0, visibleCount),
    ...(selected?.reactions.slice(0, reactionCount).map((message, index) => ({
      ...message,
      time: message.time ?? event.time.replace(/\d{2}$/, (minutes) => String(Number(minutes) + index + 1).padStart(2, '0')),
    })) ?? []),
  ]

  const handleChoice = useCallback((choice: Choice) => {
    if (phase !== 'choosing' || !matchesCondition(choice.availableWhen, snapshot.stats, snapshot.flags, snapshot.relationships)) return
    setSelected(choice)
    setReactionCount(0)
    setPhase('reaction')
    onChoose(choice)
  }, [onChoose, phase, snapshot.flags, snapshot.relationships, snapshot.stats])

  const handleTimeout = useCallback(() => {
    if (!event.timedDecision) return
    const fallback = event.choices.find((choice) => choice.id === event.timedDecision?.fallbackChoiceId)
    if (fallback) handleChoice(fallback)
  }, [event, handleChoice])

  const isLastEvent = event.stage === TOTAL_STAGES
  const typingAuthor =
    phase === 'incoming' && visibleCount < incoming.length
      ? incoming[visibleCount].author
      : phase === 'reaction' && selected && reactionCount < selected.reactions.length
        ? selected.reactions[reactionCount].author
        : undefined

  return (
    <main className="game-shell">
      <ParticipantsRail relationships={snapshot.relationships} />
      <section className="game-main">
        <header className="game-header">
          <div className="game-header__mobile-brand"><Brand compact /></div>
          <div>
            <p className="game-header__channel"><span>#</span> срочная-планёрка</p>
            <p className="game-header__context">{event.context}</p>
          </div>
          <div className="game-header__progress">
            <span>Ситуация {event.stage} из {TOTAL_STAGES}</span>
            <div
              aria-label={`Пройдено ${event.stage} из ${TOTAL_STAGES}`}
              className="game-header__progress-track"
              role="progressbar"
              aria-valuemax={TOTAL_STAGES}
              aria-valuemin={1}
              aria-valuenow={event.stage}
            >
              <i style={{ width: `${(event.stage / TOTAL_STAGES) * 100}%` }} />
            </div>
            <span className="game-header__timeline" aria-hidden="true">
              {Array.from({ length: TOTAL_STAGES }, (_, index) => (
                <i className={index < event.stage ? 'is-passed' : ''} key={index} />
              ))}
            </span>
          </div>
          <time className="game-header__time">{event.time}</time>
        </header>
        <StatusPanel stats={snapshot.stats} effects={snapshot.lastEffects} variant="compact" />
        <ThreadTracker compact flags={snapshot.flags} stats={snapshot.stats} />
        <section className="chat-panel">
          <div className="event-marker" key={event.id}>
            <span>{event.time}</span>
            <strong>{event.title}</strong>
            <em>{event.thread}</em>
          </div>
          <MessageList
            messages={visibleMessages}
            typingAuthor={typingAuthor}
            updateToken={`${phase}-${visibleCount}-${reactionCount}`}
          >
            {phase === 'choosing' && !snapshot.crisis && snapshot.settings.timedCrises && event.timedDecision ? (
              <DecisionTimer eventId={event.id} onTimeout={handleTimeout} seconds={event.timedDecision.seconds} />
            ) : null}
            {phase === 'choosing' && !snapshot.crisis ? (
              <DecisionPanel
                choices={event.choices}
                flags={snapshot.flags}
                mode={snapshot.settings.mode}
                onChoose={handleChoice}
                relationships={snapshot.relationships}
                stats={snapshot.stats}
              />
            ) : null}
            {selected ? (
              <article className="player-decision" aria-label="Ваше принятое решение">
                <span>Вы</span>
                <div>
                  <strong>{selected.text}</strong>
                  <small>
                    {STAT_KEYS.map((key) => (
                      <i className={(selected.effects[key] ?? 0) > 0 ? 'is-positive' : (selected.effects[key] ?? 0) < 0 ? 'is-negative' : ''} key={key}>
                        {STAT_META[key].shortLabel} {formatDelta(selected.effects[key])}
                      </i>
                    ))}
                  </small>
                </div>
              </article>
            ) : null}
            {(phase === 'ready' || phase === 'choosing') && snapshot.crisis ? (
              <CrisisPanel crisisKey={snapshot.crisis.key} onEnd={onCrisisEnd} onRecover={onCrisisRecover} />
            ) : null}
            {phase === 'ready' && selected && !snapshot.crisis ? (
              <>
                <aside className="consequence-card">
                  <h2 ref={consequenceRef} tabIndex={-1}>
                    {selected.delayedConsequences?.length ? 'Решение принято · день это запомнит' : 'Решение принято'}
                  </h2>
                  <p>{selected.insight}</p>
                  {selected.delayedConsequences?.length ? <small>Источник будет отмечен, когда последствие вернётся.</small> : null}
                </aside>
                <div className="continue-row">
                  <span>
                    {isLastEvent ? 'Рабочий день завершён' : 'Последствия зафиксированы'}
                    {lastSavedAt ? <small>Сохранено локально · {lastSavedAt}</small> : null}
                  </span>
                  <button type="button" onClick={isLastEvent ? onFinish : onNext}>
                    {isLastEvent ? 'Посмотреть итог' : 'Следующая ситуация'}
                    <ArrowIcon />
                  </button>
                </div>
              </>
            ) : null}
          </MessageList>
        </section>
      </section>
      <aside className="status-rail">
        <p className="status-rail__time-label">Рабочий день</p>
        <time>{event.time}</time>
        <StatusPanel stats={snapshot.stats} effects={snapshot.lastEffects} />
        <ThreadTracker flags={snapshot.flags} stats={snapshot.stats} />
      </aside>
    </main>
  )
}
