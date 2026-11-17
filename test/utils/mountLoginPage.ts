import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import LoginPage from '@/pages/login.vue'

export async function mountLoginPage() {
  const wrapper = await mountSuspended(LoginPage, { attachTo: document.body })
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
