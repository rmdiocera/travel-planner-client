<script setup lang="ts">
import type { CalendarDate } from '@internationalized/date'
import { getLocalTimeZone, DateFormatter, today } from '@internationalized/date'
import type { Itinerary, ItineraryResponse } from '~/types/itinerary'

const props = defineProps<{
  selectedItinerary?: Itinerary
}>()
const isEditing = computed(() => !!props.selectedItinerary)

const emit = defineEmits<{
  loading: [value: boolean]
  isModalOpen: [value: boolean]
  itineraryCreated: [value: ItineraryResponse]
  itineraryUpdated: [value: ItineraryResponse]
}>()

defineExpose({
  triggerSubmit,
})

const startDate = shallowRef<CalendarDate | undefined>(
  props.selectedItinerary?.start_date
    ? toCalendarDate(new Date(props.selectedItinerary.start_date))
    : undefined,
)
const endDate = shallowRef<CalendarDate | undefined>(
  props.selectedItinerary?.end_date
    ? toCalendarDate(new Date(props.selectedItinerary.end_date))
    : undefined,
)
const dateToday = today(getLocalTimeZone())

const df = new DateFormatter('en-US', {
  dateStyle: 'medium',
})

const startDateCalOpen = ref(false)
const endDateCalOpen = ref(false)

const formRef = useTemplateRef('form')
const form = ref({
  name: props.selectedItinerary?.name ?? '',
  start_date: props.selectedItinerary?.start_date ?? '',
  end_date: props.selectedItinerary?.end_date ?? '',
})

const { showToast } = useAppToast()

watch(startDate, (value) => {
  if (value) {
    form.value.start_date = value.toString()
    startDateCalOpen.value = false
  }
})

watch(endDate, (value) => {
  if (value) {
    form.value.end_date = value.toString()
    endDateCalOpen.value = false
  }
})

function triggerSubmit() {
  (formRef.value as any)?.submit()
}

async function handleSubmit() {
  emit('loading', true)

  try {
    if (!isEditing.value) {
      const new_itinerary = await $fetch<ItineraryResponse>('/api/itineraries', {
        method: 'POST',
        body: form.value,
      })

      emit('isModalOpen', false)
      emit('itineraryCreated', new_itinerary)
      showToast('Itinerary created successfully', 'i-lucide-circle-check')
    }
    else {
      const updated_itinerary = await $fetch<ItineraryResponse>(`/api/itineraries/${props.selectedItinerary?.id}`, {
        method: 'PATCH',
        body: form.value,
      })

      emit('isModalOpen', false)
      emit('itineraryUpdated', updated_itinerary)
      showToast('Itinerary updated successfully', 'i-lucide-circle-check')
    }

    startDate.value = undefined
    endDate.value = undefined
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
    emit('loading', false)
  }
}
</script>

<template>
  <UForm
    ref="form"
    :state="form"
    @submit="handleSubmit"
  >
    <div class="grid gap-4">
      <UFormField
        label="Name"
        name="name"
      >
        <UInput
          v-model="form.name"
          :variant="form.name === '' ? 'subtle' : 'outline'"
          class="w-full"
        />
      </UFormField>
      <USeparator />
      <div class="grid gap-2">
        <div class="grid gap-2 grid-cols-2">
          <UFormField
            label="Start Date"
            name="start_date"
          >
            <UPopover v-model:open="startDateCalOpen">
              <UButton
                color="neutral"
                :variant="form.start_date === '' ? 'subtle' : 'outline'"
                :ui="{ leadingIcon: 'text-neutral-400' }"
                icon="i-lucide-calendar"
                class="w-full"
                data-testid="select-start-date-btn"
              >
                <span :class="startDate ? '' : 'text-sm text-dimmed font-normal'">
                  {{ startDate ? df.format(startDate.toDate(getLocalTimeZone())) : 'Select a date' }}
                </span>
              </UButton>

              <template #content>
                <UCalendar
                  v-model="startDate"
                  :min-value="dateToday"
                  class="p-2"
                  data-testid="start-date-cal"
                />
              </template>
            </UPopover>
          </UFormField>
          <UFormField
            label="End Date"
            name="end_date"
          >
            <UPopover v-model:open="endDateCalOpen">
              <UButton
                color="neutral"
                :variant="form.end_date === '' ? 'subtle' : 'outline'"
                :ui="{ leadingIcon: 'text-neutral-400' }"
                icon="i-lucide-calendar"
                class="w-full"
                data-testid="select-end-date-btn"
              >
                <span :class="endDate ? '' : 'text-sm text-dimmed font-normal'">
                  {{ endDate ? df.format(endDate.toDate(getLocalTimeZone())) : 'Select a date' }}
                </span>
              </UButton>

              <template #content>
                <UCalendar
                  v-model="endDate"
                  class="p-2"
                  data-testid="end-date-cal"
                />
              </template>
            </UPopover>
          </UFormField>
        </div>
      </div>
    </div>
  </UForm>
</template>
