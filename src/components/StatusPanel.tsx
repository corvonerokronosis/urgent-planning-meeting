import type { Effects, StatKey, Stats } from '../types/game'
import { formatDelta, STAT_KEYS, STAT_META } from '../game/engine'
import { CalendarIcon, ClientIcon, TeamIcon, WalletIcon } from './Icons'

type StatusPanelProps = {
  stats: Stats
  effects?: Effects | null
  variant?: 'rail' | 'compact' | 'result'
}

const icons: Record<StatKey, typeof CalendarIcon> = {
  deadlines: CalendarIcon,
  budget: WalletIcon,
  team: TeamIcon,
  client: ClientIcon,
}

export function StatusPanel({ stats, effects, variant = 'rail' }: StatusPanelProps) {
  return (
    <section className={`status-panel status-panel--${variant}`} aria-label="Состояние проекта">
      {variant === 'rail' ? <p className="status-panel__heading">Состояние проекта</p> : null}
      <div className="status-panel__list">
        {STAT_KEYS.map((key) => {
          const Icon = icons[key]
          const delta = effects?.[key] ?? 0
          const dangerClass = stats[key] <= 25 ? 'is-critical' : stats[key] <= 45 ? 'is-warning' : ''
          const stateLabel = stats[key] <= 10 ? 'критический ноль близко' : stats[key] <= 25 ? 'критический уровень' : stats[key] <= 45 ? 'требует внимания' : null
          return (
            <article
              aria-label={`${STAT_META[key].label}: ${stats[key]} из 100${stateLabel ? `, ${stateLabel}` : ''}`}
              className={`stat stat--${key} ${delta !== 0 ? 'has-delta' : ''} ${dangerClass}`}
              key={key}
            >
              <div className="stat__topline">
                <Icon className="stat__icon" />
                <span className="stat__label">{STAT_META[key].label}</span>
                {delta !== 0 ? (
                  <span className={`stat__delta ${delta > 0 ? 'is-positive' : 'is-negative'}`} aria-live="polite">
                    {formatDelta(delta)}
                  </span>
                ) : null}
              </div>
              <div className="stat__reading">
                <strong>{stats[key]}</strong>
                <span>/100</span>
              </div>
              <div className="stat__track" aria-hidden="true">
                <span style={{ width: `${stats[key]}%` }} />
              </div>
              {stateLabel ? <small className="stat__state">! {stateLabel}</small> : null}
            </article>
          )
        })}
      </div>
      {variant === 'rail' ? <p className="status-panel__note">Ни один ресурс не должен опуститься до нуля.</p> : null}
    </section>
  )
}
