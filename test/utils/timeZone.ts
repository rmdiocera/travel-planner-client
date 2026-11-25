import { onTestFinished } from 'vitest'

// Unsetting TZ doesn't reset Node's time zone, so the zone the test started in is put back by name.
export function setTimeZone(zone: string) {
  const originalZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  process.env.TZ = zone
  onTestFinished(() => {
    process.env.TZ = originalZone
  })
}
