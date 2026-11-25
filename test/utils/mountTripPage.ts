import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import TripPage from '@/pages/trips/[id].vue'

// No `route` option: navigating would run sanctum:auth, which checks the module's own session state and
// sends the test to /login. Trip page tests mock useRoute instead.
// attachTo puts the page in the document, for tests that look elements up by id or check focus and scrolling.
export async function mountTripPage({ attachTo }: { attachTo?: Element } = {}) {
  const wrapper = await mountSuspended(TripPage, { attachTo })
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
