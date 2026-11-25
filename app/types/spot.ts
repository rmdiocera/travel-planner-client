import type { NestedPlace } from './place'

// The API's "spot" is a stop in the glossary: a place on a day of a trip.
export type Spot = {
  id: string
  itinerary_id: string
  place_id: string
  place: NestedPlace
  // A datetime ("2027-03-13T00:00:00.000000Z"). Use visitDate() for the day.
  visit_date: string
  // "HH:MM:SS" in responses; requests take "HH:MM".
  start_time: string | null
  end_time: string | null
  marked_visited: boolean
  sort_order: number
}

export type SpotResponse = {
  data: Spot
}

// Keys are "YYYY-MM-DD". With no stops at all the API sends [] instead of {}.
export type SpotsGroupedResponse = {
  data: Record<string, Spot[]> | []
}
