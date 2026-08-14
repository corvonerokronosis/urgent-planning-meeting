import { useState } from 'react'
import { CHALLENGES } from '../game/engine'
import type { GameSettings } from '../types/game'
import { Brand } from './Brand'
import { ArrowIcon, CalendarIcon, ClientIcon, TeamIcon, WalletIcon } from './Icons'

type StartScreenProps = {
  defaultSettings: GameSettings
  hasSavedRun: boolean
  savedSummary?: {
    stage: number
    time: string
    mode: GameSettings['mode']
    lastSavedAt: string | null
  }
  onContinue: () => void
  onStart: (settings: GameSettings) => void
}

const resources = [
  { icon: CalendarIcon, title: 'Сроки', text: 'Удерживайте график, когда обстоятельства его не читали.', value: 64, className: 'deadlines' },
  { icon: WalletIcon, title: 'Бюджет', text: 'Срочные решения особенно убедительны, пока есть резерв.', value: 66, className: 'budget' },
  { icon: TeamIcon, title: 'Команда', text: 'Люди закрывают задачи лучше, когда ещё доверяют процессу.', value: 70, className: 'team' },
  { icon: ClientIcon, title: 'Клиент', text: 'Доверие растёт от ясности и быстро заканчивается от сюрпризов.', value: 72, className: 'client' },
]

export function StartScreen({ defaultSettings, hasSavedRun, savedSummary, onContinue, onStart }: StartScreenProps) {
  const [settings, setSettings] = useState<GameSettings>(defaultSettings)

  return (
    <main className="start-screen">
      <header className="start-screen__header">
        <Brand />
        <span className="start-screen__meta">Один рабочий день · 12 решений</span>
      </header>
      <div className="start-screen__grid">
        <section className="start-screen__intro">
          <p className="start-screen__time">08:55 · Пять минут до первого сообщения</p>
          <h1>Срочная<br />планёрка</h1>
          <p className="start-screen__lead">
            Сегодня нужно довести критический проект до отгрузки.<br />
            Проблема в том, что каждое разумное решение имеет цену.
          </p>

          {hasSavedRun && savedSummary ? (
            <aside className="resume-card" aria-label="Сохранённое прохождение">
              <span>Незавершённая смена</span>
              <strong>Ситуация {savedSummary.stage} из 12 · {savedSummary.time}</strong>
              <small>
                {savedSummary.mode === 'training' ? 'Обучение' : 'Симуляция'}
                {savedSummary.lastSavedAt ? ` · сохранено в ${savedSummary.lastSavedAt}` : ' · сохранено локально'}
              </small>
            </aside>
          ) : null}

          <fieldset className="run-setup">
            <legend>Параметры смены</legend>
            <div className="run-setup__modes" aria-label="Режим прозрачности">
              <button
                aria-pressed={settings.mode === 'training'}
                className={settings.mode === 'training' ? 'is-active' : ''}
                onClick={() => setSettings((current) => ({ ...current, mode: 'training' }))}
                type="button"
              >
                <strong>Обучение</strong>
                <span>Точные изменения видны до выбора</span>
              </button>
              <button
                aria-pressed={settings.mode === 'simulation'}
                className={settings.mode === 'simulation' ? 'is-active' : ''}
                onClick={() => setSettings((current) => ({ ...current, mode: 'simulation' }))}
                type="button"
              >
                <strong>Симуляция</strong>
                <span>До выбора видны только сила и направление</span>
              </button>
            </div>
            <label className="run-setup__select">
              <span>Испытание</span>
              <select
                onChange={(event) => setSettings((current) => ({
                  ...current,
                  challengeId: event.target.value === '' ? null : event.target.value as GameSettings['challengeId'],
                }))}
                value={settings.challengeId ?? ''}
              >
                <option value="">Без дополнительной цели</option>
                {Object.entries(CHALLENGES).map(([id, challenge]) => (
                  <option key={id} value={id}>{challenge.title} — {challenge.description}</option>
                ))}
              </select>
            </label>
            <label className="run-setup__timer">
              <input
                checked={settings.timedCrises}
                onChange={(event) => setSettings((current) => ({ ...current, timedCrises: event.target.checked }))}
                type="checkbox"
              />
              <span>
                <strong>Таймер в трёх кризисах</strong>
                <small>Можно поставить на паузу; по умолчанию выключен.</small>
              </span>
            </label>
          </fieldset>

          <div className="start-screen__actions">
            {hasSavedRun ? (
              <button className="primary-button" onClick={onContinue} type="button">
                Продолжить рабочий день
                <ArrowIcon />
              </button>
            ) : null}
            <button
              className={hasSavedRun ? 'secondary-button' : 'primary-button'}
              onClick={() => onStart(settings)}
              type="button"
            >
              {hasSavedRun ? 'Начать заново с настройками' : 'Начать рабочий день'}
              <ArrowIcon />
            </button>
          </div>
          <p className="start-screen__duration">Прохождение займёт 10–20 минут. Правильных ответов нет.</p>
        </section>
        <section className="resource-brief" aria-label="Игровые показатели">
          <header>
            <span>Ваша зона ответственности</span>
            <strong>Четыре ресурса. Один день.</strong>
          </header>
          <div className="resource-brief__grid">
            {resources.map(({ icon: Icon, title, text, value, className }) => (
              <article className={`resource-brief__item resource-brief__item--${className}`} key={title}>
                <Icon />
                <div>
                  <span className="resource-brief__label"><strong>{title}</strong><b>{value}</b></span>
                  <p>{text}</p>
                  <span className="resource-brief__track"><i style={{ width: `${value}%` }} /></span>
                </div>
              </article>
            ))}
          </div>
          <footer>
            <span aria-hidden="true">!</span>
            Часть решений вернётся последствиями через несколько ситуаций. День запоминает выборы.
          </footer>
        </section>
      </div>
    </main>
  )
}
