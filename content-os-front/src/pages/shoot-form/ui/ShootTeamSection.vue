<script setup lang="ts">
import { useId } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSectionCard } from '@/shared/ui/section-card'
import type { TeamMember } from '../model/shoot-draft'
import TeamMemberField from './TeamMemberField.vue'

// Figma "Card / Team": art director, creators, mobilographer side by side on
// desktop, stacked on mobile.
const { artDirector, creators, mobilographer } = defineProps<{
  artDirector: TeamMember | null
  creators: TeamMember[]
  mobilographer: TeamMember | null
}>()

const emit = defineEmits<{ removeCreator: [id: string] }>()

const creatorsLabelId = useId()
</script>

<template>
  <VSectionCard title="Team">
    <div class="grid items-start gap-4 lg:grid-cols-[252fr_656fr_252fr]">
      <TeamMemberField label="Art Director" :member="artDirector" />

      <div role="group" :aria-labelledby="creatorsLabelId" class="flex min-w-0 flex-col gap-2">
        <span :id="creatorsLabelId" class="text-p3 font-medium text-secondary">Creators</span>
        <!-- Figma "Selected creators": chips and "Add creator" in one pill box. -->
        <ul
          class="flex min-h-11 flex-wrap items-center gap-2 rounded-3xl border border-default p-1.5"
        >
          <li
            v-for="creator in creators"
            :key="creator.id"
            class="flex h-9 items-center gap-1.5 rounded-full bg-subtle pr-3 pl-1.5"
          >
            <VAvatar :name="creator.name" :src="creator.photo_url" :size="24" />
            <span class="text-p3 font-medium text-primary">{{ creator.name || 'Unnamed' }}</span>
            <!-- 12px like Figma; ::after widens the tap area to 28px. -->
            <VButton
              variant="ghost"
              size="icon-24"
              :aria-label="`Remove ${creator.name || 'creator'}`"
              class="relative size-3 text-secondary after:absolute after:-inset-2 hover:text-primary"
              @click="emit('removeCreator', creator.id)"
            >
              <VIcon name="multiplication-sign" :size="12" />
            </VButton>
          </li>
          <!-- Mobile: its own full-width row under the chips. -->
          <li class="flex basis-full md:basis-auto">
            <!-- TODO(ui): creator picker (not in Figma yet). -->
            <VButton variant="soft" size="36" class="flex-1 md:h-8.5 md:px-5">
              <VIcon name="plus-sign" />
              Add creator
            </VButton>
          </li>
        </ul>
      </div>

      <TeamMemberField label="Mobilographer" :member="mobilographer" />
    </div>
  </VSectionCard>
</template>
