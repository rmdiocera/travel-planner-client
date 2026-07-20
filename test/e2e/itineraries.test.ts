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

let itinerary1Id: string
let itinerary2Id: string
let itinerary3Id: string

describe('Itineraries API', async () => {
  await setup()

  const itineraries = [
    {
      name: 'Trip to Nagoya and Osaka',
      start_date: '2028-05-25',
      end_date: '2028-06-03',
    },
    {
      name: 'Vietnam Trip',
      start_date: '2027-02-12',
      end_date: '2027-02-18',
    },
    {
      name: 'Batanes Trip',
      start_date: '2027-04-18',
      end_date: '2027-04-23',
    },
    {
      name: 'Surigao Trip',
      start_date: '2027-05-04',
      end_date: '2027-05-10',
    },
  ]

  beforeAll(async () => {
    try {
      const itinerary1 = await $fetch<ItineraryResponse>('/api/itineraries', { method: 'POST', body: itineraries[0] })
      const itinerary2 = await $fetch<ItineraryResponse>('/api/itineraries', { method: 'POST', body: itineraries[1] })

      itinerary1Id = itinerary1.data.id
      itinerary2Id = itinerary2.data.id
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
      body: JSON.stringify(itineraries[2]),
    })

    expect(created.status).toBe(201)
    expect(created).toBeDefined()

    const body = await created.json() as ItineraryResponse
    expect(body.data.name).toBe(itineraries[2].name)
    expect(String(body.data.start_date).split('T')[0]).toBe(itineraries[2].start_date)
    expect(String(body.data.end_date).split('T')[0]).toBe(itineraries[2].end_date)

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
    expect(body.data.name).toBe(itineraries[2].name)
    expect(String(body.data.start_date).split('T')[0]).toBe(itineraries[2].start_date)
    expect(String(body.data.end_date).split('T')[0]).toBe(itineraries[2].end_date)
  })

  it('returns a list of itineraries', async () => {
    const response = await $fetch<ItinerariesResponse>('/api/itineraries')
    expect(response).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
    expect(response.data.length).toBe(3)
  })

  it('updates an itinerary', async () => {
    const updated = await fetch(`/api/itineraries/${itinerary3Id}`, {
      method: 'PATCH',
      body: JSON.stringify(itineraries[3]),
    })
    expect(updated.status).toBe(200)
    expect(updated).toBeDefined()

    const body = await updated.json() as ItineraryResponse
    expect(body.data.name).toBe(itineraries[3].name)
    expect(String(body.data.start_date).split('T')[0]).toBe(itineraries[3].start_date)
    expect(String(body.data.end_date).split('T')[0]).toBe(itineraries[3].end_date)
  })

  it('deletes an itinerary', async () => {
    const deleted = await fetch(`/api/itineraries/${itinerary1Id}`, { method: 'DELETE' })
    const deleted2 = await fetch(`/api/itineraries/${itinerary2Id}`, { method: 'DELETE' })
    const deleted3 = await fetch(`/api/itineraries/${itinerary3Id}`, { method: 'DELETE' })

    expect(deleted.status).toBe(204)
    expect(deleted2.status).toBe(204)
    expect(deleted3.status).toBe(204)
  })
})
