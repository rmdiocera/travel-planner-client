<template>
  <div>
    <UHeader>
      <template #title>
        Travel Planner
      </template>

      <template #right>
        <UNavigationMenu :items="items" />
      </template>
    </UHeader>
    <UContainer>
      <slot />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const route = useRoute()

const items = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Itineraries',
    to: '/',
    active: route.path.startsWith('/'),
  },
])
</script>
