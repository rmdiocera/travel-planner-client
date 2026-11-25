import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TripPlacePhoto from '~/components/trip/PlacePhoto.vue'
import { makePlace } from '../../utils/tripFixtures'

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
})
