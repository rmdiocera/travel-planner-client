<script setup lang="ts">
import { parseTime } from '@internationalized/date'
import type { Time } from '@internationalized/date'
import { injectTripDays } from '~/composables/useTripDays'
import type { Spot } from '~/types/spot'

const props = defineProps<{
  stop: Spot
}>()

const emit = defineEmits<{
  close: []
}>()

const days = injectTripDays()

const arrive = ref<Time | null>(props.stop.start_time ? parseTime(props.stop.start_time) : null)
const leave = ref<Time | null>(props.stop.end_time ? parseTime(props.stop.end_time) : null)
const saving = ref(false)
const error = ref('')

// The API takes "HH:MM".
const toApiTime = (time: Time | null) => time ? time.toString().slice(0, 5) : null

function clearTimes() {
  arrive.value = null
  leave.value = null
  error.value = ''
}

async function save() {
  if (leave.value && !arrive.value) {
    error.value = 'Add an arrive time too'
    return
  }
  if (arrive.value && leave.value && leave.value.compare(arrive.value) <= 0) {
    error.value = 'Leave must be after arrive'
    return
  }

  error.value = ''
  saving.value = true
  const saved = await days.setTimes(props.stop, toApiTime(arrive.value), toApiTime(leave.value))
  saving.value = false
  if (saved) {
    emit('close')
  }
}
</script>

<template>
  <div class="flex flex-col gap-3 pb-3">
    <div class="flex gap-3">
      <UFormField
        label="Arrive"
        class="flex-1"
      >
        <UInputTime
          v-model="arrive"
          :hour-cycle="24"
          class="w-full"
          data-testid="times-arrive"
        />
      </UFormField>
      <UFormField
        label="Leave"
        class="flex-1"
      >
        <UInputTime
          v-model="leave"
          :hour-cycle="24"
          class="w-full"
          data-testid="times-leave"
        />
      </UFormField>
    </div>
    <p
      v-if="error"
      role="alert"
      class="text-sm text-error"
    >
      {{ error }}
    </p>
    <div class="flex flex-wrap items-center gap-2">
      <UButton
        label="Clear times"
        variant="link"
        color="neutral"
        size="sm"
        class="px-0"
        data-testid="times-clear-btn"
        @click="clearTimes"
      />
      <div class="ml-auto flex gap-2">
        <UButton
          label="Cancel"
          variant="outline"
          color="neutral"
          size="sm"
          :disabled="saving"
          data-testid="times-cancel-btn"
          @click="emit('close')"
        />
        <UButton
          label="Save"
          size="sm"
          :loading="saving"
          data-testid="times-save-btn"
          @click="save"
        />
      </div>
    </div>
  </div>
</template>
