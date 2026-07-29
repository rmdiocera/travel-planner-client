import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import Modal from '@/components/ui/Modal.vue'

export async function mountModal(options = {}) {
  const wrapper = await mountSuspended(Modal, options)
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
