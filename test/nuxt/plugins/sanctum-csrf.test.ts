import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { clientMock } = vi.hoisted(() => ({
  clientMock: vi.fn(),
}))

mockNuxtImport('useSanctumClient', () => () => clientMock)

// Does what the module's client does after every response from Laravel, errors included.
async function respondWith(status: number) {
  const nuxtApp = useNuxtApp()
  await nuxtApp.callHook('sanctum:response', nuxtApp, { response: { status } } as any, console as any)
}

describe('CSRF cookie refresh', () => {
  beforeEach(() => {
    clientMock.mockReset()
  })

  it('asks Laravel for a new CSRF cookie after a 419', async () => {
    clientMock.mockResolvedValue(undefined)
    await respondWith(419)
    expect(clientMock).toHaveBeenCalledExactlyOnceWith('/sanctum/csrf-cookie')
  })

  it.each([200, 204, 401, 422, 429, 500])('leaves a %i alone', async (status) => {
    await respondWith(status)
    expect(clientMock).not.toHaveBeenCalled()
  })

  it('still hands back the 419 when the new cookie can\'t be fetched', async () => {
    clientMock.mockRejectedValue(new TypeError('fetch failed'))
    await expect(respondWith(419)).resolves.toBeUndefined()
    expect(clientMock).toHaveBeenCalledTimes(1)
  })
})
