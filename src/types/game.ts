export type StatKey = 'deadlines' | 'budget' | 'team' | 'client'

export type Stats = Record<StatKey, number>

export type CharacterId = 'alexey' | 'mikhail' | 'irina' | 'olga' | 'vera'

export type GameMode = 'training' | 'simulation'

export type ChallengeId = 'balance' | 'humane' | 'lean'

export type GameSettings = {
  mode: GameMode
  challengeId: ChallengeId | null
  timedCrises: boolean
}

export type Relationships = Record<CharacterId, number>

export type Character = {
  id: CharacterId
  name: string
  role: string
  avatarPosition: number
  status: 'online' | 'busy'
  accent: string
}

export type Message = {
  id: string
  author: CharacterId
  text: string
  time?: string
  tone?: 'normal' | 'urgent' | 'positive'
  consequenceSource?: {
    eventId: string
    eventTime: string
    eventTitle: string
    choiceId: string
    choiceText: string
  }
}

export type Effects = Partial<Stats>

export type StatCondition = {
  type: 'stat'
  key: StatKey
  operator: 'lt' | 'lte' | 'gt' | 'gte'
  value: number
}

export type RelationshipCondition = {
  type: 'relationship'
  character: CharacterId
  operator: 'lt' | 'lte' | 'gt' | 'gte'
  value: number
}

export type FlagCondition = {
  type: 'flag'
  flag: string
  present?: boolean
}

export type Condition =
  | StatCondition
  | RelationshipCondition
  | FlagCondition
  | { type: 'all'; conditions: Condition[] }
  | { type: 'any'; conditions: Condition[] }

export type ConditionalMessage = Message & {
  when: Condition
}

export type DelayedConsequence = {
  id: string
  afterEvents: number
  effects: Effects
  messages: Message[]
  flags?: string[]
}

export type PendingConsequence = DelayedConsequence & {
  remaining: number
  sourceChoiceId: string
  sourceChoiceText: string
  sourceEventId: string
  sourceEventTime: string
  sourceEventTitle: string
}

export type Choice = {
  id: string
  label: string
  text: string
  effects: Effects
  flags?: string[]
  reactions: Message[]
  delayedConsequences?: DelayedConsequence[]
  availableWhen?: Condition
  unavailableReason?: string
  insight: string
}

export type GameEvent = {
  id: string
  stage: number
  time: string
  title: string
  context: string
  thread: 'Ресурсы' | 'Команда' | 'Клиент' | 'Качество' | 'Управление'
  when?: Condition
  messages: Message[]
  conditionalMessages?: ConditionalMessage[]
  messageVariants?: Message[][]
  timedDecision?: {
    seconds: number
    fallbackChoiceId: string
  }
  choices: Choice[]
}

export type DecisionRecord = {
  eventId: string
  eventTitle: string
  eventTime: string
  choiceId: string
  choiceLabel: string
  choiceText: string
  effects: Effects
  delayedEffects: Effects
  relationshipEffects: Partial<Relationships>
  insight: string
}

export type CrisisState = {
  key: StatKey
  eventId: string
}

export type Ending = {
  id: 'balanced' | 'firefighter' | 'team-first' | 'client-first' | 'systems' | 'tomorrow'
  title: string
  kicker: string
  description: string
  strength: string
  risk: string
}
