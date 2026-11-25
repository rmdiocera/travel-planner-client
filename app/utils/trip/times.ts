// "14:00:00" from the API as "14:00".
export function formatTime(time: string | null): string | null {
  return time ? time.slice(0, 5) : null
}
