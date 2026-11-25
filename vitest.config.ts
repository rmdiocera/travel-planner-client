import { defineConfig } from 'vitest/config'
import { defineVitestProject } from '@nuxt/test-utils/config'
import tsConfigPaths from 'vite-tsconfig-paths'
import vue from '@vitejs/plugin-vue'
import { loadE2eEnv } from './test/utils/loadE2eEnv'

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
          env: loadE2eEnv(),
          globalSetup: ['test/e2e/globalSetup.ts'],
          // Some files count the user's trips or places, so a file that creates both can't run beside them.
          fileParallelism: false,
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
          setupFiles: ['test/nuxt/setup.ts'],
          // Each test file starts Nuxt in a beforeAll hook. That can take longer than Vitest's default 10 s,
          // and took over 30 s for some files in a slow full run (see CLAUDE.md Gotchas).
          hookTimeout: 60000,
        },
      }),
    ],
  },
})
