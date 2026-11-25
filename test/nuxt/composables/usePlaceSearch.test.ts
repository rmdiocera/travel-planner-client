import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'
import { usePlaceSearch } from '~/composables/usePlaceSearch'

const { clientMock, toastAddMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
  toastAddMock: vi.fn(),
}))

mockNuxtImport('useSanctumClient', () => () => clientMock)
mockNuxtImport('useToast', () => () => ({ add: toastAddMock }))

function place(id: string, name: string) {
  return { id, name, details: '', address: '', country: 'Japan', city: 'Tokyo', website: '', phone: '', tags: [] }
}

function deferred() {
  let resolve: (value: unknown) => void = () => {}
  const promise = new Promise((done) => {
    resolve = done
  })
  return { promise, resolve }
}

// The watcher only runs inside an effect scope, so the composable is created in one.
function createSearch() {
  const scope = effectScope()
  const search = scope.run(() => usePlaceSearch())!
  onTestFinished(() => scope.stop())
  return search
}

async function type(search: ReturnType<typeof usePlaceSearch>, term: string) {
  search.term.value = term
  await nextTick()
}

describe('usePlaceSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
    clientMock.mockReset()
    toastAddMock.mockReset()
    clientMock.mockResolvedValue({ data: [] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('waits 300 ms after typing stops before searching', async () => {
    const search = createSearch()
    await type(search, 'tsu')

    vi.advanceTimersByTime(299)
    expect(clientMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(clientMock).toHaveBeenCalledWith('/api/v1/places', { params: { search: 'tsu' } })
  })

  it('never searches for a blank term', async () => {
    const search = createSearch()
    await type(search, '   ')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(clientMock).not.toHaveBeenCalled()
    expect(search.results.value).toEqual([])
  })

  it('empties the results when the term is cleared', async () => {
    clientMock.mockResolvedValue({ data: [place('p1', 'Tsukiji Outer Market')] })
    const search = createSearch()
    await type(search, 'tsu')
    vi.advanceTimersByTime(300)
    await flushPromises()
    expect(search.results.value).toHaveLength(1)

    await type(search, '')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(search.results.value).toEqual([])
  })

  it('trims the term and keeps it to 100 characters', async () => {
    const search = createSearch()
    await type(search, `  ${'a'.repeat(120)}`)
    vi.advanceTimersByTime(300)

    expect(clientMock).toHaveBeenCalledWith('/api/v1/places', { params: { search: 'a'.repeat(100) } })
  })

  it('shows the places the API returns for the term', async () => {
    clientMock.mockResolvedValue({ data: [place('p1', 'Tsukiji Outer Market')] })
    const search = createSearch()
    await type(search, 'tsu')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(search.results.value.map(found => found.name)).toEqual(['Tsukiji Outer Market'])
    expect(search.searchedTerm.value).toBe('tsu')
    expect(search.pending.value).toBe(false)
  })

  it('ignores an answer that arrives after a newer search', async () => {
    const first = deferred()
    const second = deferred()
    clientMock.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const search = createSearch()

    await type(search, 'tsu')
    vi.advanceTimersByTime(300)
    await type(search, 'tsukiji')
    vi.advanceTimersByTime(300)

    second.resolve({ data: [place('p2', 'Tsukiji Outer Market')] })
    await flushPromises()
    first.resolve({ data: [place('p1', 'Tsutenkaku')] })
    await flushPromises()

    expect(search.results.value.map(found => found.name)).toEqual(['Tsukiji Outer Market'])
    expect(search.searchedTerm.value).toBe('tsukiji')
  })

  it('shows the error toast when the search fails', async () => {
    clientMock.mockRejectedValue(new Error('Network Error'))
    const search = createSearch()
    await type(search, 'tsu')
    vi.advanceTimersByTime(300)
    await flushPromises()

    expect(toastAddMock).toHaveBeenCalledWith({
      title: 'Something went wrong',
      icon: 'i-lucide-circle-x',
      description: 'There was a problem with your request',
      color: 'error',
    })
    expect(search.pending.value).toBe(false)
  })
})
