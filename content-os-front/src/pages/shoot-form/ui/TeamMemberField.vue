<script setup lang="ts">
import { useId } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import type { TeamMember } from '../model/shoot-draft'

// Figma "Art Director" / "Mobilographer" in "Card / Team": a label and the
// chosen person (Figma "CMS / Shared / Person"). The box is a button that
// will open the person picker.
const { label, member } = defineProps<{
  label: string
  member: TeamMember | null
}>()

const labelId = useId()
const valueId = useId()
</script>

<template>
  <div class="flex min-w-0 flex-col gap-2">
    <span :id="labelId" class="text-p3 font-medium text-secondary">{{ label }}</span>
    <!-- TODO(ui): person picker (not in Figma yet). -->
    <button
      type="button"
      :aria-labelledby="`${labelId} ${valueId}`"
      class="flex h-11 w-full items-center gap-2 rounded-full border border-default bg-card p-2 text-left transition-colors outline-none hover:bg-status-accent focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400 focus-visible:ring-inset"
    >
      <template v-if="member">
        <VAvatar :name="member.name" :src="member.photo_url" />
        <span :id="valueId" class="truncate text-p3 font-medium text-primary">
          {{ member.name || 'Unnamed' }}
        </span>
      </template>
      <span v-else :id="valueId" class="px-1 text-p3 font-medium text-secondary">
        Not assigned
      </span>
    </button>
  </div>
</template>
