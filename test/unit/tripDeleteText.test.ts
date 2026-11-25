import { describe, expect, it } from 'vitest'
import { tripDeleteTail } from '../../app/utils/trip/deleteText'

describe('tripDeleteTail', () => {
  it('keeps the Trips page wording when there is nothing to count', () => {
    expect(tripDeleteTail(0, 0)).toBe(' and all its associated data')
  })

  it('counts places on days', () => {
    expect(tripDeleteTail(14, 0)).toBe(', its 14 places on days')
    expect(tripDeleteTail(1, 0)).toBe(', its 1 place on a day')
  })

  it('counts lists', () => {
    expect(tripDeleteTail(0, 3)).toBe(', its 3 lists')
    expect(tripDeleteTail(0, 1)).toBe(', its 1 list')
  })

  it('counts both', () => {
    expect(tripDeleteTail(14, 3)).toBe(', its 14 places on days and its 3 lists')
  })
})
