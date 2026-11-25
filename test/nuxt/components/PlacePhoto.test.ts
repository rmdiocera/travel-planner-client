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
})
