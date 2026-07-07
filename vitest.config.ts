import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import tsConfigPaths from 'vite-tsconfig-paths'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [tsConfigPaths(), vue()],
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          include: ['test/unit/**/*.{test,spec}.ts'],
          environment: 'node',
        },
      },
      {
        test: {
          name: 'e2e',
          include: ['test/e2e/*.{test,spec}.ts'],
          environment: 'node',
          hookTimeout: 30000,
          testTimeout: 30000,
        },
      },
      await defineVitestProject({
        plugins: [
          {
            name: 'ignore-bun-test',
            enforce: 'pre',
            resolveId(id) {
              if (id === 'bun:test') {
                return { id: 'bun:test', external: true }
              }
            },
          },
        ],
        test: {
          name: 'nuxt',
          include: ['test/nuxt/**/*.{test,spec}.ts'],
          environment: 'nuxt',
        },
      }),
    ],
  },
})
