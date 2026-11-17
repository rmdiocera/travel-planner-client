// Laravel answers 419 when the XSRF-TOKEN cookie no longer matches the session, for example after the backend lost
// its sessions. The 419 brings no new token, and nuxt-auth-sanctum only fetches one when the cookie is missing, so
// every later try would fail the same way. Fetching a new one here lets the next try through.
export default defineNuxtPlugin((nuxtApp) => {
  // The module's client calls this hook after every response from Laravel, errors included.
  nuxtApp.hook('sanctum:response', async (_app, context) => {
    if (context.response?.status !== 419) {
      return
    }
    try {
      await nuxtApp.runWithContext(() => useSanctumClient()('/sanctum/csrf-cookie'))
    }
    catch {
      // The caller still gets its 419. If this failed too, the next 419 tries again.
    }
  })
})
