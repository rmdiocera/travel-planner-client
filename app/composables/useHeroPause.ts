import { useStorage } from '@vueuse/core'

// Whether the Guest paused the Welcome page's hero animation, remembered in this browser.
export function useHeroPause() {
  const storage = getLocalStorage()
  const paused: Ref<boolean> = storage
    ? useStorage<boolean>('dayfarer:hero-paused', false, storage, { initOnMounted: true })
    : ref(false)

  return {
    paused: readonly(paused),
    setPaused(value: boolean) {
      paused.value = value
    },
  }
}
