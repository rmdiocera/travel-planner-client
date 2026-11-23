import { tryOnMounted, useNow, useStorage } from '@vueuse/core'

export const RESEND_COOLDOWN_SECONDS = 300

export function formatCountdown(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function useResendCooldown(userId: string) {
  const storage = getLocalStorage()
  const endsAt: Ref<number> = storage
    ? useStorage<number>(`dayfarer:resend-cooldown:${userId}`, 0, storage, { initOnMounted: true })
    : ref(0)

  const isReady = ref(false)
  tryOnMounted(() => {
    isReady.value = true
  })

  const now = useNow({ interval: 1000 })

  const remainingSeconds = computed(() => {
    const end = Number(endsAt.value)
    if (!Number.isFinite(end)) {
      return 0
    }
    const current = now.value.getTime()
    const cappedEnd = Math.min(end, current + RESEND_COOLDOWN_SECONDS * 1000)
    return Math.max(0, Math.ceil((cappedEnd - current) / 1000))
  })

  // A stored end time more than five minutes away (a skewed clock, or a clock that moved back after start)
  // would pin the label at 5:00 and keep the button disabled far longer, so cut the stored value back.
  watch([endsAt, now], () => {
    const end = Number(endsAt.value)
    const limit = Date.now() + RESEND_COOLDOWN_SECONDS * 1000
    if (Number.isFinite(end) && end > limit) {
      endsAt.value = limit
    }
  }, { immediate: true })

  function start(seconds: number = RESEND_COOLDOWN_SECONDS) {
    const clamped = Number.isFinite(seconds)
      ? Math.min(RESEND_COOLDOWN_SECONDS, Math.max(1, Math.ceil(seconds)))
      : RESEND_COOLDOWN_SECONDS
    endsAt.value = Date.now() + clamped * 1000
  }

  return { remainingSeconds, isReady: readonly(isReady), start }
}
