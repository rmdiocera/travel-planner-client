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
    apiKey: '',
    public: {
      apiBaseUrl: '',
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
  sanctum: {
    mode: 'cookie',
    origin: 'http://localhost:3000',
    baseUrl: 'http://localhost:80',
    endpoints: {
      user: 'api/v1/user'
    }
  },
})