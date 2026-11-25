import type { InjectionKey } from 'vue'
import type { Spot } from '~/types/spot'

// What a component deep in the trip page can ask the page to open, without passing events up through every level.
export type DayPickerRequest = { mode: 'move', stop: Spot }

export type TripDialogs = {
  openDayPicker: (request: DayPickerRequest) => void
}

export const tripDialogsKey: InjectionKey<TripDialogs> = Symbol('tripDialogs')

export function injectTripDialogs(): TripDialogs {
  const dialogs = inject(tripDialogsKey)
  if (!dialogs) {
    throw new Error('tripDialogs was not provided')
  }
  return dialogs
}
