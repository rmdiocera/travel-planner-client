import { Time } from '@internationalized/date'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import TripTimesEditor from '~/components/trip/TimesEditor.vue'
import { tripDaysKey } from '~/composables/useTripDays'
import type { Spot } from '~/types/spot'
import { makeSpot } from '../../utils/tripFixtures'

const fakeDays = {
  setTimes: vi.fn(),
}

const timed = makeSpot('s1', '2027-03-13', { start_time: '08:00:00', end_time: '10:00:00' })
const untimed = makeSpot('s2', '2027-03-13')

async function mountEditor(stop: Spot) {
  return mountSuspended(TripTimesEditor, {
    props: { stop },
    global: { provide: { [tripDaysKey as symbol]: fakeDays } },
  })
}

function setField(wrapper: Awaited<ReturnType<typeof mountEditor>>, index: number, time: Time | null) {
  const field = index === 0 ? 'times-arrive' : 'times-leave'
  wrapper.findComponent(`[data-testid="${field}"]`).vm.$emit('update:modelValue', time)
}

describe('TripTimesEditor', () => {
  beforeEach(() => {
    fakeDays.setTimes.mockReset()
    fakeDays.setTimes.mockResolvedValue(true)
  })

  it('starts with the stop\'s times and saves them unchanged', async () => {
    const wrapper = await mountEditor(timed)
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()

    expect(fakeDays.setTimes).toHaveBeenCalledWith(timed, '08:00', '10:00')
  })

  it('saves new times', async () => {
    const wrapper = await mountEditor(untimed)
    setField(wrapper, 0, new Time(11, 30))
    setField(wrapper, 1, new Time(13, 0))
    await nextTick()
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()

    expect(fakeDays.setTimes).toHaveBeenCalledWith(untimed, '11:30', '13:00')
  })

  it('saves cleared times as null', async () => {
    const wrapper = await mountEditor(timed)
    await wrapper.find('[data-testid="times-clear-btn"]').trigger('click')
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()

    expect(fakeDays.setTimes).toHaveBeenCalledWith(timed, null, null)
  })

  it('refuses a leave time that is not after the arrive time', async () => {
    const wrapper = await mountEditor(untimed)
    setField(wrapper, 0, new Time(13, 0))
    setField(wrapper, 1, new Time(13, 0))
    await nextTick()
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Leave must be after arrive')
    expect(fakeDays.setTimes).not.toHaveBeenCalled()
  })

  it('refuses a leave time without an arrive time', async () => {
    const wrapper = await mountEditor(untimed)
    setField(wrapper, 1, new Time(13, 0))
    await nextTick()
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Add an arrive time too')
    expect(fakeDays.setTimes).not.toHaveBeenCalled()
  })

  it('closes after a successful save, and stays open when it fails', async () => {
    const wrapper = await mountEditor(timed)
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('close')).toHaveLength(1)

    fakeDays.setTimes.mockResolvedValue(false)
    await wrapper.find('[data-testid="times-save-btn"]').trigger('click')
    await flushPromises()
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('closes on Cancel without saving', async () => {
    const wrapper = await mountEditor(timed)
    await wrapper.find('[data-testid="times-cancel-btn"]').trigger('click')

    expect(wrapper.emitted('close')).toHaveLength(1)
    expect(fakeDays.setTimes).not.toHaveBeenCalled()
  })
})
