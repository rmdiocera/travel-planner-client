<template>
  <h1>Admin Page</h1>
  <Slideover
    v-model:open="open"
    :side="side"
    title="Add a place"
  >
    <template #button>
      <UButton
        label="Open"
        color="neutral"
        variant="subtle"
        data-testid="open-slideover-btn"
        @click="open = true"
      />
    </template>
    <template #form>
      <UForm
        ref="form"
        :state="form"
        @submit="handleSubmit"
      >
        <div class="grid gap-4">
          <div class="grid gap-2">
            <UFormField
              label="Upload image"
              name="image"
            >
              <UFileUpload
                :interactive="true"
                accept="image/*"
                size="md"
                variant="area"
                label="Drop your image here"
                description="SVG, PNG, JPG or GIF (max. 2MB)"
              />
            </UFormField>
            <UFormField
              label="Name"
              name="name"
              required
            >
              <UInput
                v-model="form.name"
                :variant="form.name === '' ? 'subtle' : 'outline'"
                class="w-full"
              />
            </UFormField>
          </div>
          <USeparator />
          <div class="grid gap-8">
            <div>
              <h3 class="text-xs font-medium tracking-widest text-neutral-400 uppercase">
                Location
              </h3>
              <div class="grid gap-2">
                <UFormField
                  label="Address"
                  name="address"
                  required
                >
                  <UInput
                    v-model="form.address"
                    icon="i-lucide-map-pin"
                    placeholder="Street address"
                    :variant="form.address === '' ? 'subtle' : 'outline'"
                    class="w-full"
                  />
                </UFormField>
                <div class="grid gap-2 grid-cols-2">
                  <UFormField
                    label="Country"
                    name="country"
                    required
                  >
                    <USelectMenu
                      v-model="form.country"
                      :items="country_names"
                      searchable
                      :loading="pending"
                      :disabled="!!error"
                      :variant="form.country === '' ? 'subtle' : 'outline'"
                      class="w-full"
                      :placeholder="!!error ? 'Failed to get countries' : 'Search country'"
                      data-testid="select-country-select"
                    />
                  </UFormField>
                  <UFormField
                    label="City"
                    name="city"
                    required
                  >
                    <UInput
                      v-model="form.city"
                      :variant="form.city === '' ? 'subtle' : 'outline'"
                      class="w-full"
                    />
                  </UFormField>
                </div>
              </div>
            </div>
            <div>
              <h3 class="text-xs font-medium tracking-widest text-neutral-400 uppercase">
                Contact
              </h3>
              <div class="grid gap-2 grid-cols-2">
                <UFormField
                  label="Website"
                  name="website"
                >
                  <UInput
                    v-model="form.website"
                    icon="i-lucide-globe"
                    :variant="form.website === '' ? 'subtle' : 'outline'"
                    class="w-full"
                  />
                </UFormField>
                <UFormField
                  label="Phone"
                  name="phone"
                >
                  <UInput
                    v-model="form.phone"
                    icon="i-lucide-phone"
                    :variant="form.phone === '' ? 'subtle' : 'outline'"
                    class="w-full"
                  />
                </UFormField>
              </div>
            </div>
          </div>
          <USeparator />
          <UFormField
            label="Details"
            name="details"
          >
            <UTextarea
              v-model="form.details"
              :variant="form.details === '' ? 'subtle' : 'outline'"
              class="w-full"
            />
          </UFormField>
          <UFormField label="Tags">
            <USelectMenu
              v-model="tags"
              :items="availableTags"
              :variant="tags.length === 0 ? 'subtle' : 'outline'"
              multiple
              placeholder="Select tags..."
              class="w-full"
            >
              <div
                class="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 cursor-pointer"
              >
                <div v-if="tags.length > 0">
                  <span
                    v-for="tag in tags"
                    :key="tag"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800"
                  >
                    {{ tag }}
                    <button
                      type="button"
                      class="hover:text-primary-900 dark:hover:text-primary-100"
                      @click.stop="removeTag(tag)"
                    >
                      <UIcon
                        name="i-lucide-x"
                        class="size-3"
                      />
                    </button>
                  </span>
                </div>
                <span
                  v-else
                  class="text-sm text-neutral-400"
                >Select tags...</span>
              </div>
            </USelectMenu>
          </UFormField>
        </div>
      </UForm>
    </template>
    <template #action>
      <div class="grid grid-cols-3 gap-2 w-full">
        <div class="col-span-1">
          <UButton
            block
            label="Cancel"
            color="neutral"
            variant="outline"
            @click="open = false"
          />
        </div>
        <div class="col-span-2">
          <UButton
            block
            label="Submit"
            color="primary"
            :loading="isLoading"
            data-testid="submit-place-btn"
            @click="triggerSubmit"
          />
        </div>
      </div>
    </template>
  </Slideover>
</template>

<script setup lang="ts">
import Slideover from '@/components/ui/Slideover.vue'
import type { ToastProps } from '@nuxt/ui'
import { useWindowSize } from '@vueuse/core'
import { ref } from 'vue'

const { width } = useWindowSize()
const side = computed(() => width.value < 768 ? 'bottom' : 'right')

const { data: countries, pending, error } = useFetch('/api/countries')
const country_names = ref(countries.value)

const availableTags = ref(['Tag 1', 'Tag 2', 'Tag 3', 'Tag 1000000000', 'Tag 2000000000', 'Tag 3000000000'])
const tags = ref([])

const formRef = useTemplateRef('form')
const open = ref(false)
const isLoading = ref(false)

const toast = useToast()

function showToast(title: string, icon: string, description?: string, color?: ToastProps['color']) {
  toast.add({
    title,
    icon,
    description,
    color,
  })
}

const form = ref({
  name: '',
  address: '',
  country: '',
  city: '',
  website: '',
  phone: '',
  details: '',
})

watch(open, (isOpen) => {
  if (!isOpen) {
    form.value = {
      name: '',
      address: '',
      country: '',
      city: '',
      website: '',
      phone: '',
      details: '',
    }
  }
})

function removeTag(tag: string) {
  tags.value = tags.value.filter(t => t !== tag)
}

function triggerSubmit() {
  (formRef.value as any)?.submit()
}

async function handleSubmit() {
  isLoading.value = true

  try {
    await $fetch('/api/places', {
      method: 'POST',
      body: form.value,
    })

    open.value = false
    showToast('Place created successfully', 'i-lucide-circle-check')
  }
  catch (error: any) {
    const apiErrors = error?.data?.data?.errors

    if (apiErrors) {
      (formRef.value as any)?.setErrors(
        Object.entries(apiErrors).map(([field, messages]: [string, any]) => ({
          name: field,
          message: messages[0],
        })),
      )
    }
    else {
      showToast('Something went wrong', 'i-lucide-circle-x', 'There was a problem with your request', 'error')
    }
  }
  finally {
    isLoading.value = false
  }
}
</script>
