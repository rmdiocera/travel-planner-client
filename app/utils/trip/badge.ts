import { parseDate } from '@internationalized/date'

// Edit trip is off for a past trip. A trip without an end date is never past.
export function isPastTrip(end: string | null, today: string): boolean {
  return !!end && parseDate(end).compare(parseDate(today)) < 0
}

// "In 12 days", "Starts tomorrow", "Day 3 of 7" or "Ended". No badge without both dates.
export function tripBadge(start: string | null, end: string | null, today: string): string | null {
  if (!start || !end) {
    return null
  }

  const now = parseDate(today)
  const untilStart = parseDate(start).compare(now)
  if (untilStart > 0) {
    return untilStart === 1 ? 'Starts tomorrow' : `In ${untilStart} days`
  }
  if (parseDate(end).compare(now) < 0) {
    return 'Ended'
  }

  const length = parseDate(end).compare(parseDate(start)) + 1
  return `Day ${now.compare(parseDate(start)) + 1} of ${length}`
}
