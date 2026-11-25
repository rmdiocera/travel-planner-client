import { DateFormatter, getLocalTimeZone, parseDate } from '@internationalized/date'
import type { Spot, SpotsGroupedResponse } from '../../types/spot'
import { dateDiffInDays, formatStartEndDate } from '../date'

export type TripDay = {
  date: string
  number: number
}

const dayFormatter = new DateFormatter('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })

// Every date from start to end, numbered from 1. A trip without both dates has no days.
export function buildDays(start: string | null, end: string | null): TripDay[] {
  if (!start || !end) {
    return []
  }

  const days: TripDay[] = []
  const last = parseDate(end)
  for (let date = parseDate(start); date.compare(last) <= 0; date = date.add({ days: 1 })) {
    days.push({ date: date.toString(), number: days.length + 1 })
  }
  return days
}

export function visitDate(spot: Pick<Spot, 'visit_date'>): string {
  return spot.visit_date.slice(0, 10)
}

// With no stops at all the API sends [] rather than {} (handoff quirk 3).
export function normalizeSpotsByDate(data: SpotsGroupedResponse['data'] | undefined): Record<string, Spot[]> {
  return !data || Array.isArray(data) ? {} : data
}

// Stops on dates that aren't days of the trip, in date order.
export function spotsOutside(days: TripDay[], byDate: Record<string, Spot[]>): Spot[] {
  const tripDates = new Set(days.map(day => day.date))
  return Object.keys(byDate)
    .filter(date => !tripDates.has(date))
    .sort()
    .flatMap(date => byDate[date] ?? [])
}

export function formatDayDate(date: string): string {
  return dayFormatter.format(parseDate(date).toDate('UTC')).replace(',', '')
}

// The Trips card's text for a trip's dates.
export function tripDateLine(start: string | null, end: string | null): string {
  if (!start || !end) {
    return 'No dates yet'
  }

  const startDate = parseDate(start).toDate(getLocalTimeZone())
  const endDate = parseDate(end).toDate(getLocalTimeZone())
  return `${formatStartEndDate(startDate, endDate)} • ${dateDiffInDays(startDate, endDate)}`
}

// How many "YYYY-MM-DD" dates fall outside start to end. All of them when the trip has no dates.
export function countOutside(dates: string[], start: string | null, end: string | null): number {
  if (!start || !end) {
    return dates.length
  }
  return dates.filter(date => date < start || date > end).length
}
