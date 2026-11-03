<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({
  layout: false,
  middleware: ['sanctum:guest'],
})

const { login } = useSanctumAuth()

const passwordRef = useTemplateRef('passwordInput')

const state = reactive({
  email: '',
  password: '',
  remember: false,
})
const loading = ref(false)
const showPassword = ref(false)
const formError = ref('')

function validate(values: typeof state): FormError[] {
  const errors: FormError[] = []

  if (!values.email) {
    errors.push({ name: 'email', message: 'Enter your email' })
  }
  else if (!/^\S+@\S+\.\S+$/.test(values.email)) {
    errors.push({ name: 'email', message: 'Enter a valid email address' })
  }

  if (!values.password) {
    errors.push({ name: 'password', message: 'Enter your password' })
  }

  return errors
}

async function handleSubmit() {
  loading.value = true
  formError.value = ''

  try {
    await login({
      email: state.email,
      password: state.password,
      remember: state.remember,
    })
  }
  catch (error: any) {
    const status = error?.response?.status ?? error?.statusCode

    if (status === 422) {
      formError.value = 'Incorrect email or password.'
      state.password = ''
      passwordRef.value?.inputRef?.focus()
    }
    else if (status === 429) {
      formError.value = error?.data?.errors?.email?.[0] ?? 'Too many attempts. Try again in a moment.'
    }
    else {
      formError.value = 'Something went wrong. Try again in a moment.'
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <NuxtLayout name="auth">
    <div class="w-full max-w-sm grid gap-4">
      <UCard>
        <div class="grid gap-6">
          <h1 class="text-xl font-semibold text-center">
            Log in to start planning your trips
          </h1>

          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            role="alert"
            :title="formError"
            data-testid="login-alert"
          />

          <UForm
            :state="state"
            :validate="validate"
            novalidate
            :loading-auto="false"
            class="grid gap-4"
            @submit="handleSubmit"
          >
            <UFormField
              label="Email"
              name="email"
            >
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                autofocus
                aria-required="true"
                :variant="state.email === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="login-email-input"
              />
            </UFormField>

            <UFormField
              label="Password"
              name="password"
            >
              <UInput
                ref="passwordInput"
                v-model="state.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="current-password"
                aria-required="true"
                :variant="state.password === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="login-password-input"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    :aria-pressed="showPassword"
                    data-testid="login-toggle-password-btn"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </UInput>
            </UFormField>

            <div class="flex items-center justify-between">
              <UCheckbox
                v-model="state.remember"
                name="remember"
                label="Remember me"
                data-testid="login-remember-checkbox"
              />
              <ULink
                to="/forgot-password"
                class="text-sm text-primary"
                data-testid="login-forgot-link"
              >
                Forgot password?
              </ULink>
            </div>

            <UButton
              type="submit"
              label="Log in"
              block
              :loading="loading"
              :ui="{ base: 'dark:text-white' }"
              data-testid="login-submit-btn"
            />
          </UForm>
        </div>
      </UCard>

      <p class="text-sm text-center text-muted">
        New to Dayfarer?
        <ULink
          to="/register"
          class="text-primary font-medium"
          data-testid="login-register-link"
        >
          Create one
        </ULink>
      </p>
    </div>
  </NuxtLayout>
</template>
