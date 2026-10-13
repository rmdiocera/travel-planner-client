<template>
  <div>
    <UHeader>
      <template #title>
        <div class="dayfarer-brand text-3xl text-primary flex items-center gap-1">
          <UIcon name="i-lucide-footprints" />
          <span>Dayfarer</span>
        </div>
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
