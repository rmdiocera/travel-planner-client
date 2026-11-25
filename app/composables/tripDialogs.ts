import type { InjectionKey } from 'vue'
import type { ItineraryList } from '~/types/list'
import type { Spot } from '~/types/spot'

// What a component deep in the trip page can ask the page to open, without passing events up through every level.
// 'move' picks a new day for a stop; 'add' picks a day to put a list place on.
export type DayPickerRequest
  = | { mode: 'move', stop: Spot }
    | { mode: 'add', placeId: string, placeName: string }

export type TripDialogs = {
  openDayPicker: (request: DayPickerRequest) => void
  // The place search for a list. A day's search opens from the day card's own event.
  openPlaceSearch: (target: { kind: 'list', list: ItineraryList }) => void
}

export const tripDialogsKey: InjectionKey<TripDialogs> = Symbol('tripDialogs')

export function injectTripDialogs(): TripDialogs {
  const dialogs = inject(tripDialogsKey)
  if (!dialogs) {
    throw new Error('tripDialogs was not provided')
  }
  return dialogs
}

// Deleting something in the lists column asks first, in one confirmation the column owns.
export type ConfirmDeleteRequest = {
  title: string
  body: string
  run: () => Promise<unknown>
}

export const confirmDeleteKey: InjectionKey<(request: ConfirmDeleteRequest) => void> = Symbol('confirmDelete')

export function injectConfirmDelete() {
  const confirmDelete = inject(confirmDeleteKey)
  if (!confirmDelete) {
    throw new Error('confirmDelete was not provided')
  }
  return confirmDelete
}
