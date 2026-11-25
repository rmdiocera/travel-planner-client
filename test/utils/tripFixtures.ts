import type { NestedPlace } from '../../app/types/place'
import type { Spot } from '../../app/types/spot'

export function makePlace(overrides: Partial<NestedPlace> = {}): NestedPlace {
  return {
    id: 'p1',
    name: 'Senso-ji',
    details: '',
    address: '',
    country: 'Japan',
    city: 'Tokyo',
    website: null,
    phone: null,
    images: [],
    ...overrides,
  }
}

export function makeSpot(id: string, date: string, overrides: Partial<Spot> = {}): Spot {
  return {
    id,
    itinerary_id: 't1',
    place_id: `p-${id}`,
    place: makePlace({ id: `p-${id}`, name: `Place ${id}` }),
    visit_date: `${date}T00:00:00.000000Z`,
    start_time: null,
    end_time: null,
    marked_visited: false,
    sort_order: 1,
    ...overrides,
  }
}
