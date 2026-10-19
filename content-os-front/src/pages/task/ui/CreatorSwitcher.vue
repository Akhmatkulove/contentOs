<script setup lang="ts">
import { RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { VAvatar } from '@/shared/ui/avatar'
import { VIcon, type IconName } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { creatorStatus, type CreatorWork } from '../model/review'

// Whose work is under review when a deliverable has several assignees. Figma
// shows one creator; with more, each gets a card with their status so the art
// director sees at a glance who is waiting. Arrows move between them.
const { creators, selected, progress } = defineProps<{
  creators: CreatorWork[]
  selected: string
  // "1 of 2 approved".
  progress: string
}>()
defineEmits<{ select: [id: string] }>()

type Tone = ReturnType<typeof creatorStatus>['tone']

// The status as a badge on the avatar and a segment of the progress bar.
const tones: Record<Tone, { mark: string; icon: IconName }> = {
  success: { mark: 'bg-mint-300', icon: 'tick-01' },
  warning: { mark: 'bg-yellow-500', icon: 'eye' },
  danger: { mark: 'bg-red-300', icon: 'edit-02' },
  info: { mark: 'bg-blue-300', icon: 'upload-01' },
}

function tone(creator: CreatorWork) {
  return tones[creatorStatus(creator.status).tone]
}

function versionsLabel(creator: CreatorWork): string {
  const count = creator.versions.length
  if (!count) return 'No uploads'
  return count === 1 ? '1 version' : `${count} versions`
}
</script>

<template>
  <section
    aria-labelledby="review-creators"
    class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:p-5"
  >
    <div class="flex flex-col gap-3">
      <div class="flex items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <h2 id="review-creators" class="text-h6 text-brand">Creators</h2>
          <span
            class="flex h-5 min-w-5 items-center justify-center rounded-full bg-muted px-1.5 text-p4 font-semibold text-secondary"
          >
            {{ creators.length }}
          </span>
        </div>
        <p class="text-p3 font-medium text-secondary">{{ progress }}</p>
      </div>
      <!-- One segment per creator, in the cards' order. -->
      <div class="flex gap-1" aria-hidden="true">
        <span
          v-for="creator in creators"
          :key="creator.id"
          :class="[
            'h-1.5 flex-1 rounded-full transition-all duration-300',
            tone(creator).mark,
            creator.id === selected ? 'opacity-100' : 'opacity-40',
          ]"
        />
      </div>
    </div>

    <RadioGroupRoot
      :model-value="selected"
      orientation="horizontal"
      aria-labelledby="review-creators"
      class="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pt-0.5 pb-1 md:mx-0 md:grid md:grid-cols-[repeat(auto-fill,minmax(248px,1fr))] md:overflow-visible md:px-0 md:pb-0"
      @update:model-value="(value) => $emit('select', value as string)"
    >
      <RadioGroupItem
        v-for="creator in creators"
        :key="creator.id"
        :value="creator.id"
        class="group relative flex w-[248px] shrink-0 snap-start flex-col gap-3 rounded-2xl border border-default bg-card p-3 text-left transition-[background-color,border-color,box-shadow,transform] duration-200 outline-none hover:border-strong hover:bg-subtle focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-offset-2 active:scale-[0.985] data-[state=checked]:border-violet-400 data-[state=checked]:bg-status-accent data-[state=checked]:shadow-[0_6px_20px_-10px_rgb(76_34_97/0.45)] md:w-auto"
      >
        <span class="flex min-w-0 items-center gap-3">
          <span class="relative shrink-0">
            <VAvatar :name="creator.name" :src="creator.photoUrl" :size="44" />
            <span
              :class="[
                'absolute -right-0.5 -bottom-0.5 flex size-[18px] items-center justify-center rounded-full text-white ring-2 ring-white transition-shadow group-data-[state=checked]:ring-violet-100',
                tone(creator).mark,
              ]"
              aria-hidden="true"
            >
              <VIcon :name="tone(creator).icon" :size="10" />
            </span>
          </span>
          <span class="flex min-w-0 flex-1 flex-col gap-0.5">
            <span class="truncate text-p2 font-semibold text-brand" :title="creator.name">
              {{ creator.name }}
            </span>
            <span class="truncate text-p3 font-medium text-secondary">
              {{ creator.role ? `${creator.role} · ` : '' }}{{ versionsLabel(creator) }}
            </span>
          </span>
          <!-- The radio mark: an empty ring, filled with a tick once picked. -->
          <span
            class="flex size-5 shrink-0 items-center justify-center self-start rounded-full border-[1.5px] border-strong text-white transition-colors duration-200 group-hover:border-neutral-500 group-data-[state=checked]:border-violet-400 group-data-[state=checked]:bg-violet-400"
            aria-hidden="true"
          >
            <VIcon
              name="tick-01"
              :size="12"
              class="scale-50 opacity-0 transition-[opacity,transform] duration-200 group-data-[state=checked]:scale-100 group-data-[state=checked]:opacity-100"
            />
          </span>
        </span>
        <VStatus :tone="creatorStatus(creator.status).tone" :size="24" class="self-start">
          {{ creatorStatus(creator.status).label }}
        </VStatus>
      </RadioGroupItem>
    </RadioGroupRoot>
  </section>
</template>
