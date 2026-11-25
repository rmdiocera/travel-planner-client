export type Itinerary = {
  id: string
  name: string
  // "YYYY-MM-DD". Both are null for an unscheduled trip, one that has no dates yet.
  start_date: string | null
  end_date: string | null
}

export type ItineraryResponse = {
  data: Itinerary
}

export type ItinerariesResponse = {
  data: Itinerary[]
}

export type ItinerariesGroupedResponse = {
  data: {
    past: Itinerary[]
    ongoing: Itinerary[]
    upcoming: Itinerary[]
    // Trips without dates. Optional, so a backend that doesn't send it yet still works.
    unscheduled?: Itinerary[]
  }
}
