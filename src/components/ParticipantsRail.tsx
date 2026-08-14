import { characterList } from '../data/characters'
import type { Relationships } from '../types/game'
import { Avatar } from './Avatar'
import { Brand } from './Brand'

type ParticipantsRailProps = {
  relationships: Relationships
}

function relationshipLabel(value: number) {
  if (value >= 68) return 'опора'
  if (value >= 52) return 'рабочий контакт'
  if (value >= 36) return 'напряжение'
  return 'доверие потеряно'
}

export function ParticipantsRail({ relationships }: ParticipantsRailProps) {
  return (
    <aside className="participants-rail">
      <Brand />
      <div className="participants-rail__title">
        <span>Участники</span>
        <span>{characterList.length + 1}</span>
      </div>
      <div className="you-row">
        <span className="you-row__avatar">ВЫ</span>
        <span>
          <strong>Вы</strong>
          <small>Руководитель проекта</small>
        </span>
        <i className="presence presence--online" />
      </div>
      <ul className="participants-list">
        {characterList.map((character) => (
          <li key={character.id}>
            <Avatar character={character} size="small" />
            <span>
              <strong>{character.name}</strong>
              <small>{character.role}</small>
              <em className={`relationship relationship--${relationships[character.id] < 52 ? 'low' : 'normal'}`}>
                {relationshipLabel(relationships[character.id])}
              </em>
            </span>
            <i className={`presence presence--${character.status}`} />
          </li>
        ))}
      </ul>
      <p className="participants-rail__tip">
        <span aria-hidden="true">↳</span>
        Сегодня все пишут вам. Это и есть управление.
      </p>
    </aside>
  )
}
