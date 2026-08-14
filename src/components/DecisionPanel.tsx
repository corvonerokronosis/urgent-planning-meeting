import { useEffect, useRef } from 'react'
import type { Choice, GameMode, Relationships, Stats } from '../types/game'
import { describeEffect, formatDelta, matchesCondition, STAT_KEYS, STAT_META } from '../game/engine'
import { ArrowIcon, CheckIcon } from './Icons'

type DecisionPanelProps = {
  choices: Choice[]
  flags: string[]
  relationships: Relationships
  stats: Stats
  mode: GameMode
  selectedId?: string
  disabled?: boolean
  onChoose: (choice: Choice) => void
}

export function DecisionPanel({ choices, flags, relationships, stats, mode, selectedId, disabled = false, onChoose }: DecisionPanelProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!disabled && !selectedId) headingRef.current?.focus({ preventScroll: true })
  }, [disabled, selectedId])

  return (
    <section className="decision-panel" aria-labelledby="decision-title">
      <div className="decision-panel__heading">
        <div>
          <span>Ваше решение</span>
          <h2 id="decision-title" ref={headingRef} tabIndex={-1}>Что решаем?</h2>
        </div>
        <p>Выберите стратегию. Бесплатных решений сегодня нет.</p>
      </div>
      <div className="decision-list">
        {choices.map((choice) => {
          const isSelected = choice.id === selectedId
          const isAvailable = matchesCondition(choice.availableWhen, stats, flags, relationships)
          const showExact = mode === 'training' || isSelected
          return (
            <button
              aria-describedby={!isAvailable ? `${choice.id}-unavailable` : undefined}
              aria-disabled={!isAvailable}
              className={`decision ${isSelected ? 'is-selected' : ''} ${!isAvailable ? 'is-unavailable' : ''}`}
              disabled={disabled}
              key={choice.id}
              onClick={() => isAvailable ? onChoose(choice) : undefined}
              type="button"
            >
              <span className="decision__letter">{isSelected ? <CheckIcon /> : choice.label}</span>
              <span className="decision__copy">
                <strong>{choice.text}</strong>
                {!isAvailable ? (
                  <span className="decision__unavailable" id={`${choice.id}-unavailable`}>
                    Закрыто: {choice.unavailableReason}
                  </span>
                ) : (
                  <span className="decision__effects" aria-label="Изменение показателей">
                    {STAT_KEYS.map((key) => {
                      const value = choice.effects[key] ?? 0
                      const qualitative = describeEffect(value)
                      return (
                        <span className={value > 0 ? 'is-positive' : value < 0 ? 'is-negative' : ''} key={key}>
                          {STAT_META[key].shortLabel} {showExact ? formatDelta(value) : qualitative.short}
                        </span>
                      )
                    })}
                    {choice.delayedConsequences?.length ? (
                      <em>{mode === 'training' || isSelected ? '+ эффект позже' : 'неясный риск позже'}</em>
                    ) : null}
                  </span>
                )}
              </span>
              <ArrowIcon className="decision__arrow" />
            </button>
          )
        })}
      </div>
    </section>
  )
}
