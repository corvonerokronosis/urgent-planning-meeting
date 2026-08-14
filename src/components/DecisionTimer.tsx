import { useEffect, useRef, useState } from 'react'

type DecisionTimerProps = {
  eventId: string
  seconds: number
  onTimeout: () => void
}

export function DecisionTimer({ eventId, seconds, onTimeout }: DecisionTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  const [paused, setPaused] = useState(false)
  const firedRef = useRef(false)

  useEffect(() => {
    setRemaining(seconds)
    setPaused(false)
    firedRef.current = false
  }, [eventId, seconds])

  useEffect(() => {
    if (paused || remaining <= 0) return
    const timer = window.setTimeout(() => setRemaining((current) => Math.max(0, current - 1)), 1000)
    return () => window.clearTimeout(timer)
  }, [paused, remaining])

  useEffect(() => {
    if (remaining !== 0 || firedRef.current) return
    firedRef.current = true
    onTimeout()
  }, [onTimeout, remaining])

  return (
    <aside className={`decision-timer ${paused ? 'is-paused' : ''} ${remaining <= 10 ? 'is-critical' : ''}`}>
      <div>
        <span>Кризисное окно</span>
        <strong aria-live={remaining <= 10 ? 'polite' : 'off'}>{remaining} сек.</strong>
      </div>
      <span className="decision-timer__track" aria-hidden="true">
        <i style={{ width: `${(remaining / seconds) * 100}%` }} />
      </span>
      <button onClick={() => setPaused((current) => !current)} type="button">
        {paused ? 'Продолжить таймер' : 'Пауза'}
      </button>
    </aside>
  )
}
