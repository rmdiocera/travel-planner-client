<script setup lang="ts">
import type { FormError } from '@nuxt/ui'

definePageMeta({
  layout: false,
  middleware: ['sanctum:guest'],
})

const client = useSanctumClient()
const { refreshIdentity } = useSanctumAuth()

const formRef = useTemplateRef('form')

// State keys are the API field names so a 422 maps straight onto each UFormField name.
const state = ref({
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  password_confirmation: '',
})
const loading = ref(false)
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const formError = ref('')

function validate(values: typeof state.value): FormError[] {
  const errors: FormError[] = []

  if (!values.first_name.trim()) {
    errors.push({ name: 'first_name', message: 'Enter your first name' })
  }

  const email = values.email.trim()
  if (!email) {
    errors.push({ name: 'email', message: 'Enter your email' })
  }
  else if (!/^\S+@\S+\.\S+$/.test(email)) {
    errors.push({ name: 'email', message: 'Enter a valid email address' })
  }

  if (!values.password) {
    errors.push({ name: 'password', message: 'Enter a password' })
  }

  if (values.password_confirmation !== values.password) {
    errors.push({ name: 'password_confirmation', message: 'Passwords do not match' })
  }

  return errors
}

// UForm re-checks only the field that changed, so a new password would leave Confirm's last result standing.
watch(() => state.value.password, () => {
  if (state.value.password_confirmation) {
    void (formRef.value as any)?.validate({ name: 'password_confirmation', silent: true })
  }
})

function showRegistrationError(error: any) {
  const status = error?.response?.status ?? error?.statusCode
  const apiErrors = error?.data?.errors

  if (status === 422 && apiErrors) {
    (formRef.value as any)?.setErrors(
      Object.entries(apiErrors).map(([name, messages]: [string, any]) => ({
        name,
        message: messages[0],
      })),
    )
    // UForm drops errors for fields it doesn't render, so show those at the top instead.
    const otherField = Object.keys(apiErrors).find(name => !(name in state.value))
    if (otherField) {
      formError.value = apiErrors[otherField][0]
    }
  }
  else if (status === 429) {
    formError.value = 'Too many attempts. Try again in a moment.'
  }
  else {
    formError.value = 'Something went wrong. Try again in a moment.'
  }
}

async function handleSubmit() {
  if (loading.value) {
    return
  }

  loading.value = true
  formError.value = ''

  const body: Record<string, string> = {
    first_name: state.value.first_name.trim(),
    email: state.value.email.trim(),
    password: state.value.password,
    password_confirmation: state.value.password_confirmation,
  }
  const lastName = state.value.last_name.trim()
  if (lastName) {
    body.last_name = lastName
  }

  try {
    await client('/register', { method: 'POST', body })
  }
  catch (error: any) {
    showRegistrationError(error)
    loading.value = false
    return
  }

  try {
    await refreshIdentity()
  }
  catch {
    // The user is registered and logged in on the server, but without the identity here the redirect rule
    // would send them to /login. A full page load lets the server read the new session instead.
    await navigateTo('/verify-email', { external: true })
    loading.value = false
    return
  }
  await navigateTo('/verify-email')
  loading.value = false
}
</script>

<template>
  <NuxtLayout name="auth">
    <div class="w-full max-w-sm grid gap-4">
      <UCard>
        <div class="grid gap-6">
          <h1 class="text-xl font-semibold text-center">
            Create an account to start planning your trips
          </h1>

          <UAlert
            v-if="formError"
            color="error"
            variant="subtle"
            icon="i-lucide-circle-alert"
            role="alert"
            :title="formError"
            data-testid="register-alert"
          />

          <!-- Fields are checked when their value changes, not on blur: a blur check flags fields the user only
               passed through, and its message can push the links below the form out from under a click. -->
          <UForm
            ref="form"
            :state="state"
            :validate="validate"
            :validate-on="['input', 'change']"
            novalidate
            :loading-auto="false"
            class="grid gap-4"
            @submit="handleSubmit"
          >
            <UFormField
              label="First name"
              name="first_name"
            >
              <UInput
                v-model="state.first_name"
                autocomplete="given-name"
                aria-required="true"
                :variant="state.first_name === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="register-first-name-input"
              />
            </UFormField>

            <UFormField
              label="Last name (optional)"
              name="last_name"
            >
              <UInput
                v-model="state.last_name"
                autocomplete="family-name"
                :variant="state.last_name === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="register-last-name-input"
              />
            </UFormField>

            <UFormField
              label="Email"
              name="email"
            >
              <UInput
                v-model="state.email"
                type="email"
                autocomplete="email"
                aria-required="true"
                :variant="state.email === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="register-email-input"
              />
            </UFormField>

            <UFormField
              label="Password"
              name="password"
            >
              <UInput
                v-model="state.password"
                :type="showPassword ? 'text' : 'password'"
                autocomplete="new-password"
                aria-required="true"
                :variant="state.password === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="register-password-input"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showPassword ? 'Hide password' : 'Show password'"
                    :aria-pressed="showPassword"
                    data-testid="register-toggle-password-btn"
                    @click="() => { showPassword = !showPassword }"
                  />
                </template>
              </UInput>
            </UFormField>

            <UFormField
              label="Confirm password"
              name="password_confirmation"
            >
              <UInput
                v-model="state.password_confirmation"
                :type="showConfirmPassword ? 'text' : 'password'"
                autocomplete="new-password"
                aria-required="true"
                :variant="state.password_confirmation === '' ? 'subtle' : 'outline'"
                class="w-full"
                data-testid="register-confirm-password-input"
              >
                <template #trailing>
                  <UButton
                    color="neutral"
                    variant="link"
                    size="sm"
                    :icon="showConfirmPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                    :aria-label="showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'"
                    :aria-pressed="showConfirmPassword"
                    data-testid="register-toggle-confirm-password-btn"
                    @click="() => { showConfirmPassword = !showConfirmPassword }"
                  />
                </template>
              </UInput>
            </UFormField>

            <UButton
              type="submit"
              label="Create account"
              block
              :loading="loading"
              :ui="{ base: 'dark:text-white' }"
              data-testid="register-submit-btn"
            />
          </UForm>
        </div>
      </UCard>

      <p class="text-sm text-center text-muted">
        Already have an account?
        <ULink
          to="/login"
          class="text-primary font-medium"
          data-testid="register-login-link"
        >
          Log in
        </ULink>
      </p>
    </div>
  </NuxtLayout>
</template>
