import { getLocalTimeZone, today } from '@internationalized/date'

// Today's date ("YYYY-MM-DD") in the traveller's time zone, or null until the page is in the browser.
// Server rendering would use the server's date, which can differ and cause a hydration mismatch.
export function useClientToday(): Readonly<Ref<string | null>> {
  const clientToday = ref<string | null>(null)
  onMounted(() => {
    clientToday.value = today(getLocalTimeZone()).toString()
  })
  return readonly(clientToday)
}
