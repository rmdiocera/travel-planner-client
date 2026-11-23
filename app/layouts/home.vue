<template>
  <div class="min-h-screen flex flex-col">
    <!-- No menu toggle: the header has no menu, and below 1024px the toggle would open an empty one. -->
    <UHeader
      :toggle="false"
      class="shrink-0"
    >
      <template #title>
        <div class="dayfarer-brand text-3xl text-primary flex items-center gap-1">
          <UIcon name="i-lucide-footprints" />
          <span>Dayfarer</span>
        </div>
      </template>

      <template #right>
        <div class="flex gap-4 items-center">
          <div
            v-if="!user"
            class="flex items-center gap-2"
          >
            <UButton
              label="Log in"
              color="neutral"
              variant="ghost"
              to="/login"
              data-testid="header-login-btn"
            />
            <!-- On phones the header only has room for the logo and Log in. -->
            <UButton
              label="Create account"
              color="primary"
              to="/register"
              class="hidden sm:inline-flex"
              data-testid="header-register-btn"
            />
          </div>
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
                data-testid="header-user-menu-btn"
                :ui="{ base: 'rounded-full text-white bg-black/75 hover:bg-black/50 cursor-pointer size-10 flex justify-center items-center text-md' }"
              />
            </UDropdownMenu>
          </template>
        </div>
      </template>
    </UHeader>
    <UContainer data-testid="home-container">
      <slot />
    </UContainer>
    <!-- Full-width content below the container, such as the Welcome page's closing band. -->
    <slot name="after" />
  </div>
</template>

<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'
import type { User } from '~/types/user'

const { user, logout } = useSanctumAuth<User>()

const userInitial = computed(() => user.value?.first_name?.[0])

const route = useRoute()

const navItems = computed<NavigationMenuItem[]>(() => [
  {
    label: 'Trips',
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
    label: 'Log out',
    icon: 'i-lucide-log-out',
    onSelect: () => {
      logout()
    },
  },
])
</script>
