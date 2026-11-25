// "On day 2" or "On days 1 and 7": where a list place is already planned. Null when it's on no day.
export function onDaysLabel(dayNumbers: number[]): string | null {
  if (!dayNumbers.length) {
    return null
  }
  if (dayNumbers.length === 1) {
    return `On day ${dayNumbers[0]}`
  }

  const last = dayNumbers[dayNumbers.length - 1]
  return `On days ${dayNumbers.slice(0, -1).join(', ')} and ${last}`
}
