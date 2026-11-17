<script setup lang="ts">
import { useWindowFocus } from '@vueuse/core'
import type { User } from '~/types/user'

definePageMeta({
  layout: false,
})

const user = useSanctumUser<User>()
const { refreshIdentity, logout } = useSanctumAuth()
const client = useSanctumClient()
const { showToast } = useAppToast()
const { showVerified } = useVerificationToast()

const { remainingSeconds, isReady, start } = useResendCooldown(user.value?.id ?? '')

const resendButton = useTemplateRef('resendButton')

// An alert about the resend cooldown clears when it ends; other errors stay until the next resend.
const feedback = ref<{ color: 'success' | 'info' | 'error', icon: string, title: string, endsWithCooldown?: boolean } | null>(null)
const isSending = ref(false)
const hasCountdownEnded = ref(false)

const isCoolingDown = computed(() => remainingSeconds.value > 0)

// Text for the status region beside the button, which is on the page from the start: screen readers read out a
// change to it, but often not a message that appears together with its own region, as the alert does.
// Errors are left to the alert, whose role="alert" is read out as soon as it appears.
const announcement = computed(() => {
  if (feedback.value && feedback.value.color !== 'error') {
    return feedback.value.title
  }
  return hasCountdownEnded.value ? 'You can resend now.' : ''
})

watch(remainingSeconds, (current) => {
  hasCountdownEnded.value = current === 0
  if (current === 0 && feedback.value?.endsWithCooldown) {
    feedback.value = null
  }
})

function showError() {
  feedback.value = { color: 'error', icon: 'i-lucide-circle-alert', title: 'Something went wrong. Try again in a moment.' }
}

// The focus check and Resend's 204 can both find the user verified; only the first one leaves.
let isLeaving = false

async function leaveVerified() {
  if (isLeaving) {
    return
  }
  isLeaving = true
  showVerified()
  await navigateTo('/')
}

async function checkVerified() {
  try {
    await refreshIdentity()
  }
  catch (error: any) {
    if ((error?.response?.status ?? error?.statusCode) === 401) {
      await navigateTo('/login')
    }
    return
  }

  if (user.value?.email_verified_at) {
    await leaveVerified()
  }
}

// Verifying on another device or tab leaves this page stale; look again when the user comes back to it.
watch(useWindowFocus(), (focused) => {
  if (focused) {
    void checkVerified()
  }
})

async function resend() {
  if (isSending.value || isCoolingDown.value || !isReady.value) {
    return
  }

  // Loading disables the button, which takes keyboard focus off it; it gets focus back once the result is in.
  const focusedButton: HTMLElement | null = resendButton.value?.$el === document.activeElement ? resendButton.value?.$el : null
  isSending.value = true
  feedback.value = null

  try {
    const response = await client.raw('/email/verification-notification', { method: 'POST', ignoreResponseError: true })

    switch (response.status) {
      case 202:
        feedback.value = { color: 'success', icon: 'i-lucide-circle-check', title: 'Verification email sent. Check your inbox.', endsWithCooldown: true }
        start()
        break
      case 204:
        try {
          await refreshIdentity()
        }
        catch {
          // Without the fresh user, the redirect rule would send a client-side navigation straight back here.
          // A full load of the verified landing reads the user again and shows the toast.
          await navigateTo('/?verified=1', { external: true })
          break
        }
        await leaveVerified()
        break
      case 429:
        start(Number.parseInt(response.headers.get('Retry-After') ?? '', 10))
        feedback.value = { color: 'info', icon: 'i-lucide-info', title: 'A verification email was sent recently. Try again later.', endsWithCooldown: true }
        break
      case 401:
        // ignoreResponseError skips the module's own 401 handling, so end the session here;
        // otherwise the redirect rule sends /login straight back to /verify-email.
        user.value = null
        showToast('Your session has expired.', 'i-lucide-circle-x', 'Log in to continue.', 'error')
        await navigateTo('/login')
        break
      default:
        if (response.status >= 500) {
          // The server counts a failed send towards its resend cooldown, so wait as long as it will.
          feedback.value = { color: 'error', icon: 'i-lucide-circle-alert', title: 'We couldn\'t send the verification email. Try again when the countdown ends.', endsWithCooldown: true }
          start()
        }
        else {
          showError()
        }
    }
  }
  catch {
    showError()
  }
  finally {
    isSending.value = false
    if (focusedButton) {
      await nextTick()
      // Unless the user has put focus somewhere else in the meantime.
      if (document.activeElement === document.body) {
        focusedButton.focus()
      }
    }
  }
}

async function handleLogout() {
  try {
    await logout()
  }
  catch (error: any) {
    if ((error?.response?.status ?? error?.statusCode) !== 401) {
      showError()
      return
    }
    // The session is already gone on the server, so there is nothing left to end.
    user.value = null
    await navigateTo('/login')
  }
}
</script>

<template>
  <NuxtLayout name="auth">
    <div class="w-full max-w-sm grid gap-4">
      <UCard>
        <div class="grid gap-6 text-center">
          <UIcon
            name="i-lucide-mail"
            class="size-10 text-primary mx-auto"
          />

          <div class="grid gap-2">
            <h1 class="text-xl font-semibold">
              Check your email
            </h1>
            <p class="text-muted">
              We sent a verification link to <strong>{{ user?.email }}</strong>. Click it to verify your account.
            </p>
          </div>

          <UAlert
            v-if="feedback"
            :color="feedback.color"
            variant="subtle"
            :icon="feedback.icon"
            :title="feedback.title"
            :role="feedback.color === 'error' ? 'alert' : undefined"
            data-testid="verify-alert"
          />

          <div class="grid gap-2">
            <!-- aria-disabled rather than disabled, so the button keeps keyboard focus through the countdown;
                 resend() ignores clicks until it ends. -->
            <UButton
              ref="resendButton"
              block
              label="Resend email"
              :loading="isSending"
              :aria-disabled="!isReady || isCoolingDown ? 'true' : undefined"
              :ui="{ base: 'dark:text-white' }"
              data-testid="verify-resend-btn"
              @click="resend"
            />
            <p
              v-if="isCoolingDown"
              class="text-xs text-muted"
              data-testid="verify-cooldown-text"
            >
              Try again in {{ formatCountdown(remainingSeconds) }}
            </p>
            <span
              role="status"
              class="sr-only"
              data-testid="verify-resend-announcement"
            >{{ announcement }}</span>
          </div>

          <UButton
            variant="link"
            color="neutral"
            label="Log out"
            class="justify-self-center"
            data-testid="verify-logout-btn"
            @click="handleLogout"
          />
        </div>
      </UCard>
    </div>
  </NuxtLayout>
</template>
