import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import { h } from 'vue'
import TripPhotoViewer from '~/components/trip/PhotoViewer.vue'
import type { PlaceImage } from '~/types/image'
import { scrollNextMock, scrollPrevMock, scrollToMock } from '../../utils/carouselStub'
import { makePlace } from '../../utils/tripFixtures'

mockComponent('UCarousel', () => import('../../utils/carouselStub'))

const images = (count: number): PlaceImage[] =>
  Array.from({ length: count }, (_, i) => ({ id: i + 1, path: `places/${i + 1}.jpg`, place_id: 'p1', url: `http://localhost/images/places/${i + 1}.jpg` }))

async function mountViewer(count = 4, options: { attachTo?: HTMLElement, images?: PlaceImage[] } = {}) {
  const { images: custom, ...mountOptions } = options
  const place = makePlace({ name: 'Osaka Castle', images: custom ?? images(count) })
  const wrapper = await mountSuspended(TripPhotoViewer, {
    props: { place },
    slots: { default: () => h('button', { 'type': 'button', 'data-testid': 'viewer-trigger' }, 'Open') },
    ...mountOptions,
  })
  onTestFinished(() => wrapper.unmount())
  return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
}

async function openViewer(wrapper: Awaited<ReturnType<typeof mountViewer>>['wrapper']) {
  await wrapper.find('[data-testid="viewer-trigger"]').trigger('click')
  await flushPromises()
}

describe('TripPhotoViewer', () => {
  beforeEach(() => {
    for (const mock of [scrollToMock, scrollPrevMock, scrollNextMock]) {
      mock.mockReset()
    }
  })

  describe('opening', () => {
    it('opens from its trigger with one slide per photo and the counter at 1 / N', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      expect(bodyWrapper.find('[data-testid="photo-viewer"]').exists()).toBe(false)

      await openViewer(wrapper)

      for (let i = 0; i < 4; i++) {
        expect(bodyWrapper.find(`[data-testid="photo-viewer-photo-${i}"]`).attributes('src')).toBe(`http://localhost/images/places/${i + 1}.jpg`)
      }
      expect(bodyWrapper.find('[data-testid="photo-viewer-counter"]').text()).toBe('1 / 4')
      expect(bodyWrapper.find('[data-testid="carousel-stub"]').attributes('data-arrows')).toBe('true')
    })

    it('shows the place\'s name only as a hidden title', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      const dialog = bodyWrapper.find('[role="dialog"]')
      expect(document.getElementById(dialog.attributes('aria-labelledby')!)?.textContent).toBe('Osaka Castle')
      expect(bodyWrapper.find('[data-testid="photo-viewer"]').text()).toBe('1 / 4')
    })

    it('closes with its close button', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)
      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(true)

      await bodyWrapper.find('[data-testid="photo-viewer-close"]').trigger('click')
      await flushPromises()

      expect(bodyWrapper.find('[data-state="open"]').exists()).toBe(false)
    })

    it('gives focus back to the trigger when it closes', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4, { attachTo: document.body })
      const trigger = wrapper.find('[data-testid="viewer-trigger"]').element as HTMLElement
      trigger.focus()
      await openViewer(wrapper)

      await bodyWrapper.find('[data-testid="photo-viewer-close"]').trigger('click')

      await vi.waitFor(() => expect(document.activeElement).toBe(trigger))
    })
  })

  describe('browsing', () => {
    it('has one labelled strip button per photo, the first current', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      const first = bodyWrapper.find('[data-testid="photo-viewer-thumb-0"]')
      expect(first.attributes('aria-label')).toBe('Show photo 1 of 4')
      expect(first.attributes('aria-current')).toBe('true')
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-1"]').attributes('aria-current')).toBeUndefined()
      expect(bodyWrapper.findAll('[data-testid^="photo-viewer-thumb-"]')).toHaveLength(4)
    })

    it('moves the counter and the current strip button when the carousel selects', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      await bodyWrapper.find('[data-testid="carousel-stub-select-2"]').trigger('click')

      expect(bodyWrapper.find('[data-testid="photo-viewer-counter"]').text()).toBe('3 / 4')
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-2"]').attributes('aria-current')).toBe('true')
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-0"]').attributes('aria-current')).toBeUndefined()
    })

    it('jumps to a photo when its strip button is clicked', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      await bodyWrapper.find('[data-testid="photo-viewer-thumb-2"]').trigger('click')

      expect(scrollToMock).toHaveBeenCalledWith(2)
    })

    it('starts at the first photo again when reopened', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)
      await bodyWrapper.find('[data-testid="carousel-stub-select-2"]').trigger('click')

      await bodyWrapper.find('[data-testid="photo-viewer-close"]').trigger('click')
      await flushPromises()
      await openViewer(wrapper)

      expect(bodyWrapper.find('[data-testid="photo-viewer-counter"]').text()).toBe('1 / 4')
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-0"]').attributes('aria-current')).toBe('true')
    })

    it('puts six photos in a strip that scrolls sideways', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(6)
      await openViewer(wrapper)

      const thumbs = bodyWrapper.findAll('[data-testid^="photo-viewer-thumb-"]')
      expect(thumbs).toHaveLength(6)
      expect(thumbs[0]!.element.parentElement!.classList.contains('overflow-x-auto')).toBe(true)
    })
  })

  describe('review fixes', () => {
    it('keeps the round buttons visible in dark mode, in focus, pressed and disabled', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      // Nuxt UI's outline button sets a white focus ring in dark mode and a dark background when pressed or disabled.
      const needed = ['focus-visible:ring-neutral-900', 'active:bg-white', 'disabled:bg-white/90', 'aria-disabled:bg-white/90']
      const close = bodyWrapper.find('[data-testid="photo-viewer-close"]').classes()
      expect(close).toEqual(expect.arrayContaining(needed))
      expect(close).not.toContain('active:bg-elevated')
      const stub = bodyWrapper.find('[data-testid="carousel-stub"]')
      for (const attribute of ['data-prev-class', 'data-next-class']) {
        for (const className of needed) {
          expect(stub.attributes(attribute)!.split(' ')).toContain(className)
        }
      }
    })

    it('keeps the photo no taller than the window leaves room for', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      const frame = bodyWrapper.find('[data-testid="photo-viewer-photo-0"]').element.parentElement!
      expect(frame.classList.contains('h-[min(13.25rem,calc(100dvh_-_10rem))]')).toBe(true)
      expect(frame.classList.contains('md:h-[min(21.875rem,calc(100dvh_-_12rem))]')).toBe(true)
    })

    it('moves with the left and right keys when the focus is on a small photo', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)
      const thumb = bodyWrapper.find('[data-testid="photo-viewer-thumb-1"]')

      await thumb.trigger('keydown', { key: 'ArrowRight' })
      expect(scrollNextMock).toHaveBeenCalledTimes(1)
      expect(scrollPrevMock).not.toHaveBeenCalled()

      await thumb.trigger('keydown', { key: 'ArrowLeft' })
      expect(scrollPrevMock).toHaveBeenCalledTimes(1)
    })

    it('leaves the keys to the carousel while the focus is inside it', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      await bodyWrapper.find('[data-testid="carousel-stub"]').trigger('keydown', { key: 'ArrowRight' })

      expect(scrollNextMock).not.toHaveBeenCalled()
    })

    it('shows a pin on that slide and its small photo when a photo file is missing', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      await bodyWrapper.find('[data-testid="photo-viewer-photo-1"]').trigger('error')

      expect(bodyWrapper.find('[data-testid="photo-viewer-photo-1"]').exists()).toBe(false)
      expect(bodyWrapper.find('[data-testid="photo-viewer-missing-1"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-missing-1"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="photo-viewer-photo-0"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="photo-viewer-missing-0"]').exists()).toBe(false)
    })

    it('marks a photo missing when its small photo is the one that fails to load', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(4)
      await openViewer(wrapper)

      await bodyWrapper.find('[data-testid="photo-viewer-thumb-2"] img').trigger('error')

      expect(bodyWrapper.find('[data-testid="photo-viewer-missing-2"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-missing-2"]').exists()).toBe(true)
    })

    it('treats a photo with no url as missing', async () => {
      const list = images(2)
      list[0]!.url = ''
      const { wrapper, bodyWrapper } = await mountViewer(2, { images: list })
      await openViewer(wrapper)

      expect(bodyWrapper.find('[data-testid="photo-viewer-missing-0"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="photo-viewer-photo-1"]').exists()).toBe(true)
    })
  })

  describe('one photo', () => {
    it('shows no arrows, counter or strip', async () => {
      const { wrapper, bodyWrapper } = await mountViewer(1)
      await openViewer(wrapper)

      expect(bodyWrapper.find('[data-testid="carousel-stub"]').attributes('data-arrows')).toBe('false')
      expect(bodyWrapper.find('[data-testid="photo-viewer-counter"]').exists()).toBe(false)
      expect(bodyWrapper.find('[data-testid="photo-viewer-thumb-0"]').exists()).toBe(false)
      expect(bodyWrapper.find('[data-testid="photo-viewer-photo-0"]').exists()).toBe(true)
      expect(bodyWrapper.find('[data-testid="photo-viewer-close"]').exists()).toBe(true)
    })
  })
})
