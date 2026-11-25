import { describe, expect, it } from 'vitest'
import { countOutside } from '../../app/utils/trip/days'
import { mapsUrl, websiteHref } from '../../app/utils/trip/maps'
import { moveId } from '../../app/utils/trip/order'
import { timesOutOfOrder } from '../../app/utils/trip/times'

describe('timesOutOfOrder', () => {
  it('is true when timed stops are not in start-time order', () => {
    expect(timesOutOfOrder([{ start_time: '09:00:00' }, { start_time: null }, { start_time: '08:00:00' }])).toBe(true)
  })

  it('ignores untimed stops and counts equal times as in order', () => {
    expect(timesOutOfOrder([{ start_time: null }, { start_time: '08:00:00' }, { start_time: '08:00:00' }, { start_time: '10:00:00' }])).toBe(false)
  })

  it('is false for no stops', () => {
    expect(timesOutOfOrder([])).toBe(false)
  })
})

describe('mapsUrl', () => {
  it('searches Google Maps for the place\'s name and address', () => {
    expect(mapsUrl({ name: 'Osaka Castle', address: '1-1 Osakajo, Chuo Ward, Osaka' }))
      .toBe('https://www.google.com/maps/search/?api=1&query=Osaka%20Castle%2C%201-1%20Osakajo%2C%20Chuo%20Ward%2C%20Osaka')
  })
})

describe('websiteHref', () => {
  it('adds https:// to a bare domain and keeps a full URL', () => {
    expect(websiteHref('osakacastle.net')).toBe('https://osakacastle.net')
    expect(websiteHref('http://a.jp')).toBe('http://a.jp')
    expect(websiteHref('HTTPS://A.JP')).toBe('HTTPS://A.JP')
  })
})

describe('moveId', () => {
  it('moves an id to a new position without changing the original', () => {
    const ids = ['a', 'b', 'c']
    expect(moveId(ids, 0, 2)).toEqual(['b', 'c', 'a'])
    expect(moveId(ids, 2, 1)).toEqual(['a', 'c', 'b'])
    expect(ids).toEqual(['a', 'b', 'c'])
  })
})

describe('countOutside', () => {
  it('counts the dates outside the trip', () => {
    expect(countOutside(['2027-03-17', '2027-03-18', '2027-03-13'], '2027-03-12', '2027-03-16')).toBe(2)
  })

  it('counts every date when the trip has no dates', () => {
    expect(countOutside(['2027-03-13'], null, null)).toBe(1)
  })
})
