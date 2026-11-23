import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import IndexPage from '@/pages/index.vue'

// attachTo puts the page in the document, for tests that look elements up by id or check focus.
export async function mountIndexPage({ openCreateModal = true, attachTo }: { openCreateModal?: boolean, attachTo?: Element } = {}) {
  const wrapper = await mountSuspended(IndexPage, { attachTo })
  onTestFinished(() => wrapper.unmount())
  if (openCreateModal) {
    await wrapper.find('button[data-testid="open-modal-btn"]').trigger('click')
  }
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
