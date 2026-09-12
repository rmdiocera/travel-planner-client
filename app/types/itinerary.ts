export type Itinerary = {
  id: string
  name: string
  start_date: Date
  end_date: Date
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
  }
}