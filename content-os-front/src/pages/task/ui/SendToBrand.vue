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
    :class="[
      'relative flex flex-col gap-5 overflow-hidden rounded-2xl border p-4 transition-colors duration-300 md:flex-row md:items-center md:justify-between md:gap-8 md:p-6',
      sent
        ? 'border-mint-100 bg-card'
        : canSend
          ? 'border-violet-200 bg-linear-to-r from-violet-100 to-white'
          : 'border-transparent bg-card',
    ]"
  >
    <div class="flex min-w-0 items-start gap-4">
      <!-- The state at a glance: waiting, ready, sent. -->
      <span
        :class="[
          'flex size-12 shrink-0 items-center justify-center rounded-2xl transition-colors duration-300',
          sent
            ? 'bg-mint-100 text-mint-400'
            : canSend
              ? 'bg-action-accent text-inverse shadow-[0_8px_20px_-8px_rgb(76_34_97/0.6)]'
              : 'bg-muted text-secondary',
        ]"
        aria-hidden="true"
      >
        <VIcon :name="sent ? 'checkmark-circle-02' : canSend ? 'package' : 'clock-01'" :size="22" />
      </span>

      <div class="flex min-w-0 flex-1 flex-col gap-1.5">
        <div class="flex flex-wrap items-center gap-2">
          <h2 id="send-to-brand" class="text-h6 text-brand">
            {{ sent ? 'Sent to the brand' : 'Send to brand' }}
          </h2>
          <span
            v-if="!sent && !canSend && waiting.length"
            class="flex h-5 items-center rounded-full bg-status-warning px-2 text-p4 font-semibold text-orange-400"
          >
            {{ waiting.length }} waiting
          </span>
        </div>
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
          <ul v-if="waiting.length" class="flex flex-wrap gap-2 pt-2">
            <li
              v-for="item in waiting"
              :key="item.id"
              class="flex min-w-0 items-center gap-2 rounded-xl bg-subtle py-1.5 pr-3 pl-2 text-p3 font-medium text-primary"
            >
              <span
                class="flex size-5 shrink-0 items-center justify-center rounded-full bg-card text-secondary"
                aria-hidden="true"
              >
                <VIcon name="clock-01" :size="12" />
              </span>
              <span class="min-w-0">{{ item.reason }}</span>
            </li>
          </ul>
        </template>
      </div>
    </div>

    <VButton
      v-if="!sent"
      size="44"
      class="w-full shrink-0 md:w-auto md:min-w-[240px]"
      :disabled="!canSend || sending"
      @click="$emit('send')"
    >
      <VIcon name="checkmark-circle-02" />
      {{ sending ? 'Sending…' : 'Send to brand' }}
    </VButton>
  </section>
</template>
