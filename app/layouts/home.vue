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
        <div class="flex gap-4 items-center">
          <template v-if="!user">
            <UButton
              block
              label="Log in"
              color="primary"
              to="/login"
            />
          </template>
          <template v-else>
            <UNavigationMenu :items="navItems" />
            <UDropdownMenu
              size="xl"
              :items="dropdownItems"
              :content="{
                align: 'start',
              }"
            >
            <UButton
              color="primary"
              variant="ghost"
              :label="userInitial"
              square
              :ui="{ base: 'rounded-full text-white bg-black/75 hover:bg-black/50 cursor-pointer size-10 flex justify-center items-center text-md' }"
            />
            </UDropdownMenu>
          </template>
        </div>
      </template>
    </UHeader>
    <UContainer>
      <slot />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const { user, logout } = useSanctumAuth()

const userInitial = computed(() => user.value?.name[0])

const route = useRoute()

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Itineraries',
    to: '/',
    active: route.path.startsWith('/'),
  },
])

const dropdownItems = ref<DropdownMenuItem[]>([
  {
    label: 'Profile',
    icon: 'i-lucide-user-round',
    disabled: true,
  },
  {
    label: 'Log Out',
    icon: 'i-lucide-log-out',
    onSelect: () => {
      logout()
    }
  },
])
</script>
