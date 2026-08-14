import { useEffect, useRef } from 'react'
import { CRISIS_RECOVERY, formatDelta, STAT_KEYS, STAT_META } from '../game/engine'
import type { StatKey } from '../types/game'

type CrisisPanelProps = {
  crisisKey: StatKey
  onEnd: () => void
  onRecover: () => void
}

export function CrisisPanel({ crisisKey, onEnd, onRecover }: CrisisPanelProps) {
  const crisis = CRISIS_RECOVERY[crisisKey]
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    headingRef.current?.focus()
  }, [])

  return (
    <section aria-describedby="crisis-description" aria-labelledby="crisis-title" className="crisis-panel" role="alertdialog">
      <span className="crisis-panel__kicker">Ресурс достиг нуля</span>
      <h2 id="crisis-title" ref={headingRef} tabIndex={-1}>{crisis.title}</h2>
      <p id="crisis-description">
        Обычный маршрут остановлен. Можно заплатить другими ресурсами за аварийное восстановление или завершить день сейчас.
      </p>
      <div className="crisis-panel__recovery">
        <strong>{crisis.action}</strong>
        <span>
          {STAT_KEYS.map((key) => crisis.effects[key] ? (
            <i className={(crisis.effects[key] ?? 0) > 0 ? 'is-positive' : 'is-negative'} key={key}>
              {STAT_META[key].shortLabel} {formatDelta(crisis.effects[key])}
            </i>
          ) : null)}
        </span>
      </div>
      <div className="crisis-panel__actions">
        <button className="primary-button" onClick={onRecover} type="button">Принять аварийный план</button>
        <button className="secondary-button" onClick={onEnd} type="button">Завершить день</button>
      </div>
    </section>
  )
}
