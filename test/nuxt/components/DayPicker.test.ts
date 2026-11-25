import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TripDayPicker from '~/components/trip/DayPicker.vue'
import { tripDaysKey } from '~/composables/useTripDays'
import { makeSpot } from '../../utils/tripFixtures'

const stops = [
  makeSpot('s1', '2027-03-13', { start_time: '08:00:00', end_time: '10:00:00' }),
  makeSpot('s2', '2027-03-13'),
]
const fakeDays = {
  days: ref([
    { date: '2027-03-12', number: 1, stops: [], outOfOrder: false },
    { date: '2027-03-13', number: 2, stops, outOfOrder: false },
    { date: '2027-03-14', number: 3, stops: [], outOfOrder: false },
  ]),
}

async function mountPicker(props: Record<string, unknown> = {}) {
  return mountSuspended(TripDayPicker, {
    props: { selected: null, ...props },
    global: { provide: { [tripDaysKey as symbol]: fakeDays } },
  })
}

describe('TripDayPicker', () => {
  it('lists the trip\'s days with the places on each', async () => {
    const wrapper = await mountPicker()

    const options = wrapper.findAll('[role="radio"]')
    expect(options).toHaveLength(3)
    expect(options[1]!.text()).toContain('Day 2')
    expect(options[1]!.text()).toContain('Sat 13 Mar')
    expect(options[1]!.text()).toContain('Place s1, Place s2')
    expect(options[0]!.text()).toContain('Nothing planned yet')
  })

  it('turns off the disabled date', async () => {
    const wrapper = await mountPicker({ disabledDate: '2027-03-13' })

    expect(wrapper.find('[data-testid="day-option-2027-03-13"]').attributes()).toHaveProperty('disabled')
    expect(wrapper.find('[data-testid="day-option-2027-03-14"]').attributes()).not.toHaveProperty('disabled')
  })

  it('reports the chosen day', async () => {
    const wrapper = await mountPicker()
    await wrapper.find('[data-testid="day-option-2027-03-14"]').trigger('click')

    expect(wrapper.emitted('update:selected')![0]).toEqual(['2027-03-14'])
  })

  it('shows the chosen day\'s places with their times', async () => {
    const wrapper = await mountPicker({ selected: '2027-03-13' })

    const chosen = wrapper.find('[data-testid="day-option-2027-03-13"]')
    expect(chosen.attributes('aria-checked')).toBe('true')
    expect(wrapper.find('[data-testid="day-times-2027-03-13"]').text()).toContain('08:00')
    expect(wrapper.find('[data-testid="day-times-2027-03-13"]').text()).toContain('Any time')
  })
})
