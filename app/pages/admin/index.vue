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
              name="images"
            >
              <UFileUpload
                v-model="form.images"
                :interactive="true"
                multiple
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
                      :loading="countriesPending"
                      :disabled="!!countriesError"
                      :variant="form.country === '' ? 'subtle' : 'outline'"
                      class="w-full"
                      :placeholder="!!countriesError ? 'Failed to get countries' : 'Search country'"
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
              v-model="selected_tags"
              label-key="name"
              :items="tag_values"
              :variant="selected_tags.length === 0 ? 'subtle' : 'outline'"
              multiple
              placeholder="Select tags..."
              class="w-full"
            >
              <div
                class="flex flex-wrap gap-1.5 min-h-9 w-full rounded-md border border-neutral-200 dark:border-neutral-800 px-2 py-1.5 cursor-pointer"
              >
                <div
                  v-if="selected_tags.length > 0"
                  class="flex flex-wrap gap-2"
                >
                  <span
                    v-for="tag in selected_tags"
                    :key="tag"
                    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300 ring-1 ring-primary-200 dark:ring-primary-800"
                  >
                    {{ tag.name }}
                    <button
                      type="button"
                      class="hover:text-primary-900 dark:hover:text-primary-100 flex items-center"
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

interface Tag {
  id: number
  name: string
}

const { width } = useWindowSize()
const side = computed(() => width.value < 768 ? 'bottom' : 'right')

const { data: countries, pending: countriesPending, error: countriesError } = useFetch('/api/countries')
const country_names = ref(countries.value)

const { data: tags } = await useFetch<{ data: { id: number, name: string }[] }>('/api/tags')
const tag_values = computed(() => tags.value?.data)
const selected_tags = ref<Tag[]>([])
const selected_tag_ids = computed(() => selected_tags.value.map(tag => tag.id))

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
  images: [],
  tags: selected_tags,
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
      images: [],
      tags: [],
    }

    selected_tags.value = []
  }
})

function removeTag(tag: Tag) {
  selected_tags.value = selected_tags.value.filter(t => t !== tag)
}

function triggerSubmit() {
  (formRef.value as any)?.submit()
}

async function handleSubmit() {
  isLoading.value = true

  const payload = new FormData()
  payload.append('name', form.value.name)
  payload.append('address', form.value.address)
  payload.append('city', form.value.city)
  payload.append('country', form.value.country)
  payload.append('website', form.value.website)
  payload.append('phone', form.value.phone)
  payload.append('details', form.value.details)

  if (form.value.tags) {
    selected_tag_ids.value.forEach((id) => {
      payload.append('tags[]', String(id))
    })
  }

  if (form.value.images) {
    form.value.images.forEach((image, index) => {
      payload.append('images[]', image)
    })
  }

  try {
    await $fetch('/api/places', {
      method: 'POST',
      body: payload,
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
