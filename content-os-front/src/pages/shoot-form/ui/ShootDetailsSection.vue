<script setup lang="ts">
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VSectionCard } from '@/shared/ui/section-card'
import { VSelect } from '@/shared/ui/select'
import { durationOptions, locationOptions, startTimeOptions } from '../model/shoot-options'

// Figma "Card / Shoot details": name, date and place on the first row, time on
// the second. One column on mobile, two on tablets.
const name = defineModel<string>('name', { required: true })
const date = defineModel<string>('date', { required: true })
const location = defineModel<string>('location')
const startTime = defineModel<string>('startTime')
const duration = defineModel<string>('duration')

function openDatePicker(event: MouseEvent) {
  try {
    ;(event.currentTarget as HTMLInputElement).showPicker()
  } catch {
    // Not allowed here (e.g. inside a cross-origin frame): typing still works.
  }
}
</script>

<template>
  <VSectionCard title="Shoot details">
    <div class="flex flex-col gap-4">
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-[464fr_324fr_372fr]">
        <VInput
          v-model="name"
          label="Shoot name"
          placeholder="Enter shoot name"
          autocomplete="off"
          class="md:col-span-2 lg:col-span-1"
        />
        <!-- TODO(ui): date picker (Figma calendar dropdown); the browser's one until then,
             opened by a click anywhere in the field, its own icon hidden for Figma's. -->
        <VInput
          v-model="date"
          label="Date"
          type="date"
          class="[&_input::-webkit-calendar-picker-indicator]:hidden"
          @click="openDatePicker"
        >
          <template #prefix>
            <VIcon name="calendar-02" :size="16" class="text-secondary" />
          </template>
        </VInput>
        <VSelect
          v-model="location"
          :options="locationOptions"
          label="Location"
          placeholder="Select location"
          icon="location-01"
        />
      </div>
      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <VSelect
          v-model="startTime"
          :options="startTimeOptions"
          label="Start time"
          placeholder="Select time"
          icon="clock-01"
        />
        <VSelect
          v-model="duration"
          :options="durationOptions"
          label="Estimated duration"
          placeholder="Select duration"
          icon="time-02"
        />
      </div>
    </div>
  </VSectionCard>
</template>
