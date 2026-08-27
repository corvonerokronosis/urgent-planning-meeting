import { describe, expect, it, vi } from 'vitest'
import {
  clearSavedRuns,
  INCOMPATIBLE_STORAGE_KEYS,
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
})
