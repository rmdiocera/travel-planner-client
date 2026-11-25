import { describe, expect, it } from 'vitest'
import { isPastTrip, tripBadge } from '../../app/utils/trip/badge'

const today = '2026-11-25'

describe('tripBadge', () => {
  it('counts the days before the trip', () => {
    expect(tripBadge('2026-12-07', '2026-12-13', today)).toBe('In 12 days')
  })

  it('says Starts tomorrow the day before', () => {
    expect(tripBadge('2026-11-26', '2026-11-30', today)).toBe('Starts tomorrow')
  })

  it('numbers the day during the trip', () => {
    expect(tripBadge('2026-11-25', '2026-11-29', today)).toBe('Day 1 of 5')
    expect(tripBadge('2026-11-23', '2026-11-29', today)).toBe('Day 3 of 7')
    expect(tripBadge('2026-11-19', '2026-11-25', today)).toBe('Day 7 of 7')
  })

  it('says Ended after the trip', () => {
    expect(tripBadge('2026-11-06', '2026-11-08', today)).toBe('Ended')
  })

  it('has no badge without both dates', () => {
    expect(tripBadge(null, '2026-11-29', today)).toBeNull()
    expect(tripBadge('2026-11-23', null, today)).toBeNull()
  })
})

describe('isPastTrip', () => {
  it('is true only once the end date has gone by', () => {
    expect(isPastTrip('2026-11-24', today)).toBe(true)
    expect(isPastTrip('2026-11-25', today)).toBe(false)
    expect(isPastTrip(null, today)).toBe(false)
  })
})
