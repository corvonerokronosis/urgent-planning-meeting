import { getThreadStatuses } from '../game/engine'
import type { Stats } from '../types/game'

type ThreadTrackerProps = {
  flags: string[]
  stats: Stats
  compact?: boolean
}

export function ThreadTracker({ flags, stats, compact = false }: ThreadTrackerProps) {
  const threads = getThreadStatuses(stats, flags)
  const content = (
    <ul className="thread-tracker__list">
      {threads.map((thread) => (
        <li className={`thread-tracker__item is-${thread.state}`} key={thread.id}>
          <span aria-hidden="true" />
          <div>
            <strong>{thread.title}</strong>
            <small>{thread.detail}</small>
          </div>
        </li>
      ))}
    </ul>
  )

  if (compact) {
    return (
      <details className="thread-tracker thread-tracker--compact">
        <summary>Линии дня <span>{threads.filter((thread) => thread.state === 'critical').length || '—'} крит.</span></summary>
        {content}
      </details>
    )
  }

  return (
    <section className="thread-tracker" aria-label="Активные линии дня">
      <p>Линии дня</p>
      {content}
    </section>
  )
}
