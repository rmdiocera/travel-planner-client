import { afterEach, describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import Slideover from '@/components/ui/Slideover.vue'
import { DOMWrapper } from '@vue/test-utils'

describe('Slideover.vue', () => {
  let wrapper: Awaited<ReturnType<typeof mountSuspended>>

  afterEach(() => {
    wrapper?.unmount()
  })

  it('is visible if open prop is true', async () => {
    wrapper = await mountSuspended(Slideover, {
      props: { open: true },
    })

    const bodyWrapper = new DOMWrapper(document.body)
    expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(true)
  })

  it('is hidden if open prop is false', async () => {
    wrapper = await mountSuspended(Slideover, {
      props: { open: false },
    })

    const bodyWrapper = new DOMWrapper(document.body)
    expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
  })

  it('renders content passed to the form slot', async () => {
    wrapper = await mountSuspended(Slideover, {
      props: { open: true },
      slots: {
        form: '<div data-testid="test-form">Form content</div>',
      },
    })

    const bodyWrapper = new DOMWrapper(document.body)
    expect(bodyWrapper.find('[data-testid="test-form"]').exists()).toBe(true)
    expect(bodyWrapper.find('[data-testid="test-form"]').text()).toBe('Form content')
  })

  it('renders content passed to the action slot', async () => {
    wrapper = await mountSuspended(Slideover, {
      props: { open: true },
      slots: {
        action: '<button data-testid="submit-btn">Submit</button>',
      },
    })

    const bodyWrapper = new DOMWrapper(document.body)
    expect(bodyWrapper.find('[data-testid="submit-btn"]').exists()).toBe(true)
  })

  it('emits update:open when closed', async () => {
    wrapper = await mountSuspended(Slideover, {
      props: { open: true },
    })

    const bodyWrapper = new DOMWrapper(document.body)
    await bodyWrapper.find('[aria-label="Close"]').trigger('click')

    expect(wrapper.emitted('update:open')).toBeTruthy()
    expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
  })
})
