import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import RegisterPage from '@/pages/register.vue'

export async function mountRegisterPage() {
  const wrapper = await mountSuspended(RegisterPage, { attachTo: document.body })
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
