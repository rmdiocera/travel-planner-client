export type Image = {
  id: number
  path: string
}

// An image as spots and list place items nest it: `url` is absolute and usable as an <img src>.
export type PlaceImage = Image & {
  place_id: string
  url: string
}
