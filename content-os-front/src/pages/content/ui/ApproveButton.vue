<script setup lang="ts">
import { shallowRef, watch } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'

const { approvedAt, canApprove, pending } = defineProps<{
  // When the brand approved; null — not yet.
  approvedAt: string | null
  // The brand, while the content isn't approved.
  canApprove: boolean
  pending: boolean
}>()
const emit = defineEmits<{ approve: [] }>()

// The "Approved" pill shows only for an approval made here: on a page that
// opens already approved the status chip by the title says it. The parent keys
// the button by the deliverable, so Previous / Next start it afresh.
const celebrate = shallowRef(false)
watch(
  () => approvedAt,
  (now, before) => {
    if (now && before === null) celebrate.value = true
  },
)

// Eight sparks around the check, each with its own direction and colour.
const sparks = [
  'bg-mint-300',
  'bg-pink-200',
  'bg-yellow-300',
  'bg-violet-200',
  'bg-mint-200',
  'bg-pink-300',
  'bg-yellow-400',
  'bg-violet-300',
].map((color, index) => ({ color, angle: `${index * 45 + 20}deg` }))
</script>

<!--
  Not in Figma: the brand's Approve next to Copy link, the same 40px pill.
  A ring of the brand colours runs around it with a soft glow under it that
  wakes up on hover. On approval it turns into a mint "Approved": the check
  draws itself and a few sparks fly out. Reduced motion keeps the ring still
  and only swaps the colours.
-->
<template>
  <!-- Collapses when it has nothing to show (comments don't count for :empty). -->
  <span aria-live="polite" class="flex empty:hidden">
    <span
      v-if="approvedAt && celebrate"
      role="status"
      class="approve-settle relative inline-flex h-10 w-full shrink-0 items-center justify-center gap-2 rounded-full bg-mint-100 pr-4.5 pl-1.5 text-p2 font-semibold text-mint-400"
    >
      <span class="relative flex size-7 items-center justify-center">
        <span aria-hidden="true" class="approve-burst absolute inset-0 rounded-full bg-mint-200" />
        <span
          v-for="spark in sparks"
          :key="spark.angle"
          aria-hidden="true"
          :class="['approve-spark absolute top-1/2 left-1/2 size-1.5 rounded-full', spark.color]"
          :style="{ '--angle': spark.angle }"
        />
        <span class="relative flex size-7 items-center justify-center rounded-full bg-card">
          <VIcon name="tick-01" :size="16" class="approve-check" />
        </span>
      </span>
      Approved
    </span>

    <span
      v-else-if="canApprove"
      class="approve-ring group relative isolate inline-flex w-full shrink-0 rounded-full p-[1.5px]"
    >
      <span aria-hidden="true" class="approve-glow absolute -inset-1 -z-10 rounded-full" />
      <VButton
        :disabled="pending"
        :aria-busy="pending"
        class="relative h-[37px] w-full gap-2 pr-4.5 pl-3.5 transition-[background-color,scale] duration-200 hover:bg-inverse active:scale-[0.97] disabled:bg-inverse"
        @click="emit('approve')"
      >
        <span
          v-if="pending"
          aria-hidden="true"
          class="size-4 animate-spin rounded-full border-2 border-violet-300 border-t-white"
        />
        <VIcon
          v-else
          name="checkmark-circle-02"
          :size="16"
          class="transition-transform duration-300 ease-out group-hover:scale-110 group-hover:-rotate-12 motion-reduce:transition-none"
        />
        {{ pending ? 'Approving…' : 'Approve' }}
      </VButton>
    </span>
  </span>
</template>

<style scoped>
/* The ring's angle animates as a real angle, so the gradient turns smoothly. */
@property --approve-angle {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

/* A bright arc of the brand colours chasing round the pill. */
.approve-ring,
.approve-glow {
  background: conic-gradient(
    from var(--approve-angle),
    var(--color-violet-400) 0deg,
    var(--color-pink-200) 70deg,
    var(--color-yellow-300) 130deg,
    var(--color-mint-200) 190deg,
    var(--color-violet-200) 250deg,
    var(--color-violet-400) 360deg
  );
  animation: approve-spin 3.2s linear infinite;
}

/* The same colours, blurred under the button; brighter on hover and focus. */
.approve-glow {
  filter: blur(10px);
  opacity: 0.35;
  transition: opacity 0.3s ease-out;
}

.group:hover .approve-glow,
.group:focus-within .approve-glow {
  opacity: 0.7;
}

@keyframes approve-spin {
  to {
    --approve-angle: 360deg;
  }
}

/* The check draws itself: the sprite's path inherits the dash from the svg. */
.approve-check {
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  animation: approve-check 0.45s cubic-bezier(0.65, 0, 0.35, 1) 0.15s forwards;
}

@keyframes approve-check {
  to {
    stroke-dashoffset: 0;
  }
}

.approve-burst {
  animation: approve-burst 0.7s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}

@keyframes approve-burst {
  from {
    opacity: 0.9;
    transform: scale(0.8);
  }
  to {
    opacity: 0;
    transform: scale(2.2);
  }
}

.approve-spark {
  opacity: 0;
  animation: approve-spark 0.75s cubic-bezier(0.2, 0.7, 0.3, 1) 0.1s forwards;
}

@keyframes approve-spark {
  0% {
    opacity: 1;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(6px) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) rotate(var(--angle)) translateX(28px) scale(0.4);
  }
}

/* The pill pops in place of the button. */
.approve-settle {
  animation: approve-settle 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes approve-settle {
  from {
    transform: scale(0.94);
  }
  to {
    transform: scale(1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .approve-ring,
  .approve-glow,
  .approve-settle {
    animation: none;
  }

  .approve-burst,
  .approve-spark {
    display: none;
  }

  .approve-check {
    animation: none;
    stroke-dashoffset: 0;
  }
}
</style>
