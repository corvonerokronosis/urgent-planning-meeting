import type { Character, CharacterId } from '../types/game'

export const characters: Record<CharacterId, Character> = {
  alexey: {
    id: 'alexey',
    name: 'Алексей',
    role: 'Производство',
    avatarPosition: 0,
    status: 'online',
    accent: '#f06b52',
  },
  mikhail: {
    id: 'mikhail',
    name: 'Михаил',
    role: 'Закупки',
    avatarPosition: 1,
    status: 'busy',
    accent: '#e8a345',
  },
  irina: {
    id: 'irina',
    name: 'Ирина',
    role: 'Руководитель группы',
    avatarPosition: 2,
    status: 'online',
    accent: '#56b894',
  },
  olga: {
    id: 'olga',
    name: 'Ольга',
    role: 'Аккаунт',
    avatarPosition: 3,
    status: 'online',
    accent: '#699bd1',
  },
  vera: {
    id: 'vera',
    name: 'Вера',
    role: 'Финансы',
    avatarPosition: 4,
    status: 'busy',
    accent: '#bf78a6',
  },
}

export const characterList = Object.values(characters)
