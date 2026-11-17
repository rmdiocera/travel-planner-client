import type { User } from '~/types/user'

export default defineNuxtRouteMiddleware((to) => {
  // Middleware runs on the server and again at hydration; the toast belongs to the browser.
  if (import.meta.server) {
    return
  }

  const flag = to.query.verified
  if (flag !== '1' && flag !== '0') {
    return
  }

  const user = useSanctumUser<User>()
  const { showVerified, showInvalidLink } = useVerificationToast()

  function notify() {
    if (flag === '1') {
      if (!user.value) {
        showVerified('Log in to continue.')
      }
      else if (user.value.email_verified_at) {
        showVerified()
      }
    }
    else if (!user.value) {
      showInvalidLink('Log in to request a new one.')
    }
    else if (user.value.email_verified_at) {
      showInvalidLink()
    }
    else {
      showInvalidLink('Press Resend email to get a new one.')
    }
  }

  // A toast added while the app is still hydrating renders on the client but not in the server HTML,
  // which Vue reports as a hydration mismatch. The URL is cleaned straight away; only the toast waits.
  const nuxtApp = useNuxtApp()
  if (nuxtApp.isHydrating) {
    nuxtApp.hooks.hookOnce('app:suspense:resolve', notify)
  }
  else {
    notify()
  }

  const query = { ...to.query }
  delete query.verified
  return navigateTo({ path: to.path, query }, { replace: true })
})
