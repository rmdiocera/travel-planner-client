import { faker } from '@faker-js/faker'
import { getLocalTimeZone, today } from '@internationalized/date'
import { fetch, setup, $fetch } from '@nuxt/test-utils/e2e'
import { FetchError } from 'ofetch'
import { beforeAll, describe, expect, it } from 'vitest'

type Itinerary = {
  id: string
  name: string
  start_date: Date
  end_date: Date
}

type ItineraryResponse = {
  data: Itinerary
}

type ItinerariesResponse = {
  data: Itinerary[]
}

type ItinerariesGroupedResponse = {
  data: {
    past: Itinerary[]
    ongoing: Itinerary[]
    upcoming: Itinerary[]
  }
}

let itinerary1Id: string
let itinerary2Id: string
let itinerary3Id: string
let itinerary4Id: string

function fakeDateBetween(from: string, to: string): string {
  return faker.date.between({ from, to }).toISOString().split('T')[0]
}

describe('Itineraries API', async () => {
  await setup()

  const now = today(getLocalTimeZone())

  const itineraries = [
    {
      name: 'Trip to Nagoya and Osaka',
      start_date: fakeDateBetween(now.add({ months: 6, weeks: 1 }).toString(), now.add({ months: 6, weeks: 3 }).toString()),
      end_date: fakeDateBetween(now.add({ months: 6, weeks: 3 }).toString(), now.add({ months: 7 }).toString()),
    },
    {
      name: 'Vietnam Trip',
      start_date: fakeDateBetween(now.add({ months: 2 }).toString(), now.add({ months: 3 }).toString()),
      end_date: fakeDateBetween(now.add({ months: 3 }).toString(), now.add({ months: 4 }).toString()),
    },
    {
      name: 'Trip to Tokyo',
      start_date: '2025-07-21',
      end_date: '2025-07-28',
    },
    {
      name: 'Batanes Trip',
      start_date: fakeDateBetween(now.subtract({ days: 7 }).toString(), now.toString()),
      end_date: fakeDateBetween(now.toString(), now.add({ weeks: 2 }).toString()),
    },
    {
      name: 'Surigao Trip',
      start_date: '2025-03-15',
      end_date: '2025-03-25',
    },
  ]

  beforeAll(async () => {
    try {
      const itinerary1 = await $fetch<ItineraryResponse>('/api/itineraries', { method: 'POST', body: itineraries[0] })
      const itinerary2 = await $fetch<ItineraryResponse>('/api/itineraries', { method: 'POST', body: itineraries[1] })
      const itinerary4 = await $fetch<ItineraryResponse>('/api/itineraries', { method: 'POST', body: itineraries[2] })

      itinerary1Id = itinerary1.data.id
      itinerary2Id = itinerary2.data.id
      itinerary4Id = itinerary4.data.id
    }
    catch (error) {
      if (error instanceof FetchError) {
        console.log(error.data)
        console.log(error.status)
      }
    }
  })

  it('creates an itinerary', async () => {
    const created = await fetch('/api/itineraries', {
      method: 'POST',
      body: JSON.stringify(itineraries[3]),
    })

    expect(created.status).toBe(201)
    expect(created).toBeDefined()

    const body = await created.json() as ItineraryResponse
    expect(body.data.name).toBe(itineraries[3].name)
    expect(String(body.data.start_date)).toBe(itineraries[3].start_date)
    expect(String(body.data.end_date)).toBe(itineraries[3].end_date)

    const itinerary = await fetch(`/api/itineraries/${body.data.id}`)
    expect(itinerary.status).toBe(200)

    const itinerary_body = await itinerary.json() as ItineraryResponse
    expect(itinerary_body.data.id).toBe(body.data.id)

    itinerary3Id = body.data.id
  })

  it('retrieves an itinerary by id', async () => {
    const response = await fetch(`/api/itineraries/${itinerary3Id}`)
    expect(response.status).toBe(200)

    const body = await response.json() as ItineraryResponse
    expect(body.data.id).toBe(itinerary3Id)
    expect(body.data.name).toBe(itineraries[3].name)
    expect(String(body.data.start_date)).toBe(itineraries[3].start_date)
    expect(String(body.data.end_date)).toBe(itineraries[3].end_date)
  })

  it('returns a list of itineraries', async () => {
    const response = await $fetch<ItinerariesResponse>('/api/itineraries')
    expect(response).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
    expect(response.data.length).toBe(4)
  })

  it('returns the itineraries grouped based on its date by past, ongoing, and upcoming', async () => {
    const response = await $fetch<ItinerariesGroupedResponse>('/api/itineraries', {
      params: {
        grouped: true,
      },
    })
    expect(response).toBeDefined()
    expect(response.data.past.length).toBe(1)
    expect(response.data.past[0].end_date).toBe(itineraries[2].end_date)

    expect(response.data.ongoing.length).toBe(1)
    expect(response.data.ongoing[0].start_date).toBe(itineraries[3].start_date)
    expect(response.data.ongoing[0].end_date).toBe(itineraries[3].end_date)

    expect(response.data.upcoming.length).toBe(2)
    expect(response.data.upcoming[0].start_date).toBe(itineraries[0].start_date)
    expect(response.data.upcoming[1].start_date).toBe(itineraries[1].start_date)
  })

  it('updates an itinerary', async () => {
    const updated = await fetch(`/api/itineraries/${itinerary3Id}`, {
      method: 'PATCH',
      body: JSON.stringify(itineraries[4]),
    })
    expect(updated.status).toBe(200)
    expect(updated).toBeDefined()

    const body = await updated.json() as ItineraryResponse
    expect(body.data.name).toBe(itineraries[4].name)
    expect(String(body.data.start_date)).toBe(itineraries[4].start_date)
    expect(String(body.data.end_date)).toBe(itineraries[4].end_date)
  })

  it('deletes an itinerary', async () => {
    const deleted = await fetch(`/api/itineraries/${itinerary1Id}`, { method: 'DELETE' })
    const deleted2 = await fetch(`/api/itineraries/${itinerary2Id}`, { method: 'DELETE' })
    const deleted3 = await fetch(`/api/itineraries/${itinerary3Id}`, { method: 'DELETE' })
    const deleted4 = await fetch(`/api/itineraries/${itinerary4Id}`, { method: 'DELETE' })

    expect(deleted.status).toBe(204)
    expect(deleted2.status).toBe(204)
    expect(deleted3.status).toBe(204)
    expect(deleted4.status).toBe(204)
  })
})
