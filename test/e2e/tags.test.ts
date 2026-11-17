import { beforeAll, describe, expect, inject, it } from 'vitest'
import { createApiSession } from '../utils/apiSession'
import type { TagsResponse } from '../../app/types/tag'

describe('Tags API', () => {
  const { ensureLoggedIn, $fetch } = createApiSession({ saved: inject('apiSession') })
  beforeAll(ensureLoggedIn)

  it('returns a list of tags', async () => {
    const response = await $fetch<TagsResponse>('/api/v1/tags')
    expect(response).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
  })
})
