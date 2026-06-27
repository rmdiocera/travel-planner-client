export default defineNuxtConfig({
  modules: ['@nuxt/ui', '@nuxt/eslint', '@nuxt/test-utils/module'],
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
})
