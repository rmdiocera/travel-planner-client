import { createFetch } from 'ofetch'

export type SavedApiSession = { cookies: [string, string][] } | { error: string }

declare module 'vitest' {
  export interface ProvidedContext {
    // Set by test/e2e/globalSetup.ts, which logs in once for the whole e2e run.
    apiSession: SavedApiSession
  }
}

// Vitest starts no test file, in any project, until the global setup's login settles. Without a limit,
// a backend that accepts connections but never answers would hold up the whole run.
const LOGIN_TIMEOUT_MS = 15_000

// Logs in to the Laravel API with a cookie session, as the browser does through nuxt-auth-sanctum.
// `fetch` returns the native Response; `$fetch` is ofetch on top of it (JSON bodies, params, FetchError).
export function createApiSession({ env = process.env, saved }: { env?: Partial<Record<string, string>>, saved?: SavedApiSession } = {}) {
  // `||`, not `??`: a blank value in .env falls back to the default too.
  const baseURL = env.E2E_API_BASE_URL || 'http://localhost'
  const origin = env.E2E_ORIGIN || 'http://localhost:3000'
  const cookies = new Map(saved && 'cookies' in saved ? saved.cookies : [])

  async function sessionFetch(input: RequestInfo | URL, init: RequestInit = {}) {
    const headers = new Headers(init.headers)
    headers.set('Accept', 'application/json')
    // Sanctum only treats requests from its stateful domains as cookie-authenticated.
    headers.set('Origin', origin)
    headers.set('Referer', `${origin}/`)

    if (cookies.size) {
      headers.set('Cookie', [...cookies].map(([name, value]) => `${name}=${value}`).join('; '))
    }

    const xsrfToken = cookies.get('XSRF-TOKEN')
    if (xsrfToken && (init.method ?? 'GET').toUpperCase() !== 'GET') {
      headers.set('X-XSRF-TOKEN', decodeURIComponent(xsrfToken))
    }

    // FormData bodies are left alone so fetch sets the multipart boundary.
    if (typeof init.body === 'string' && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const url = new URL(input instanceof Request ? input.url : input, baseURL)
    const response = await fetch(url, { ...init, headers })

    for (const cookie of response.headers.getSetCookie()) {
      const [pair = ''] = cookie.split(';')
      const separator = pair.indexOf('=')
      cookies.set(pair.slice(0, separator).trim(), pair.slice(separator + 1).trim())
    }

    return response
  }

  async function login() {
    const email = env.E2E_USER_EMAIL
    const password = env.E2E_USER_PASSWORD
    if (!email || !password) {
      throw new Error('Set E2E_USER_EMAIL and E2E_USER_PASSWORD (a verified user) to run the e2e tests.')
    }

    let response: Response
    try {
      await sessionFetch('/sanctum/csrf-cookie', { signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS) })
      response = await sessionFetch('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(LOGIN_TIMEOUT_MS),
      })
    }
    catch (error) {
      if (error instanceof Error && error.name === 'TimeoutError') {
        throw new Error(`E2E login got no answer from ${baseURL} within ${LOGIN_TIMEOUT_MS / 1000} s.`)
      }
      throw error
    }

    if (!response.ok) {
      throw new Error(`E2E login failed with status ${response.status}.`)
    }
  }

  // For test files: fails them with the reason the global setup couldn't log in.
  function ensureLoggedIn() {
    if (saved && 'error' in saved) {
      throw new Error(saved.error)
    }
  }

  return {
    login,
    ensureLoggedIn,
    cookies: () => [...cookies],
    fetch: sessionFetch,
    $fetch: createFetch({ fetch: sessionFetch }),
  }
}
