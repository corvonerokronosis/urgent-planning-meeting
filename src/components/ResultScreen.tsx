import { useMemo, useState } from 'react'
import { scenario } from '../data/scenario'
import { characters } from '../data/characters'
import {
  evaluateChallenge,
  formatDelta,
  getEnding,
  getEventById,
  getPivotalDecisions,
  getResourceSummary,
  STAT_KEYS,
  STAT_META,
} from '../game/engine'
import type { DecisionRecord, GameSettings, Relationships, Stats } from '../types/game'
import type { FinishReason } from '../game/useGameController'
import { Brand } from './Brand'
import { RotateIcon } from './Icons'
import { StatusPanel } from './StatusPanel'

type ReviewFilter = 'all' | 'key' | 'delayed' | 'resources' | 'team' | 'client' | 'quality' | 'management'

type ResultScreenProps = {
  stats: Stats
  minimumStats: Stats
  relationships: Relationships
  settings: GameSettings
  flags: string[]
  decisions: DecisionRecord[]
  endTime: string
  finishReason: FinishReason
  onRestart: () => void
}

const filterLabels: Record<ReviewFilter, string> = {
  all: 'Все',
  key: 'Ключевые',
  delayed: 'Отложенные',
  resources: 'Ресурсы',
  team: 'Команда',
  client: 'Клиент',
  quality: 'Качество',
  management: 'Управление',
}

const threadFilters: Record<string, ReviewFilter> = {
  'Ресурсы': 'resources',
  'Команда': 'team',
  'Клиент': 'client',
  'Качество': 'quality',
  'Управление': 'management',
}

function hasEffects(effects: DecisionRecord['effects']) {
  return STAT_KEYS.some((key) => (effects[key] ?? 0) !== 0)
}

export function ResultScreen({
  stats,
  minimumStats,
  relationships,
  settings,
  flags,
  decisions,
  endTime,
  finishReason,
  onRestart,
}: ResultScreenProps) {
  const ending = getEnding(stats, flags)
  const { best, weakest } = getResourceSummary(stats)
  const pivotal = getPivotalDecisions(decisions)
  const pivotalIds = useMemo(() => new Set(pivotal.map((item) => item.decision.eventId)), [pivotal])
  const challenge = evaluateChallenge(settings.challengeId, stats, minimumStats, flags)
  const [filter, setFilter] = useState<ReviewFilter>('all')

  const filteredDecisions = decisions.filter((decision) => {
    if (filter === 'all') return true
    if (filter === 'key') return pivotalIds.has(decision.eventId)
    if (filter === 'delayed') return hasEffects(decision.delayedEffects)
    return threadFilters[getEventById(scenario, decision.eventId).thread] === filter
  })

  return (
    <main className={`result-screen result-screen--${ending.id}`}>
      <header className="result-screen__header">
        <Brand />
        <span>{endTime} · Итоги рабочего дня</span>
      </header>
      <div className="result-screen__layout">
        <section className="result-copy">
          <p>{finishReason === 'crisis' ? 'Смена завершилась после критической остановки' : ending.kicker}</p>
          <h1>{ending.title}</h1>
          <blockquote>{ending.description}</blockquote>
          <div className="result-summary">
            <span><strong>{decisions.length}</strong> решений принято</span>
            <span><strong>{STAT_META[best].label}</strong> сохранили лучше всего</span>
            <span><strong>{STAT_META[weakest].label}</strong> просели сильнее всего</span>
          </div>
          {challenge ? (
            <aside className={`challenge-result ${challenge.passed ? 'is-passed' : 'is-failed'}`}>
              <span>{challenge.passed ? 'Испытание выполнено' : 'Испытание не выполнено'}</span>
              <strong>{challenge.title}</strong>
              <p>{challenge.detail}</p>
            </aside>
          ) : null}
          <div className="result-actions">
            <button className="primary-button" type="button" onClick={onRestart}>
              Пройти ещё раз
              <RotateIcon />
            </button>
            <a className="result-review-link" href="#pivotal-review">Почему такой финал ↓</a>
          </div>
        </section>
        <section className="result-dashboard">
          <header>
            <span>Финальное состояние</span>
            <strong>Система на {endTime}</strong>
          </header>
          <StatusPanel stats={stats} variant="result" />
          <div className="result-dashboard__lessons">
            <p><span>Сильная сторона</span>{ending.strength}</p>
            <p><span>Зона риска</span>{ending.risk}</p>
          </div>
          <p className="result-dashboard__note">
            Это не оценка управленца. Это портрет одного очень конкретного дня.
          </p>
        </section>
      </div>

      <section className="pivotal-review" id="pivotal-review">
        <header>
          <p>Три точки маршрута</p>
          <h2>Какие решения собрали этот финал</h2>
          <span>Система выделяет влияние, восстановление и цену стратегии — без объявления «правильного» ответа.</span>
        </header>
        <div className="pivotal-review__grid">
          {pivotal.map(({ label, decision }) => {
            const event = getEventById(scenario, decision.eventId)
            const alternative = event.choices.find((choice) => choice.id !== decision.choiceId)
            return (
              <article key={label}>
                <span>{label}</span>
                <time>{decision.eventTime}</time>
                <h3>{decision.eventTitle}</h3>
                <strong>{decision.choiceLabel} · {decision.choiceText}</strong>
                <p>{decision.insight}</p>
                {alternative ? <small>Контраст маршрута: «{alternative.text}»</small> : null}
              </article>
            )
          })}
        </div>
      </section>

      <section className="day-review" id="day-review">
        <header>
          <p>Разбор прохождения</p>
          <h2>Вся история рабочего дня</h2>
          <span>Немедленные и отложенные эффекты разделены; ключевые решения можно отфильтровать.</span>
        </header>
        <div className="day-review__filters" aria-label="Фильтр разбора">
          {(Object.keys(filterLabels) as ReviewFilter[]).map((id) => (
            <button aria-pressed={filter === id} className={filter === id ? 'is-active' : ''} key={id} onClick={() => setFilter(id)} type="button">
              {filterLabels[id]}
            </button>
          ))}
        </div>
        <ol className="day-review__list">
          {filteredDecisions.map((decision, index) => (
            <li className={pivotalIds.has(decision.eventId) ? 'is-pivotal' : ''} key={`${decision.eventId}-${index}`}>
              <time>{decision.eventTime}</time>
              <div className="day-review__copy">
                <span>{decision.eventTitle}{pivotalIds.has(decision.eventId) ? ' · ключевое' : ''}</span>
                <strong>{decision.choiceLabel} · {decision.choiceText}</strong>
                <p>{decision.insight}</p>
              </div>
              <div className="day-review__effects" aria-label="Немедленные изменения показателей">
                {STAT_KEYS.map((key) => {
                  const value = decision.effects[key] ?? 0
                  return (
                    <span className={value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : ''} key={key}>
                      {STAT_META[key].shortLabel} {formatDelta(value)}
                    </span>
                  )
                })}
              </div>
              {hasEffects(decision.delayedEffects) ? (
                <div className="day-review__delayed">
                  <span>Вернулось позже</span>
                  {STAT_KEYS.map((key) => decision.delayedEffects[key] ? (
                    <i className={(decision.delayedEffects[key] ?? 0) > 0 ? 'is-positive' : 'is-negative'} key={key}>
                      {STAT_META[key].shortLabel} {formatDelta(decision.delayedEffects[key])}
                    </i>
                  ) : null)}
                </div>
              ) : null}
            </li>
          ))}
        </ol>
        {filteredDecisions.length === 0 ? <p className="day-review__empty">В этом фильтре решений нет.</p> : null}
        <aside className="relationship-summary">
          <span>Рабочее доверие к концу дня</span>
          <div>
            {Object.entries(relationships).map(([character, value]) => (
              <i key={character}><strong>{characters[character as keyof typeof characters].name}</strong> {value}/100</i>
            ))}
          </div>
        </aside>
        <button className="primary-button day-review__restart" type="button" onClick={onRestart}>
          Попробовать другую стратегию
          <RotateIcon />
        </button>
      </section>
    </main>
  )
}
