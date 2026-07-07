import { fetch, setup, $fetch } from '@nuxt/test-utils/e2e'
import { readFileSync } from 'fs'
import { FetchError } from 'ofetch'
import { resolve } from 'path'
import { describe, it, expect, beforeAll } from 'vitest'

type Place = {
  id: string
  name: string
  address: string
  country: string
  city: string
  website: string
  phone: string
  details: string
  tags: Tag[]
  images: Image[]
}

type PlacesResponse = {
  data: Place[]
}

type PlaceResponse = {
  data: Place
}

type Tag = {
  id: number
  name: string
}

type Image = {
  id: number
  path: string
}

let place1Id: string
let place2Id: string
let place3Id: string

describe('Places API', async () => {
  await setup()

  const places = [
    {
      name: 'Tsūtenkaku',
      details: 'Tsūtenkaku is a tower and landmark of Osaka, Japan.',
      address: '1 Chome-18-6 Ebisuhigashi, Naniwa Ward, Osaka, 556-0002, Japan',
      country: 'Japan',
      city: 'Osaka',
      website: 'https://www.tsutenkaku.co.jp',
      phone: '+81 6-6641-9555',
      tags: [
        5,
        10,
      ],
    },
    {
      name: 'Nagashima Spa Land',
      details: 'Nagashima Spa Land is an amusement park and vacation resort in Kuwana, Mie, Japan.',
      address: '333 Nagashimacho Urayasu, Kuwana, Mie 511-1192, Japan',
      country: 'Japan',
      city: 'Nagoya',
      website: 'https://www.nagashima-onsen.co.jp/index.html',
      phone: '+81 594-45-1111',
      tags: [
        4,
      ],
    },
    {
      name: 'Osaka Castle',
      details: 'Osaka Castle is a historic castle located in Chūō-ku, Osaka, Japan.',
      address: '1-1 Osakajo, Chuo Ward, Osaka City, Osaka Prefecture 540-0002, Japan',
      country: 'Japan',
      city: 'Osaka',
      website: 'https://www.osakacastle.net/',
      phone: '+81 594-45-3333',
      tags: [
        5,
        6,
        10,
      ],
    },
    {
      name: 'Fushimi Inari Taisha',
      details: 'Fushimi Inari Taisha is the head shrine of the god Inari, located in Fushimi Ward, Kyoto, Japan.',
      address: '68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto, 612-0882, Japan',
      country: 'Japan',
      city: 'Kyoto',
      website: 'https://inari.jp/',
      phone: '+81 594-45-2222',
      tags: [
        6,
        10,
      ],
    },
  ]

  beforeAll(async () => {
    const formData = new FormData()
    const formData2 = new FormData()

    formData.append('name', places[0].name)
    formData.append('address', places[0].address)
    formData.append('city', places[0].city)
    formData.append('country', places[0].country)
    formData.append('details', places[0].details)

    formData2.append('name', places[1].name)
    formData2.append('address', places[1].address)
    formData2.append('city', places[1].city)
    formData2.append('country', places[1].country)
    formData2.append('details', places[1].details)

    try {
      const place1 = await fetch('/api/places', { method: 'POST', body: formData })
      const place2 = await fetch('/api/places', { method: 'POST', body: formData2 })

      const place1Body = await place1.json() as PlaceResponse
      const place2Body = await place2.json() as PlaceResponse

      place1Id = place1Body.data.id
      place2Id = place2Body.data.id
    }
    catch (error) {
      if (error instanceof FetchError) {
        console.log(error.data)
        console.log(error.status)
      }
    }
  })

  it('creates a place', async () => {
    const formData = new FormData()

    const imageBuffers = [
      readFileSync(resolve(__dirname, '../fixtures/oc1.jpg')),
      readFileSync(resolve(__dirname, '../fixtures/oc2.png')),
      readFileSync(resolve(__dirname, '../fixtures/oc3.webp')),
    ]

    const images = [
      new File([imageBuffers[0]], 'oc1.jpg', { type: 'image/jpeg' }),
      new File([imageBuffers[1]], 'oc2.png', { type: 'image/png' }),
      new File([imageBuffers[2]], 'oc3.webp', { type: 'image/webp' }),
    ]

    formData.append('name', places[2].name)
    formData.append('address', places[2].address)
    formData.append('city', places[2].city)
    formData.append('country', places[2].country)
    formData.append('website', places[2].website)
    formData.append('phone', places[2].phone)
    formData.append('details', places[2].details)

    places[2].tags.forEach((tag, index) => {
      formData.append(`tags[${index}]`, tag.toString())
    })

    images.forEach((image, index) => {
      formData.append(`images[${index}]`, image)
    })

    const created = await fetch('/api/places', {
      method: 'POST',
      body: formData,
    })
    expect(created.status).toBe(201)
    expect(created).toBeDefined()

    const body = await created.json() as PlaceResponse
    expect(body.data.name).toBe(places[2].name)
    expect(body.data.address).toBe(places[2].address)
    expect(body.data.city).toBe(places[2].city)
    expect(body.data.country).toBe(places[2].country)
    expect(body.data.website).toBe(places[2].website)
    expect(body.data.phone).toBe(places[2].phone)
    expect(body.data.details).toBe(places[2].details)

    expect(body.data.tags).toHaveLength(3)
    expect(body.data.tags[0].id).toBe(places[2].tags[0])
    expect(body.data.tags[1].id).toBe(places[2].tags[1])
    expect(body.data.tags[2].id).toBe(places[2].tags[2])

    expect(body.data.images).toHaveLength(3)

    const place = await fetch(`/api/places/${body.data.id}`)
    expect(place.status).toBe(200)

    const place_body = await place.json() as PlaceResponse
    expect(place_body.data.id).toBe(body.data.id)

    place3Id = body.data.id
  })

  it('retrieves a place by id', async () => {
    const response = await fetch(`/api/places/${place3Id}`)
    expect(response.status).toBe(200)

    const body = await response.json() as PlaceResponse
    expect(body.data.id).toBe(place3Id)
    expect(body.data.name).toBe(places[2].name)
    expect(body.data.address).toBe(places[2].address)
    expect(body.data.city).toBe(places[2].city)
    expect(body.data.country).toBe(places[2].country)
    expect(body.data.website).toBe(places[2].website)
    expect(body.data.phone).toBe(places[2].phone)
    expect(body.data.details).toBe(places[2].details)
  })

  it('returns a list of places', async () => {
    const response = await $fetch<PlacesResponse>('/api/places')
    expect(response).toBeDefined()
    expect(Array.isArray(response.data)).toBe(true)
    expect(response.data.length).toBe(3)
  })

  it('updates a place', async () => {
    const updated = await fetch(`/api/places/${place3Id}`, {
      method: 'PATCH',
      body: JSON.stringify(places[3]),
    })
    expect(updated.status).toBe(200)
    expect(updated).toBeDefined()

    const body = await updated.json() as PlaceResponse
    expect(body.data.name).toBe(places[3].name)
    expect(body.data.address).toBe(places[3].address)
    expect(body.data.city).toBe(places[3].city)
    expect(body.data.country).toBe(places[3].country)
    expect(body.data.website).toBe(places[3].website)
    expect(body.data.phone).toBe(places[3].phone)
    expect(body.data.details).toBe(places[3].details)
  })

  it('deletes a place', async () => {
    const deleted = await fetch(`/api/places/${place1Id}`, { method: 'DELETE' })
    const deleted2 = await fetch(`/api/places/${place2Id}`, { method: 'DELETE' })
    const deleted3 = await fetch(`/api/places/${place3Id}`, { method: 'DELETE' })

    expect(deleted.status).toBe(204)
    expect(deleted2.status).toBe(204)
    expect(deleted3.status).toBe(204)
  })
})
