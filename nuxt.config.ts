export default defineNuxtConfig({
  modules: [
    '@nuxt/ui',
    '@nuxt/eslint',
    '@nuxt/test-utils/module',
    '@nuxt/image',
    '@nuxt/fonts',
    'nuxt-auth-sanctum',
  ],
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      // The app's own address, for absolute URLs such as og:image. Set NUXT_PUBLIC_SITE_URL in deployment.
      siteUrl: 'http://localhost:3000',
    },
  },
  srcDir: 'app/',
  serverDir: 'app/server',
  compatibilityDate: '2025-07-15',
  eslint: {
    config: {
      stylistic: true,
    },
  },
  fonts: {
    families: [
      // Load Fraunces' optical-size axis, so the hero's 14px names can use 'opsz' 14.
      { name: 'Fraunces', provider: 'google', weights: [600], providerOptions: { google: { experimental: { variableAxis: { opsz: [['9', '144']] } } } } },
    ],
  },
  sanctum: {
    mode: 'cookie',
    origin: 'http://localhost:3000',
    baseUrl: 'http://localhost:80',
    redirectIfUnauthenticated: true,
    endpoints: {
      user: 'api/v1/user',
    },
  },
})
