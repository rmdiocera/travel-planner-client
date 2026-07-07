import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'

type TagsResponse = {
  data: Tag[]
}

type Tag = {
  id: number
  name: string
}

describe('Tags API', async () => {
  await setup()

  it('returns a list of places', async () => {
    const response = await $fetch<TagsResponse>('/api/tags')
    expect(response).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
  })
})
