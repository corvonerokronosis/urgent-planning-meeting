import { TOTAL_STAGES } from '../data/scenario'
import { Brand } from './Brand'
import { ArrowIcon, CalendarIcon, ClientIcon, TeamIcon, WalletIcon } from './Icons'

type StartScreenProps = {
  hasSavedRun: boolean
  savedSummary?: {
    stage: number
    time: string
    lastSavedAt: string | null
  }
  onContinue: () => void
  onStart: () => void
}

const resources = [
  { icon: CalendarIcon, title: 'Сроки', text: 'Удерживайте график, когда обстоятельства его не читали.', value: 64, className: 'deadlines' },
  { icon: WalletIcon, title: 'Бюджет', text: 'Срочные решения особенно убедительны, пока есть резерв.', value: 66, className: 'budget' },
  { icon: TeamIcon, title: 'Команда', text: 'Люди закрывают задачи лучше, когда ещё доверяют процессу.', value: 70, className: 'team' },
  { icon: ClientIcon, title: 'Клиент', text: 'Доверие растёт от ясности и быстро заканчивается от сюрпризов.', value: 72, className: 'client' },
]

export function StartScreen({ hasSavedRun, savedSummary, onContinue, onStart }: StartScreenProps) {
  return (
    <main className="start-screen">
      <header className="start-screen__header">
        <Brand />
        <span className="start-screen__meta">Экспресс-игра · {TOTAL_STAGES} решений</span>
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
              <strong>Ситуация {savedSummary.stage} из {TOTAL_STAGES} · {savedSummary.time}</strong>
              <small>
                {savedSummary.lastSavedAt ? `Сохранено в ${savedSummary.lastSavedAt}` : 'Сохранено локально'}
              </small>
            </aside>
          ) : null}

          <div className="start-screen__actions">
            <button
              className="primary-button"
              onClick={hasSavedRun ? onContinue : onStart}
              type="button"
            >
              Играть
              <ArrowIcon />
            </button>
          </div>
          <p className="start-screen__duration">Прохождение займёт 5–7 минут. Правильных ответов нет.</p>
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
