import { onTestFinished } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper } from '@vue/test-utils'
import AdminPage from '@/pages/admin/index.vue'

export async function mountAdminPage() {
  const wrapper = await mountSuspended(AdminPage)
  onTestFinished(() => wrapper.unmount())
  await wrapper.find('button[data-testid="open-slideover-btn"]').trigger('click')
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}
