import type { Tag } from './tag'
import type { Image, PlaceImage } from './image'

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

// A place as spots and list items nest it: no tags, and `images` is always there, in upload order, [] when none.
export type NestedPlace = {
  id: string
  name: string
  details: string
  address: string
  country: string
  city: string
  website: string | null
  phone: string | null
  images: PlaceImage[]
}

export type PlacesResponse = {
  data: Place[]
}

export type PlaceResponse = {
  data: Place
}
