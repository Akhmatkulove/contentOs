<script setup lang="ts">
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

// The last step of the review (not in Figma yet): the deliverable goes to the
// brand once every assignee's work is approved. Until then the button is off
// and the card says who it waits for.
const { canSend, sent, sending, waiting } = defineProps<{
  canSend: boolean
  sent: boolean
  sending: boolean
  // "Odina hasn’t uploaded yet", one per assignee not approved.
  waiting: { id: string; reason: string }[]
}>()
defineEmits<{ send: [] }>()
</script>

<template>
  <section
    aria-labelledby="send-to-brand"
    class="flex flex-col gap-4 rounded-2xl bg-card p-4 md:flex-row md:items-center md:justify-between md:gap-8 md:p-7"
  >
    <div class="flex min-w-0 flex-col gap-1.5">
      <h2 id="send-to-brand" class="text-h6 text-brand">
        {{ sent ? 'Sent to the brand' : 'Send to brand' }}
      </h2>
      <p v-if="sent" class="text-p3 font-medium text-secondary">
        The approved versions went to the brand.
      </p>
      <p v-else-if="canSend" class="text-p3 font-medium text-secondary">
        Every creator’s work is approved. It’s ready for the brand.
      </p>
      <template v-else>
        <p class="text-p3 font-medium text-secondary">
          Available once every creator’s work is approved.
        </p>
        <ul v-if="waiting.length" class="flex flex-col gap-1 pt-1">
          <li
            v-for="item in waiting"
            :key="item.id"
            class="flex items-center gap-2 text-p3 font-medium text-primary"
          >
            <VIcon name="clock-01" :size="14" class="shrink-0 text-secondary" />
            {{ item.reason }}
          </li>
        </ul>
      </template>
    </div>
    <VButton
      v-if="!sent"
      size="44"
      class="w-full md:w-auto md:min-w-[240px]"
      :disabled="!canSend || sending"
      @click="$emit('send')"
    >
      <VIcon name="checkmark-circle-02" />
      {{ sending ? 'Sending…' : 'Send to brand' }}
    </VButton>
  </section>
</template>
