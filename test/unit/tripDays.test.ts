import { describe, expect, it } from 'vitest'
import { buildDays, formatDayDate, normalizeSpotsByDate, spotsOutside, tripDateLine, visitDate } from '../../app/utils/trip/days'
import { formatTime } from '../../app/utils/trip/times'
import { makeSpot } from '../utils/tripFixtures'

describe('buildDays', () => {
  it('numbers every date of the trip from 1', () => {
    expect(buildDays('2027-03-12', '2027-03-14')).toEqual([
      { date: '2027-03-12', number: 1 },
      { date: '2027-03-13', number: 2 },
      { date: '2027-03-14', number: 3 },
    ])
  })

  it('gives a single-day trip one day', () => {
    expect(buildDays('2027-03-12', '2027-03-12')).toEqual([{ date: '2027-03-12', number: 1 }])
  })

  it('crosses a month boundary', () => {
    expect(buildDays('2027-02-27', '2027-03-02').map(day => day.date))
      .toEqual(['2027-02-27', '2027-02-28', '2027-03-01', '2027-03-02'])
  })

  it('has no days when either date is missing', () => {
    expect(buildDays(null, '2027-03-14')).toEqual([])
    expect(buildDays('2027-03-12', null)).toEqual([])
  })
})

describe('visitDate', () => {
  it('keeps only the date of the API datetime', () => {
    expect(visitDate({ visit_date: '2027-03-13T00:00:00.000000Z' })).toBe('2027-03-13')
  })
})

describe('normalizeSpotsByDate', () => {
  it('treats the empty array as no stops', () => {
    expect(normalizeSpotsByDate([])).toEqual({})
    expect(normalizeSpotsByDate(undefined)).toEqual({})
  })

  it('keeps stops grouped by date', () => {
    const spot = makeSpot('s1', '2027-03-13')
    expect(normalizeSpotsByDate({ '2027-03-13': [spot] })).toEqual({ '2027-03-13': [spot] })
  })
})

describe('spotsOutside', () => {
  it('lists stops on dates that are not days of the trip, in date order', () => {
    const days = buildDays('2027-03-12', '2027-03-14')
    const byDate = {
      '2027-03-16': [makeSpot('s3', '2027-03-16'), makeSpot('s4', '2027-03-16')],
      '2027-03-13': [makeSpot('s2', '2027-03-13')],
      '2027-03-11': [makeSpot('s1', '2027-03-11')],
    }

    expect(spotsOutside(days, byDate).map(spot => spot.id)).toEqual(['s1', 's3', 's4'])
  })

  it('treats every stop as outside when the trip has no days', () => {
    expect(spotsOutside([], { '2027-03-13': [makeSpot('s1', '2027-03-13')] }).map(spot => spot.id)).toEqual(['s1'])
  })
})

describe('formatDayDate', () => {
  it('writes the weekday, day and month', () => {
    expect(formatDayDate('2027-03-13')).toBe('Sat 13 Mar')
  })
})

describe('tripDateLine', () => {
  it('matches the Trips card text', () => {
    expect(tripDateLine('2027-03-12', '2027-03-18')).toBe('Mar 12, 2027 - Mar 18, 2027 • 7 days')
  })

  it('says No dates yet without both dates', () => {
    expect(tripDateLine(null, '2027-03-18')).toBe('No dates yet')
    expect(tripDateLine('2027-03-12', null)).toBe('No dates yet')
  })
})

describe('formatTime', () => {
  it('drops the seconds', () => {
    expect(formatTime('14:00:00')).toBe('14:00')
  })

  it('passes null through', () => {
    expect(formatTime(null)).toBeNull()
  })
})
