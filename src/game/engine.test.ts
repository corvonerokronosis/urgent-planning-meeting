import { describe, expect, it } from 'vitest'
import { scenario, TOTAL_STAGES } from '../data/scenario'
import {
  advanceConsequences,
  applyEffects,
  applyRelationshipEffects,
  collectFlags,
  createPendingConsequences,
  evaluateChallenge,
  getCrisisKey,
  getEnding,
  getMessageVariant,
  getNextEvent,
  getPivotalDecisions,
  getRelationshipEffects,
  INITIAL_RELATIONSHIPS,
  INITIAL_STATS,
  matchesCondition,
  updateMinimumStats,
} from './engine'

describe('game content', () => {
  it('contains a six-stage express game with one branching stage', () => {
    expect(TOTAL_STAGES).toBe(6)
    expect(scenario).toHaveLength(7)
    expect(new Set(scenario.map((event) => event.stage)).size).toBe(TOTAL_STAGES)
    expect(scenario.every((event) => event.choices.length === 3)).toBe(true)
    expect(scenario.flatMap((event) => event.choices)).toHaveLength(21)
    expect(scenario.filter((event) => event.timedDecision)).toHaveLength(3)
    expect(scenario.filter((event) => event.messageVariants?.length)).toHaveLength(1)
    expect(scenario.flatMap((event) => event.choices).filter((choice) => choice.availableWhen).length).toBeGreaterThanOrEqual(2)
    for (const event of scenario) {
      for (const consequence of event.choices.flatMap((choice) => choice.delayedConsequences ?? [])) {
        expect(consequence.afterEvents).toBeLessThanOrEqual(TOTAL_STAGES - event.stage)
      }
    }
  })

  it('selects the expected story branches', () => {
    expect(getNextEvent(scenario, 4, { ...INITIAL_STATS, team: 42 }, [])?.id).toBe('team-overheat')
    expect(getNextEvent(scenario, 4, INITIAL_STATS, [])?.id).toBe('team-rally')
    expect(getNextEvent(scenario, 5, INITIAL_STATS, [])?.id).toBe('shipping-decision')
  })
})

describe('game engine', () => {
  it('applies every choice effect and clamps all three stats', () => {
    for (const choice of scenario.flatMap((event) => event.choices)) {
      const next = applyEffects(INITIAL_STATS, choice.effects)
      expect(Object.values(next).every((value) => value >= 0 && value <= 100)).toBe(true)
    }
    expect(
      applyEffects(
        { deadlines: 99, team: 50, client: 95 },
        { deadlines: 20, team: -70, client: 10 },
      ),
    ).toEqual({ deadlines: 100, team: 0, client: 100 })
  })

  it('evaluates nested flag and stat conditions', () => {
    const condition = {
      type: 'all' as const,
      conditions: [
        { type: 'flag' as const, flag: 'ready' },
        { type: 'stat' as const, key: 'team' as const, operator: 'gte' as const, value: 50 },
      ],
    }
    expect(matchesCondition(condition, INITIAL_STATS, ['ready'])).toBe(true)
    expect(matchesCondition(condition, { ...INITIAL_STATS, team: 30 }, ['ready'])).toBe(false)
    expect(matchesCondition(
      { type: 'relationship', character: 'vera', operator: 'gte', value: 58 },
      INITIAL_STATS,
      [],
      { ...INITIAL_RELATIONSHIPS, vera: 57 },
    )).toBe(false)
  })

  it('collects flags without duplicates', () => {
    const reserveChoice = scenario[0].choices[1]
    expect(collectFlags(['reserveSupplier'], reserveChoice)).toEqual(['reserveSupplier'])
  })

  it('applies delayed consequences only after their countdown', () => {
    const choice = scenario[0].choices[0]
    const pending = createPendingConsequences(choice, { eventId: 'supply-delay', eventTime: '09:02', eventTitle: 'Сорвана поставка' })
    expect(pending[0].remaining).toBe(2)
    expect(pending[0].sourceEventTime).toBe('09:02')

    const firstAdvance = advanceConsequences(pending)
    expect(firstAdvance.pending[0].remaining).toBe(1)
    expect(firstAdvance.effects).toEqual({})

    const secondAdvance = advanceConsequences(firstAdvance.pending)
    expect(secondAdvance.pending).toHaveLength(0)
    expect(secondAdvance.effects).toEqual({ deadlines: -7, client: -5 })
    expect(secondAdvance.messages).toHaveLength(1)
    expect(secondAdvance.messages[0].consequenceSource?.choiceId).toBe(choice.id)
  })

  it('tracks relationship changes, minimum resources and crises', () => {
    const choice = scenario[0].choices[0]
    const relationshipEffects = getRelationshipEffects(choice)
    expect(relationshipEffects.alexey).toBeLessThan(0)
    expect(applyRelationshipEffects(INITIAL_RELATIONSHIPS, relationshipEffects).alexey).toBeLessThan(60)
    const paidOvertime = scenario.flatMap((event) => event.choices).find((item) => item.id === 'spot-bonus')
    expect(paidOvertime).toBeDefined()
    expect(getRelationshipEffects(paidOvertime!).vera).toBe(-4)
    expect(updateMinimumStats(INITIAL_STATS, { ...INITIAL_STATS, client: 31 }).client).toBe(31)
    expect(getCrisisKey({ ...INITIAL_STATS, team: 0 })).toBe('team')
    expect(getCrisisKey(INITIAL_STATS)).toBeNull()
  })

  it('evaluates all three replay challenges', () => {
    expect(evaluateChallenge('balance', INITIAL_STATS, { ...INITIAL_STATS, client: 46 }, [])?.passed).toBe(true)
    expect(evaluateChallenge('balance', INITIAL_STATS, { ...INITIAL_STATS, client: 44 }, [])?.passed).toBe(false)
    expect(evaluateChallenge('humane', INITIAL_STATS, INITIAL_STATS, ['teamReset'])?.passed).toBe(true)
    expect(evaluateChallenge('humane', INITIAL_STATS, INITIAL_STATS, ['paidOvertime'])?.passed).toBe(false)
    expect(evaluateChallenge('lean', INITIAL_STATS, INITIAL_STATS, [])?.passed).toBe(true)
    expect(evaluateChallenge('lean', INITIAL_STATS, INITIAL_STATS, ['reserveSupplier'])?.passed).toBe(false)
    expect(evaluateChallenge('lean', INITIAL_STATS, INITIAL_STATS, ['scopeDebt'])?.passed).toBe(false)
    expect(evaluateChallenge('lean', INITIAL_STATS, INITIAL_STATS, ['paidOvertime'])?.passed).toBe(false)
  })

  it('selects deterministic micro-variants and pivotal decisions', () => {
    const variantEvent = scenario.find((event) => event.messageVariants)
    expect(variantEvent).toBeDefined()
    expect(getMessageVariant(variantEvent!, 42)).toEqual(getMessageVariant(variantEvent!, 42))

    const decisions = [
      { eventId: 'a', eventTitle: 'A', eventTime: '09:00', choiceId: 'a', choiceLabel: 'A', choiceText: 'A', effects: { deadlines: 12, team: -15 }, delayedEffects: {}, relationshipEffects: {}, insight: 'A' },
      { eventId: 'b', eventTitle: 'B', eventTime: '10:00', choiceId: 'b', choiceLabel: 'B', choiceText: 'B', effects: { team: 14, deadlines: -3 }, delayedEffects: {}, relationshipEffects: {}, insight: 'B' },
      { eventId: 'c', eventTitle: 'C', eventTime: '11:00', choiceId: 'c', choiceLabel: 'C', choiceText: 'C', effects: { client: -16 }, delayedEffects: {}, relationshipEffects: {}, insight: 'C' },
    ]
    expect(getPivotalDecisions(decisions)).toHaveLength(3)
  })

  it('selects six predictable ending profiles', () => {
    expect(getEnding({ deadlines: 12, team: 25, client: 28 }).id).toBe('tomorrow')
    expect(getEnding({ deadlines: 84, team: 37, client: 62 }).id).toBe('firefighter')
    expect(getEnding({ deadlines: 58, team: 54, client: 84 }).id).toBe('client-first')
    expect(getEnding({ deadlines: 55, team: 84, client: 63 }).id).toBe('team-first')
    expect(
      getEnding(
        { deadlines: 62, team: 66, client: 64 },
        ['juniorReview', 'scopeNegotiated', 'qualityContained'],
      ).id,
    ).toBe('systems')
    expect(getEnding({ deadlines: 58, team: 62, client: 60 }).id).toBe('balanced')
  })
})
