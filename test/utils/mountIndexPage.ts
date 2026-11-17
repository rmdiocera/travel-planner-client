import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import IndexPage from '@/pages/index.vue'

export async function mountIndexPage({ openCreateModal = true } = {}) {
  const wrapper = await mountSuspended(IndexPage)
  onTestFinished(() => wrapper.unmount())
  if (openCreateModal) {
    await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')
  }
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
