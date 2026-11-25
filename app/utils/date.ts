import { CalendarDate, DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})

export function formatStartEndDate(start_date: Date, end_date: Date) {
  return `${df.format(start_date)} - ${df.format(end_date)}`
}

export function dateDiffInDays(start_date: Date, end_date: Date) {
  const _MS_PER_DAY = 1000 * 60 * 60 * 24
  const start_date_utc = Date.UTC(start_date.getFullYear(), start_date.getMonth(), start_date.getDate())
  const end_date_utc = Date.UTC(end_date.getFullYear(), end_date.getMonth(), end_date.getDate())

  const day_count = Math.floor((end_date_utc - start_date_utc) / _MS_PER_DAY) + 1
  return `${day_count} ${day_count > 1 ? 'days' : 'day'}`
}

// An API date ("YYYY-MM-DD") as local midnight of that day. new Date("YYYY-MM-DD") is UTC midnight,
// which is the previous day west of UTC.
export function toLocalDate(date: string) {
  return parseDate(date).toDate(getLocalTimeZone())
}

// Negative when the API date is before today, zero for today, positive after.
export function compareToToday(date: string) {
  return parseDate(date).compare(today(getLocalTimeZone()))
}

export function toCalendarDate(date: Date) {
  return new CalendarDate(date.getFullYear(), date.getMonth() + 1, date.getDate())
}
