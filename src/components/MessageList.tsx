import { useEffect, useRef } from 'react'
import { characters } from '../data/characters'
import type { Message } from '../types/game'
import { Avatar } from './Avatar'

type MessageListProps = {
  messages: Message[]
  typingAuthor?: Message['author']
  updateToken?: string
  children?: React.ReactNode
}

export function MessageList({ messages, typingAuthor, updateToken, children }: MessageListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const latestMessage = messages.at(-1)

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const list = listRef.current
    list?.scrollTo({ top: list.scrollHeight, behavior: reducedMotion ? 'auto' : 'smooth' })
  }, [messages.length, typingAuthor, updateToken])

  return (
    <div className="message-list" ref={listRef}>
      <div className="sr-only" aria-atomic="true" aria-live="polite">
        {latestMessage ? `${characters[latestMessage.author].name}: ${latestMessage.text}` : ''}
      </div>
      {messages.map((message) => {
        const character = characters[message.author]
        return (
          <article className={`message message--${message.tone ?? 'normal'}`} key={message.id}>
            <Avatar character={character} />
            <div className="message__body">
              <header>
                <strong>{character.name}</strong>
                <span>{character.role}</span>
                <time>{message.time}</time>
              </header>
              {message.consequenceSource ? (
                <span className="message__source">
                  Последствие решения {message.consequenceSource.eventTime} · {message.consequenceSource.eventTitle}
                </span>
              ) : null}
              <p>{message.text}</p>
            </div>
          </article>
        )
      })}
      {typingAuthor ? (
        <div className="typing-row" aria-label={`${characters[typingAuthor].name} печатает`}>
          <Avatar character={characters[typingAuthor]} size="small" />
          <span className="typing-row__name">{characters[typingAuthor].name}</span>
          <span className="typing-dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>
      ) : null}
      {children}
    </div>
  )
}
