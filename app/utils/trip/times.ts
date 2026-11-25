// "14:00:00" from the API as "14:00".
export function formatTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null
}

// True when the stops that have a start time aren't in start-time order. Untimed stops are ignored,
// and equal times count as in order.
export function timesOutOfOrder(stops: { start_time: string | null }[]): boolean {
  const times = stops.map(stop => stop.start_time).filter((time): time is string => !!time)
  return times.some((time, index) => index > 0 && time < times[index - 1]!)
}
