// A Google Maps search for a place by its name and address. It needs no coordinates, and opens the maps app on a phone.
export function mapsUrl(place: { name: string, address: string }): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${place.name}, ${place.address}`)}`
}

// Websites are stored as typed, so a bare domain gets a protocol.
export function websiteHref(website: string): string {
  return /^https?:\/\//.test(website) ? website : `https://${website}`
}
