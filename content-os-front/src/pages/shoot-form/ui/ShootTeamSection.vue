<script setup lang="ts">
import { computed, useId } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VSectionCard } from '@/shared/ui/section-card'
import type { TeamMember } from '../model/shoot-draft'
import ShootMemberPicker from './ShootMemberPicker.vue'

// Figma "Card / Team": art director, creators, mobilographers side by side on
// desktop, stacked on mobile. The art director is the one creating the shoot;
// creators and mobilographers are picked from the art director's creators.
const {
  artDirector,
  creators,
  creatorOptions,
  mobilographers,
  mobilographerOptions,
  loading = false,
} = defineProps<{
  artDirector: TeamMember | null
  creators: TeamMember[]
  creatorOptions: TeamMember[]
  mobilographers: TeamMember[]
  mobilographerOptions: TeamMember[]
  loading?: boolean
}>()

const creatorIds = defineModel<string[]>('creatorIds', { required: true })
const mobilographerIds = defineModel<string[]>('mobilographerIds', { required: true })

const artDirectorLabelId = useId()
const creatorsLabelId = useId()
const mobilographersLabelId = useId()

const emptyText = computed(() =>
  loading ? 'Loading your team…' : 'No one left to add. An admin adds creators to your team.',
)
</script>

<template>
  <VSectionCard title="Team">
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[252fr_454fr_454fr]">
      <!-- The one creating the shoot: shown, not picked. -->
      <div role="group" :aria-labelledby="artDirectorLabelId" class="flex min-w-0 flex-col gap-2">
        <span :id="artDirectorLabelId" class="text-p3 font-medium text-secondary"
          >Art Director</span
        >
        <div
          class="flex h-11 w-full items-center gap-2 rounded-full border border-default bg-card p-2"
        >
          <template v-if="artDirector">
            <VAvatar :name="artDirector.name" :src="artDirector.photo_url" />
            <span class="truncate text-p3 font-medium text-primary">
              {{ artDirector.name || 'You' }}
            </span>
          </template>
        </div>
      </div>

      <div role="group" :aria-labelledby="creatorsLabelId" class="flex min-w-0 flex-col gap-2">
        <span :id="creatorsLabelId" class="text-p3 font-medium text-secondary">Creators</span>
        <ShootMemberPicker
          v-model="creatorIds"
          :members="creators"
          :options="creatorOptions"
          label="Creators"
          add-text="Add creator"
          noun="creator"
          :empty-text="emptyText"
        />
      </div>

      <div
        role="group"
        :aria-labelledby="mobilographersLabelId"
        class="flex min-w-0 flex-col gap-2"
      >
        <span :id="mobilographersLabelId" class="text-p3 font-medium text-secondary">
          Mobilographers
        </span>
        <ShootMemberPicker
          v-model="mobilographerIds"
          :members="mobilographers"
          :options="mobilographerOptions"
          label="Mobilographers"
          add-text="Add mobilographer"
          noun="mobilographer"
          :empty-text="emptyText"
        />
      </div>
    </div>
  </VSectionCard>
</template>
