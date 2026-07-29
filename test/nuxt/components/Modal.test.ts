import { describe, expect, it } from 'vitest'
import { mountModal } from '../../utils/mountModal'

describe('Modal.vue', () => {
  describe('Open/close behavior', () => {
    it('is visible if open prop is true', async () => {
      const { bodyWrapper } = await mountModal({ props: { open: true } })
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(true)
    })

    it('is hidden if open prop is false', async () => {
      const { bodyWrapper } = await mountModal({ props: { open: false } })
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })
  })

  describe('Slots rendering', () => {
    it('renders content passed to the form slot', async () => {
      const { bodyWrapper } = await mountModal({
        props: { open: true },
        slots: {
          form: '<div data-testid="test-form">Form content</div>',
        },
      })

      expect(bodyWrapper.find('[data-testid="test-form"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="test-form"]').text()).toBe('Form content')
    })

    it('renders content passed to the action slot', async () => {
      const { bodyWrapper } = await mountModal({
        props: { open: true },
        slots: {
          action: '<button data-testid="submit-btn">Submit</button>',
        },
      })

      expect(bodyWrapper.find('[data-testid="submit-btn"]').exists()).toBe(true)
    })
  })

  describe('Events', () => {
    it('emits update:open when closed', async () => {
      const { wrapper, bodyWrapper } = await mountModal({
        props: { open: true },
      })
      await bodyWrapper.find('[aria-label="Close"]').trigger('click')

      expect(wrapper.emitted('update:open')).toBeTruthy()
      expect(wrapper.emitted('update:open')?.[0]).toEqual([false])
    })
  })
})
