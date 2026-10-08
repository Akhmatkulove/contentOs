<script setup lang="ts">
import { computed, useId } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VSectionCard } from '@/shared/ui/section-card'
import type { TeamMember } from '../model/shoot-draft'
import ListPicker from './ListPicker.vue'

// Figma "Card / Team": art director, creators, mobilographer side by side on
// desktop, stacked on mobile. The art director is the one creating the shoot;
// creators and the mobilographer are picked from the art director's creators.
const {
  artDirector,
  creators,
  creatorOptions,
  mobilographer,
  mobilographerOptions,
  loading = false,
} = defineProps<{
  artDirector: TeamMember | null
  creators: TeamMember[]
  creatorOptions: TeamMember[]
  mobilographer: TeamMember | null
  mobilographerOptions: TeamMember[]
  loading?: boolean
}>()

const creatorIds = defineModel<string[]>('creatorIds', { required: true })
const mobilographerId = defineModel<string | undefined>('mobilographerId')

function toggleCreator(id: string) {
  creatorIds.value = creatorIds.value.includes(id)
    ? creatorIds.value.filter((value) => value !== id)
    : [...creatorIds.value, id]
}

function toggleMobilographer(id: string) {
  mobilographerId.value = mobilographerId.value === id ? undefined : id
}

const artDirectorLabelId = useId()
const creatorsLabelId = useId()
const mobilographerLabelId = useId()
const mobilographerValueId = useId()

const memberName = (member: TeamMember) => member.name ?? ''
const emptyText = computed(() =>
  loading ? 'Loading your team…' : 'No one left to add. An admin adds creators to your team.',
)

const boxClass =
  'flex h-11 w-full items-center gap-2 rounded-full border border-default bg-card p-2'
</script>

<template>
  <VSectionCard title="Team">
    <div class="grid grid-cols-1 items-start gap-4 lg:grid-cols-[252fr_656fr_252fr]">
      <!-- The one creating the shoot: shown, not picked. -->
      <div role="group" :aria-labelledby="artDirectorLabelId" class="flex min-w-0 flex-col gap-2">
        <span :id="artDirectorLabelId" class="text-p3 font-medium text-secondary"
          >Art Director</span
        >
        <div :class="boxClass">
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
              @click="toggleCreator(creator.id)"
            >
              <VIcon name="multiplication-sign" :size="12" />
            </VButton>
          </li>
          <!-- Mobile: its own full-width row under the chips. -->
          <li class="flex basis-full md:basis-auto">
            <ListPicker
              :items="creatorOptions"
              :selected="creatorIds"
              :text="memberName"
              multiple
              label="Creators"
              :empty-text="emptyText"
              @toggle="toggleCreator"
            >
              <template #item="{ item }">
                <VAvatar :name="item.name" :src="item.photo_url" :size="24" />
                <span class="min-w-0 flex-1 truncate">{{ item.name || 'Unnamed' }}</span>
              </template>
              <VButton variant="soft" size="36" class="flex-1 md:h-8.5 md:px-5">
                <VIcon name="plus-sign" />
                Add creator
              </VButton>
            </ListPicker>
          </li>
        </ul>
      </div>

      <div role="group" :aria-labelledby="mobilographerLabelId" class="flex min-w-0 flex-col gap-2">
        <span :id="mobilographerLabelId" class="text-p3 font-medium text-secondary">
          Mobilographer
        </span>
        <div class="relative">
          <ListPicker
            :items="mobilographerOptions"
            :selected="mobilographerId ? [mobilographerId] : []"
            :text="memberName"
            label="Mobilographer"
            :empty-text="emptyText"
            @toggle="toggleMobilographer"
          >
            <template #item="{ item }">
              <VAvatar :name="item.name" :src="item.photo_url" :size="24" />
              <span class="min-w-0 flex-1 truncate">{{ item.name || 'Unnamed' }}</span>
            </template>
            <button
              type="button"
              :aria-labelledby="`${mobilographerLabelId} ${mobilographerValueId}`"
              :class="[
                boxClass,
                'text-left transition-colors outline-none hover:bg-status-accent focus-visible:border-violet-400 focus-visible:ring-1 focus-visible:ring-violet-400 focus-visible:ring-inset',
                mobilographer ? 'pr-10' : 'pr-3',
              ]"
            >
              <template v-if="mobilographer">
                <VAvatar :name="mobilographer.name" :src="mobilographer.photo_url" />
                <span :id="mobilographerValueId" class="truncate text-p3 font-medium text-primary">
                  {{ mobilographer.name || 'Unnamed' }}
                </span>
              </template>
              <template v-else>
                <VIcon name="plus-sign" :size="16" class="ml-1 shrink-0 text-secondary" />
                <span
                  :id="mobilographerValueId"
                  class="flex-1 truncate text-p3 font-medium text-neutral-600"
                >
                  Select mobilographer
                </span>
              </template>
            </button>
          </ListPicker>
          <!-- Beside the field, not inside: a button can't hold another button. -->
          <VButton
            v-if="mobilographer"
            variant="ghost"
            size="icon-24"
            :aria-label="`Remove ${mobilographer.name || 'mobilographer'}`"
            class="absolute top-1/2 right-3 -translate-y-1/2 text-secondary hover:text-primary"
            @click="mobilographerId = undefined"
          >
            <VIcon name="multiplication-sign" :size="14" />
          </VButton>
        </div>
      </div>
    </div>
  </VSectionCard>
</template>
