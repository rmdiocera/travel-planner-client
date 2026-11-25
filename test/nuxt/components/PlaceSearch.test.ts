import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import TripPlaceSearch from '~/components/trip/PlaceSearch.vue'

const { clientMock, toastAddMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  toastAddMock: vi.fn(),
}))

mockNuxtImport('useSanctumClient', () => () => clientMock)
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

const ameyoko = { id: 'p1', name: 'Ameyoko Market', city: 'Tokyo', details: '', address: '', country: 'Japan', website: '', phone: '', tags: [{ id: 1, name: 'Market' }] }
const amerikamura = { id: 'p2', name: 'Amerikamura', city: 'Osaka', details: '', address: '', country: 'Japan', website: '', phone: '', tags: [] }

function deferred<T>() {
  let resolve: (value: T) => void = () => {}
  const promise = new Promise<T>((done) => {
    resolve = done
  })
  return { promise, resolve }
}

describe('TripPlaceSearch', () => {
  const add = vi.fn()

  beforeEach(() => {
    clientMock.mockReset()
    toastAddMock.mockReset()
    add.mockReset()
    add.mockResolvedValue(true)
    clientMock.mockResolvedValue({ data: [ameyoko, amerikamura] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  async function mountSearch(props: Record<string, unknown> = {}) {
    const wrapper = await mountSuspended(TripPlaceSearch, { props: { targetLabel: 'day 2', add, ...props } })
    return wrapper
  }

  async function search(wrapper: Awaited<ReturnType<typeof mountSearch>>, term: string) {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    await wrapper.find('input').setValue(term)
    vi.advanceTimersByTime(300)
    vi.useRealTimers()
    await flushPromises()
  }

  it('shows the hint before anything is typed', async () => {
    const wrapper = await mountSearch()

    expect(wrapper.text()).toContain('Type a place or city name.')
  })

  it('lists matching places with their city and first tag', async () => {
    const wrapper = await mountSearch()
    await search(wrapper, 'ame')

    expect(wrapper.text()).toContain('Ameyoko Market')
    expect(wrapper.text()).toContain('Tokyo · Market')
    expect(wrapper.text()).toContain('Osaka')
  })

  it('adds a place straight away and marks it as added', async () => {
    const wrapper = await mountSearch()
    await search(wrapper, 'ame')
    await wrapper.find('[data-testid="add-result-p1"]').trigger('click')
    await flushPromises()

    expect(add).toHaveBeenCalledWith(expect.objectContaining({ id: 'p1' }))
    const button = wrapper.find('[data-testid="add-result-p1"]')
    expect(button.text()).toBe('Added')
    // aria-disabled, not disabled, so the button keeps keyboard focus.
    expect(button.attributes('aria-disabled')).toBe('true')
    expect(button.attributes()).not.toHaveProperty('disabled')
    expect(wrapper.find('[data-testid="place-search-added"]').text()).toBe('Added to day 2: Ameyoko Market')
    expect(wrapper.emitted('added')).toHaveLength(1)
  })

  it('names each Add button after its place, and announces what was added', async () => {
    const wrapper = await mountSearch()
    await search(wrapper, 'ame')

    expect(wrapper.find('[data-testid="add-result-p1"]').attributes('aria-label')).toBe('Add Ameyoko Market')
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    await wrapper.find('[data-testid="add-result-p1"]').trigger('click')
    await flushPromises()
    expect(wrapper.find('[role="status"]').text()).toContain('Added to day 2: Ameyoko Market')
  })

  it('gives focus back to the button after adding', async () => {
    const pending = deferred<boolean>()
    add.mockReturnValue(pending.promise)
    const wrapper = await mountSuspended(TripPlaceSearch, { props: { targetLabel: 'day 2', add }, attachTo: document.body })
    await search(wrapper, 'ame')
    const button = wrapper.find('[data-testid="add-result-p1"]')
    ;(button.element as HTMLElement).focus()
    await button.trigger('click')
    // A browser moves focus off a button that is disabled while it loads.
    document.body.focus()
    expect(document.activeElement).not.toBe(button.element)

    pending.resolve(true)
    await flushPromises()

    expect(document.activeElement).toBe(wrapper.find('[data-testid="add-result-p1"]').element)
    wrapper.unmount()
  })

  it('disables Add while the place is being added', async () => {
    const pending = deferred<boolean>()
    add.mockReturnValue(pending.promise)
    const wrapper = await mountSearch()
    await search(wrapper, 'ame')

    await wrapper.find('[data-testid="add-result-p1"]').trigger('click')
    await wrapper.find('[data-testid="add-result-p1"]').trigger('click')
    expect(add).toHaveBeenCalledTimes(1)
    expect(wrapper.find('[data-testid="add-result-p1"]').attributes()).toHaveProperty('disabled')

    pending.resolve(true)
    await flushPromises()
  })

  it('says Already on this day for a place already there, and still lets it be added', async () => {
    const wrapper = await mountSearch({ isOnTarget: (placeId: string) => placeId === 'p1' })
    await search(wrapper, 'ame')

    expect(wrapper.find('[data-testid="search-result-p1"]').text()).toContain('Already on this day')
    expect(wrapper.find('[data-testid="search-result-p2"]').text()).not.toContain('Already on this day')
    expect(wrapper.find('[data-testid="add-result-p1"]').attributes()).not.toHaveProperty('disabled')
  })

  it('uses the words it is given for a place already there', async () => {
    const wrapper = await mountSearch({ isOnTarget: (placeId: string) => placeId === 'p1', onTargetLabel: 'Already in this list' })
    await search(wrapper, 'ame')

    expect(wrapper.find('[data-testid="search-result-p1"]').text()).toContain('Already in this list')
  })

  it('says when no places match', async () => {
    clientMock.mockResolvedValue({ data: [] })
    const wrapper = await mountSearch()
    await search(wrapper, 'xyz')

    expect(wrapper.text()).toContain('No places match "xyz".')
  })

  it('keeps Add available when adding fails', async () => {
    add.mockResolvedValue(false)
    const wrapper = await mountSearch()
    await search(wrapper, 'ame')
    await wrapper.find('[data-testid="add-result-p1"]').trigger('click')
    await flushPromises()

    const button = wrapper.find('[data-testid="add-result-p1"]')
    expect(button.text()).toBe('Add')
    expect(button.attributes()).not.toHaveProperty('disabled')
    expect(wrapper.find('[data-testid="place-search-added"]').exists()).toBe(false)
  })
})
