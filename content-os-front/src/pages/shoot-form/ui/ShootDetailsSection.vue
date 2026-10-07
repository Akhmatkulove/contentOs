<script setup lang="ts">
import { VDatePicker } from '@/shared/ui/date-picker'
import { VInput } from '@/shared/ui/input'
import { VSectionCard } from '@/shared/ui/section-card'
import { VSelect } from '@/shared/ui/select'
import { durationOptions, startTimeOptions } from '../model/shoot-options'
import LocationField from './LocationField.vue'

// Figma "Card / Shoot details": name, date and place on the first row, time on
// the second. One column on mobile, two on tablets.
const name = defineModel<string>('name', { required: true })
const date = defineModel<string>('date', { required: true })
const location = defineModel<string>('location', { required: true })
const startTime = defineModel<string>('startTime')
const duration = defineModel<string>('duration')
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
        <VDatePicker v-model="date" label="Date" />
        <LocationField v-model="location" label="Location" />
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
