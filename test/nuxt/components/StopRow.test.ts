import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TripStopRow from '~/components/trip/StopRow.vue'
import { tripDialogsKey } from '~/composables/tripDialogs'
import { tripDaysKey } from '~/composables/useTripDays'
import type { Spot } from '~/types/spot'
import { mapsUrl } from '~/utils/trip/maps'
import { makePlace, makeSpot } from '../../utils/tripFixtures'

const fakeDays = {
  days: ref([{ date: '2027-03-13', number: 2, stops: [], outOfOrder: false }]),
  setVisited: vi.fn(),
  removeStop: vi.fn(),
  isSaving: vi.fn(() => false),
}

const castle = makePlace({
  id: 'p1',
  name: 'Osaka Castle',
  city: 'Osaka',
  details: 'A 16th-century castle.',
  address: '1-1 Osakajo, Chuo Ward, Osaka',
  phone: '+81 6-6941-3044',
  website: 'osakacastle.net',
})

async function mountRow(stop: Spot, props: { open?: boolean } = {}) {
  return mountSuspended(TripStopRow, {
    props: { stop, variant: 'day', open: false, isFirst: true, isLast: true, ...props },
    global: { provide: { [tripDaysKey as symbol]: fakeDays, [tripDialogsKey as symbol]: { openDayPicker: vi.fn() } } },
  })
}

describe('TripStopRow', () => {
  beforeEach(() => {
    fakeDays.setVisited.mockReset()
    fakeDays.isSaving.mockReset()
    fakeDays.isSaving.mockReturnValue(false)
  })

  describe('opened', () => {
    it('shows the place\'s details, address, phone and website', async () => {
      const wrapper = await mountRow(makeSpot('s1', '2027-03-13', { place: castle }), { open: true })

      expect(wrapper.text()).toContain('A 16th-century castle.')
      expect(wrapper.text()).toContain('1-1 Osakajo, Chuo Ward, Osaka')
      const maps = wrapper.find('[data-testid="place-maps-link"]')
      expect(maps.attributes('href')).toBe(mapsUrl(castle))
      expect(maps.attributes('target')).toBe('_blank')
      expect(wrapper.find('[data-testid="place-phone-link"]').attributes('href')).toBe('tel:+81 6-6941-3044')
      const website = wrapper.find('[data-testid="place-website-link"]')
      expect(website.attributes('href')).toBe('https://osakacastle.net')
      expect(website.attributes('target')).toBe('_blank')
      expect(website.attributes('rel')).toContain('noopener')
    })

    it('leaves out the lines a place does not have', async () => {
      const place = makePlace({ phone: null, website: null })
      const wrapper = await mountRow(makeSpot('s1', '2027-03-13', { place }), { open: true })

      expect(wrapper.find('[data-testid="place-phone-link"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="place-website-link"]').exists()).toBe(false)
    })

    it('marks a stop as visited', async () => {
      const stop = makeSpot('s1', '2027-03-13')
      const wrapper = await mountRow(stop, { open: true })

      const button = wrapper.find('[data-testid="stop-visited-btn"]')
      expect(button.text()).toBe('Mark as visited')
      await button.trigger('click')

      expect(fakeDays.setVisited).toHaveBeenCalledWith(stop, true)
    })

    it('offers to undo a visited mark', async () => {
      const stop = makeSpot('s1', '2027-03-13', { marked_visited: true })
      const wrapper = await mountRow(stop, { open: true })

      const button = wrapper.find('[data-testid="stop-visited-btn"]')
      expect(button.text()).toBe('Mark as not visited')
      await button.trigger('click')

      expect(fakeDays.setVisited).toHaveBeenCalledWith(stop, false)
    })

    it('marks the visited button busy while it saves, without disabling it so it keeps focus', async () => {
      fakeDays.isSaving.mockReturnValue(true)
      const wrapper = await mountRow(makeSpot('s1', '2027-03-13'), { open: true })

      const button = wrapper.find('[data-testid="stop-visited-btn"]')
      expect(button.attributes('aria-disabled')).toBe('true')
      expect(button.attributes()).not.toHaveProperty('disabled')
    })
  })

  describe('Edit times and focus', () => {
    async function mountOpenRow() {
      return mountSuspended(TripStopRow, {
        props: { stop: makeSpot('s1', '2027-03-13'), variant: 'day', open: true, isFirst: true, isLast: true },
        global: { provide: { [tripDaysKey as symbol]: fakeDays, [tripDialogsKey as symbol]: { openDayPicker: vi.fn() } } },
        attachTo: document.body,
      })
    }

    it('moves focus into the Arrive field when Edit times opens', async () => {
      const wrapper = await mountOpenRow()
      await wrapper.find('[data-testid="stop-edit-times-btn"]').trigger('click')
      await nextTick()
      await nextTick()

      const arrive = wrapper.find('[data-testid="times-arrive"]').element
      expect(arrive.contains(document.activeElement)).toBe(true)
      wrapper.unmount()
    })

    it('gives focus back to the Edit times button when it closes', async () => {
      const wrapper = await mountOpenRow()
      await wrapper.find('[data-testid="stop-edit-times-btn"]').trigger('click')
      await wrapper.find('[data-testid="times-cancel-btn"]').trigger('click')
      await nextTick()
      await nextTick()

      expect(document.activeElement).toBe(wrapper.find('[data-testid="stop-edit-times-btn"]').element)
      wrapper.unmount()
    })
  })

  describe('closed', () => {
    it('shows nothing of the details', async () => {
      const wrapper = await mountRow(makeSpot('s1', '2027-03-13', { place: castle }))

      expect(wrapper.text()).not.toContain('A 16th-century castle.')
      expect(wrapper.find('[data-testid="stop-visited-btn"]').exists()).toBe(false)
    })

    it('has a toggle that says whether it is open', async () => {
      const wrapper = await mountRow(makeSpot('s1', '2027-03-13'))
      const toggle = wrapper.find('[data-testid="stop-toggle-s1"]')
      expect(toggle.attributes('aria-expanded')).toBe('false')

      await toggle.trigger('click')
      expect(wrapper.emitted('toggle')).toHaveLength(1)
    })

    it('shows a visited stop as visited', async () => {
      const wrapper = await mountRow(makeSpot('s1', '2027-03-13', { marked_visited: true }))

      expect(wrapper.text()).toContain('Visited')
    })
  })
})
