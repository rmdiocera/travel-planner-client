# CLAUDE.md

Guidance for working in this repo. Update it when conventions change.

## What this is

**Dayfarer** — the Nuxt 4 / Vue 3 frontend for a travel planner. It talks to a separate **Laravel API** (`/api/v1/...`, Laravel Sanctum auth) that is not in this repo. Users manage **itineraries** (grouped as past / ongoing / upcoming); **places** (with tags and images) are managed from an admin page.

Stack: Nuxt 4 (`srcDir: 'app/'`), Nuxt UI 4 (Tailwind 4), `@nuxt/image`, `@nuxt/fonts`, `nuxt-auth-sanctum`, VueUse, `@internationalized/date`, ESLint (`@nuxt/eslint`, stylistic on), Vitest.

## Commands

```bash
npm run dev          # http://localhost:3000
npm run build | generate | preview
npm run lint         # eslint .   (lint:fix to autofix)
npm test             # vitest (watch)
npm run test:run     # vitest run
npx vitest run --project nuxt                    # component/page tests only
npx vitest run --project e2e                     # needs the Laravel API running
npx vitest run test/nuxt/pages/index.test.ts     # single file
```

`.env` (gitignored) must define `NUXT_API_KEY` (Bearer token used by the Nitro proxy) and `NUXT_PUBLIC_API_BASE_URL` (Laravel base URL). It also sets `NODE_TLS_REJECT_UNAUTHORIZED` for local HTTPS. Never print or commit these values.

## Layout

```
app/
  app.vue                  UApp > NuxtPage
  app.config.ts            Nuxt UI theme (primary = teal, input/formField slot overrides)
  assets/css/main.css      Tailwind + Nuxt UI imports, DM Sans, .itinerary-heading, .dayfarer-brand (Fraunces)
  layouts/home.vue         Header (brand, nav, user dropdown w/ logout) + UContainer + <slot />
  pages/                   index.vue (itineraries), admin/index.vue (add a place); login.vue, places.vue (WIP, untracked)
  components/
    itinerary/             Form.vue, Grid.vue, GridSkeleton.vue
    ui/                    Thin wrappers over Nuxt UI: Modal, Slideover, ConfirmModal, EmptyState
    FormActions.vue        Currently unused
  composables/useAppToast.ts   showToast(title, icon, description?, color?)
  utils/date.ts            formatStartEndDate, dateDiffInDays, toCalendarDate (auto-imported)
  types/                   itinerary.ts, place.ts, tag.ts, image.ts (+ API response wrapper types)
  server/api/              Nitro proxy routes to the Laravel API (serverDir is app/server)
test/
  e2e/                     Hit real Nitro routes -> real Laravel API
  nuxt/                    Component + page tests (nuxt environment, happy-dom)
  utils/                   mountXxx helpers
  fixtures/                Sample images for upload tests
```

## Architecture

### Auth and API access: `nuxt-auth-sanctum` is the default

`nuxt-auth-sanctum` (cookie mode) is the standard going forward. The branch `refactor/change-auth-from-token-to-cookie` is converting the old shared-bearer-token flow, and modifications are ongoing, so some code still uses the legacy path. Both currently coexist:

1. **Nitro proxy (legacy, token, being phased out)** — `app/server/api/**`. Each handler reads `useRuntimeConfig()` and forwards to `${config.public.apiBaseUrl}/api/v1/...` with `Authorization: Bearer ${config.apiKey}`. Client code calls these with `$fetch('/api/itineraries', ...)` / `useFetch('/api/tags')`. Used today for all **mutations** (itinerary POST/PATCH/DELETE, place POST), `tags`, and `countries` (local `@countrystatecity/countries`, not proxied).
2. **`nuxt-auth-sanctum` (default, cookie)** — configured in `nuxt.config.ts` (`mode: 'cookie'`, `origin` localhost:3000, `baseUrl` localhost:80, user endpoint `api/v1/user`). Used via `useSanctumAuth()` (`user`, `logout`), `useSanctumUser()`, and `useLazySanctumFetch('/api/v1/itineraries', { params: { grouped: true } })` in `pages/index.vue`.

For all new code, use the Sanctum path (`useSanctumFetch` / `useLazySanctumFetch` / `useSanctumClient` straight to `/api/v1/...`) and do not add new Nitro proxy routes. The legacy proxy routes and `apiKey` are slated for replacement; treat them as code being migrated, not as a pattern to copy. The user is converting these themselves, so don't rewrite them unprompted.

Proxy handler conventions: one file per verb (`name.get.ts`, `name.post.ts`, `[id].patch.ts`), `defineEventHandler`, `getQuery` / `getRouterParam` / `readBody` (`readFormData` for multipart). POST handlers use `$fetch.raw` and `setResponseStatus(event, response.status)` to preserve 201.

### API shapes

Responses are Laravel resources wrapped in `{ data: ... }`. Types live in `app/types/` (`ItineraryResponse`, `ItinerariesGroupedResponse`, `PlacesResponse`, `TagsResponse`, ...). Dates are `YYYY-MM-DD` strings in practice even though `Itinerary.start_date/end_date` are typed `Date` — wrap with `new Date(...)` before formatting, as existing code does. Validation errors (422) arrive at `error.data.data.errors` as `{ field: string[] }`.

### Pages, layouts, state

- `pages/index.vue` sets `definePageMeta({ layout: false })` and wraps itself in `<NuxtLayout name="home">`. It renders "not logged in" when `useSanctumUser()` is empty.
- All state is local `ref`s in the page; no Pinia/store. `Grid`/`Form` communicate upward through emits (`isModalOpen`, `isSlideoverOpen`, `isConfirmModalOpen`, `isEditing`, `selectedItinerary`, `itineraryCreated`, `itineraryUpdated`, `loading`), and the page mutates the fetched `itineraries` data locally (insert into the right bucket, splice on delete) rather than refetching. `reorderItineraries()` reassigns the object to force reactivity/ordering.
- Responsive pattern: `useWindowSize` + `isMobile = width < 768`. Desktop uses `ui/Modal`, mobile uses `ui/Slideover` (`side="bottom"`) with the same `ItineraryForm`. Both are inside `<ClientOnly>`. Buttons exist in desktop/mobile variants with different `data-testid`s.
- Forms: `UForm` with `:state`, `@submit`; parent triggers submit through an exposed `triggerSubmit()` (`defineExpose`) that calls `formRef.submit()`. Server validation errors are pushed back with `formRef.setErrors([...])`; any other failure shows an error toast. Create/edit share one form component keyed off `selectedItinerary`.
- Feedback: `useAppToast().showToast(...)` — success uses `i-lucide-circle-check`; failure uses `'Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error'`. Tests assert these exact strings.
- Loading/error UX: `GridSkeleton` while pending, `EmptyState` with "Try again" (calls `refresh()`) on error, `EmptyState` for no data.
- Past itineraries are read-only: Edit is disabled when `end_date < today`, and the Past grid isn't wired to edit/delete handlers.
- Itinerary images are currently a hard-coded `/oc1.jpg` from `public/` via `NuxtImg`.

## Docs lookup (MCP)

Two remote MCP servers are configured for this project (`nuxt-ui-remote`, `nuxt-remote`). Their tools only load in a fresh session. If they aren't available, say so and fall back to fetching the docs rather than guessing.

- **Nuxt UI MCP** (`https://ui.nuxt.com/mcp`): check it before using a component, prop, slot, or theme/`:ui` key you aren't certain about, and before editing `app.config.ts`. Installed version is Nuxt UI 4.x.
- **Nuxt MCP** (`https://nuxt.com/mcp`): check it for framework and module questions (Nuxt 4 directory structure, composables, `nuxt.config`, `@nuxt/image`, `@nuxt/fonts`, `@nuxt/eslint`).
- Neither covers `nuxt-auth-sanctum` (third-party); use its own docs.

## Code style

- `<script setup lang="ts">`. Block order is not uniform (`<template>` first in pages, `<script>` first in components) — follow the file you're editing.
- Auto-imports are used for Vue/Nuxt APIs and `app/utils`, `app/composables`; components are also referenced via explicit imports in pages (`@/components/...` or `~/components/...`) — both aliases occur, keep the surrounding file's style.
- Use `import type` for types; shared types go in `app/types/`, not inline in components.
- Keep `components/ui/` wrappers logic-free — they only forward `v-model:open` (via `defineModel`) and expose `button` / `form` / `action` slots, plus a `data-testid` close button (`close-modal-btn`, `close-slideover-btn`, `close-confirm-modal-btn`).
- Stylistic ESLint is enforced: no semicolons, single quotes, 2-space indent, trailing commas, `1tbs` braces with `catch`/`finally` on a new line (`}\n catch {`), consistent quote-props. `no-explicit-any` and `no-multiple-template-root` are off. Run `npm run lint` before finishing.
- Naming: use camelCase for local variables, refs, functions and params, and PascalCase for components (prefer the Nuxt auto-name, e.g. `ItineraryGrid`). Keep snake_case only for API payload/response fields (`start_date`, `end_date`). Older code deviates (`country_names`, `selected_tags`, `new_itinerary`, `old_itinerary`, snake_case params in `utils/date.ts`, `Grid` imported as a bare name in `pages/index.vue`); don't copy those, and don't rename them unless asked.
- Tailwind utility classes inline; theme tokens (`text-primary`, `text-muted`, `text-dimmed`, `bg-neutral-*`) with `dark:` variants. Primary buttons commonly add `:ui="{ base: 'dark:text-white' }"`. Empty fields use `variant="subtle"`, filled use `outline`. Icons are Lucide (`i-lucide-*`).
- Add `data-testid` to any interactive element tests need.

## Testing

Vitest with three projects (`vitest.config.ts`):

| Project | Include | Env | Notes |
|---|---|---|---|
| `unit` | `test/unit/**` | node | Directory doesn't exist yet |
| `e2e` | `test/e2e/*.test.ts` | node | `setup()` from `@nuxt/test-utils/e2e` boots Nuxt; calls the **real Laravel API** via the proxy routes, so it needs the backend + `.env`. Creates and deletes its own data. 30s timeouts. |
| `nuxt` | `test/nuxt/**` | nuxt (happy-dom) | Component/page tests with `mountSuspended` |

Conventions in `test/nuxt`:
- Mount through helpers in `test/utils/` (`mountIndexPage`, `mountAdminPage`, `mountModal`, `mountSlideover`): they `mountSuspended`, register `onTestFinished(() => wrapper.unmount())`, and return `{ wrapper, bodyWrapper }` where `bodyWrapper = new DOMWrapper(document.body)` — needed because Nuxt UI modals/slideovers teleport to `<body>`.
- Query by `data-testid` / `input[name=...]`; assert open state with `[data-state="open"]`.
- Mock composables with `mockNuxtImport`, `useToast` with a `vi.hoisted` spy, `$fetch` with `vi.stubGlobal`, and `useWindowSize` via `vi.mock('@vueuse/core')` using a shared `widthRef` (768 = desktop, 767 = mobile). Fake timers pin "today" (`2026-07-01`) for calendar tests.
- Group with nested `describe`s (Open/close behavior, Field rendering, Form submission success/error path, ...).

**Known drift:** `pages/index.vue` now fetches with `useLazySanctumFetch`, but `test/nuxt/pages/index.test.ts` still mocks `useLazyFetch` and has no logged-in user, so those tests likely fail/need updating as part of the auth migration. Check actual results with `npx vitest run --project nuxt` before assuming the baseline is green.

## Git workflow

Feature branches (`feature/...`, `refactor/...`) off `main`, merged via numbered GitHub PRs. Commit subjects are short and lowercase-prefixed (`feature: ...`, `refactor: ...`). `public/oc*.{jpg,webp}` are sample images; `.nuxt`, `.output`, `.env*` are ignored.

## Gotchas

- `serverDir` is `app/server` (non-default) — put Nitro routes there.
- `nuxt.config.ts` hard-codes Sanctum `origin`/`baseUrl` for local dev; they will need env-driven values for any deployment.
- Some existing files have typos/oddities worth leaving alone unless asked (e.g. "occured" in the error empty state, `FormActions.vue` unused, `isDeleted` as a `ref` inside a watcher).
- `README.md` is still the default Nuxt starter and is not a source of truth.
