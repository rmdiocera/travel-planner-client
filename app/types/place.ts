import type { Tag } from './tag'
import type { Image } from './image'

export type Place = {
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

export type PlacesResponse = {
  data: Place[]
}

export type PlaceResponse = {
  data: Place
}
