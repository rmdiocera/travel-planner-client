import { describe, expect, it } from 'vitest'

describe('Trip page access', () => {
  it('sends a guest to the login page', async () => {
    const router = useRouter()
    await router.push('/trips/t1')

    expect(router.currentRoute.value.path).toBe('/login')
  })
})
