import avatarStrip from '../assets/avatar-strip.webp'
import type { Character } from '../types/game'

type AvatarProps = {
  character: Character
  size?: 'small' | 'medium' | 'large'
}

export function Avatar({ character, size = 'medium' }: AvatarProps) {
  return (
    <span
      className={`avatar avatar--${size}`}
      aria-label={`Аватар: ${character.name}`}
      role="img"
      style={{
        backgroundImage: `url(${avatarStrip})`,
        backgroundPosition: `${character.avatarPosition * 25}% center`,
      }}
    />
  )
}
