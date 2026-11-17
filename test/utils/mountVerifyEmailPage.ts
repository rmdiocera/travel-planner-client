import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import VerifyEmailPage from '@/pages/verify-email.vue'

export async function mountVerifyEmailPage() {
  const wrapper = await mountSuspended(VerifyEmailPage, { attachTo: document.body })
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
