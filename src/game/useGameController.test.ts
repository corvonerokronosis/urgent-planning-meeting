import { describe, expect, it, vi } from 'vitest'
import {
  clearSavedRuns,
  INCOMPATIBLE_STORAGE_KEYS,
  isStats,
  STORAGE_KEY,
} from './useGameController'

describe('game persistence', () => {
  it('clears saved runs from the express and incompatible scenario versions', () => {
    const removeItem = vi.fn()

    clearSavedRuns({ removeItem })

    expect(removeItem.mock.calls.map(([key]) => key)).toEqual([
      STORAGE_KEY,
      ...INCOMPATIBLE_STORAGE_KEYS,
    ])
  })

  it('accepts only complete three-stat snapshots inside the game range', () => {
    expect(isStats({ deadlines: 64, team: 70, client: 72 })).toBe(true)
    expect(isStats({ deadlines: 64, team: 70 })).toBe(false)
    expect(isStats({ deadlines: 64, team: 101, client: 72 })).toBe(false)
    expect(isStats({ deadlines: Number.NaN, team: 70, client: 72 })).toBe(false)
  })
})
