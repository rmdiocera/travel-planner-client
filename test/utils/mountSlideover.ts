import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import Slideover from '@/components/ui/Slideover.vue'

export async function mountSlideover(options = {}) {
  const wrapper = await mountSuspended(Slideover, options)
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
