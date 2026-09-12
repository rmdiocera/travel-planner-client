import { setup, $fetch } from '@nuxt/test-utils/e2e'
import { describe, expect, it } from 'vitest'
import type { TagsResponse } from '../../app/types/tag'

describe('Tags API', async () => {
  await setup()

  it('returns a list of tags', async () => {
    const response = await $fetch<TagsResponse>('/api/tags')
    expect(response).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
  })
})
