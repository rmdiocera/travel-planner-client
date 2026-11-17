import type { User } from '~/types/user'

export default defineNuxtRouteMiddleware((to) => {
  const user = useSanctumUser<User>()

  if (to.path === '/verify-email') {
    if (!user.value) {
      return navigateTo('/login')
    }
    if (user.value.email_verified_at) {
      return navigateTo({ path: '/', query: to.query })
    }
    return
  }

  if (user.value && !user.value.email_verified_at) {
    return navigateTo({ path: '/verify-email', query: to.query })
  }
})
