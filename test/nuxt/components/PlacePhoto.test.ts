import { describe, expect, it, onTestFinished } from 'vitest'
import { mockComponent, mountSuspended } from '@nuxt/test-utils/runtime'
import { DOMWrapper, flushPromises } from '@vue/test-utils'
import TripPlacePhoto from '~/components/trip/PlacePhoto.vue'
import { makePlace } from '../../utils/tripFixtures'

mockComponent('UCarousel', () => import('../../utils/carouselStub'))

const image = (id: number, url: string) => ({ id, path: `places/${id}.jpg`, place_id: 'p1', url })

describe('TripPlacePhoto', () => {
  it('shows the place\'s first photo', async () => {
    const place = makePlace({ images: [image(1, 'http://localhost/images/places/1.jpg'), image(2, 'http://localhost/images/places/2.jpg')] })
    const wrapper = await mountSuspended(TripPlacePhoto, { props: { place } })

    const photo = wrapper.find('[data-testid="place-photo"]')
    expect(photo.attributes('src')).toBe('http://localhost/images/places/1.jpg')
    expect(photo.attributes('alt')).toBe('')
    expect(wrapper.find('[data-testid="place-photo-placeholder"]').exists()).toBe(false)
  })

  it('shows the placeholder when the place has no photos', async () => {
    const wrapper = await mountSuspended(TripPlacePhoto, { props: { place: makePlace() } })

    expect(wrapper.find('[data-testid="place-photo"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="place-photo-placeholder"]').exists()).toBe(true)
  })

  it('falls back to the placeholder when the photo fails to load', async () => {
    const place = makePlace({ images: [image(1, 'http://localhost/images/places/missing.jpg')] })
    const wrapper = await mountSuspended(TripPlacePhoto, { props: { place } })

    await wrapper.find('[data-testid="place-photo"]').trigger('error')

    expect(wrapper.find('[data-testid="place-photo"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="place-photo-placeholder"]').exists()).toBe(true)
  })

  it('shows the photo at 76px, and 144 by 96 from 768px up', async () => {
    const place = makePlace({ images: [image(1, 'http://localhost/images/places/1.jpg')] })
    const wrapper = await mountSuspended(TripPlacePhoto, { props: { place } })

    const classes = wrapper.find('[data-testid="place-photo"]').classes()
    expect(classes).toEqual(expect.arrayContaining(['size-19', 'md:h-24', 'md:w-36']))
    expect(classes).not.toContain('size-10')
  })

  it('makes the placeholder the same size, with a bigger pin', async () => {
    const wrapper = await mountSuspended(TripPlacePhoto, { props: { place: makePlace() } })

    expect(wrapper.find('[data-testid="place-photo-placeholder"]').classes()).toEqual(expect.arrayContaining(['size-19', 'md:h-24', 'md:w-36']))
    expect(wrapper.find('[data-testid="place-photo-pin"]').classes()).toEqual(expect.arrayContaining(['size-8', 'md:size-10']))
  })

  it('keeps the size when the photo fails to load', async () => {
    const place = makePlace({ images: [image(1, 'http://localhost/images/places/missing.jpg')] })
    const wrapper = await mountSuspended(TripPlacePhoto, { props: { place } })

    await wrapper.find('[data-testid="place-photo"]').trigger('error')

    expect(wrapper.find('[data-testid="place-photo-placeholder"]').classes()).toEqual(expect.arrayContaining(['size-19', 'md:h-24', 'md:w-36']))
  })

  describe('photo button', () => {
    async function mountPhoto(imageCount: number) {
      const images = Array.from({ length: imageCount }, (_, i) => image(i + 1, `http://localhost/images/places/${i + 1}.jpg`))
      const wrapper = await mountSuspended(TripPlacePhoto, { props: { place: makePlace({ images }) } })
      onTestFinished(() => wrapper.unmount())
      return { wrapper, bodyWrapper: new DOMWrapper(document.body) }
    }

    it('wraps the photo in a button named after the place', async () => {
      const { wrapper: one } = await mountPhoto(1)
      expect(one.find('[data-testid="place-photo-btn"]').attributes('aria-label')).toBe('View photo of Senso-ji')

      const { wrapper: four } = await mountPhoto(4)
      const button = four.find('[data-testid="place-photo-btn"]')
      expect(button.attributes('aria-label')).toBe('View 4 photos of Senso-ji')
      expect(button.find('[data-testid="place-photo"]').exists()).toBe(true)
    })

    it('has no button on the placeholder', async () => {
      const { wrapper } = await mountPhoto(0)

      expect(wrapper.find('[data-testid="place-photo-btn"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="place-photo-placeholder"]').exists()).toBe(true)
    })

    it('has no button once the first photo fails to load, even if the place has other photos', async () => {
      const { wrapper } = await mountPhoto(2)

      await wrapper.find('[data-testid="place-photo"]').trigger('error')

      expect(wrapper.find('[data-testid="place-photo-btn"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="place-photo-placeholder"]').exists()).toBe(true)
    })

    it('shows the count on a chip for two or more photos', async () => {
      const { wrapper } = await mountPhoto(3)

      const chip = wrapper.find('[data-testid="place-photo-chip"]')
      expect(chip.text()).toBe('3')
      expect(chip.attributes('aria-hidden')).toBe('true')
    })

    it('shows no chip for one photo', async () => {
      const { wrapper } = await mountPhoto(1)

      expect(wrapper.find('[data-testid="place-photo-chip"]').exists()).toBe(false)
    })

    it('opens the viewer when the photo is clicked', async () => {
      const { wrapper, bodyWrapper } = await mountPhoto(2)
      expect(bodyWrapper.find('[data-testid="photo-viewer"]').exists()).toBe(false)

      await wrapper.find('[data-testid="place-photo-btn"]').trigger('click')
      await flushPromises()

      expect(bodyWrapper.find('[data-testid="photo-viewer"]').exists()).toBe(true)
    })
  })
})
