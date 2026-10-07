<script setup lang="ts">
import {
  computed,
  nextTick,
  ref,
  useAttrs,
  useId,
  useTemplateRef,
  watch,
  type HTMLAttributes,
} from 'vue'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarNext,
  CalendarPrev,
  CalendarRoot,
  PopoverAnchor,
  PopoverContent,
  PopoverPortal,
  PopoverRoot,
} from 'reka-ui'
import { parseDate, type DateValue } from '@internationalized/date'
import { cn } from '@/shared/lib'
import { VIcon } from '@/shared/ui/icon'
import { selectTriggerClass } from '@/shared/ui/select'
import { formatCalendarDate } from './format-date'

defineOptions({ inheritAttrs: false })

// Date field: a select-like trigger (Figma "Field / Sep 18, 2024") that opens
// the month calendar (Figma "Dropdown / calendar / Open") on Reka Popover +
// Calendar: arrows move by day and week, PageUp/PageDown by month, Enter picks.
// The model is an ISO date, YYYY-MM-DD; empty when nothing is picked.
const {
  label,
  placeholder = 'Select date',
  required = false,
  error,
  disabled = false,
  class: className,
} = defineProps<{
  label?: string
  placeholder?: string
  // Marks the label with an asterisk.
  required?: boolean
  // Error message; a non-empty string switches the field to the error state.
  error?: string
  disabled?: boolean
  // Applied to the root wrapper. Other attributes (aria-label, name, …) go
  // to the trigger button.
  class?: HTMLAttributes['class']
}>()

const model = defineModel<string>({ default: '' })
const open = ref(false)
const trigger = useTemplateRef('trigger')

// Closing by Escape or by picking a day puts focus back on the field; a click
// elsewhere leaves it where the user clicked. Done here because Reka returns
// focus only to its own PopoverTrigger.
let clickedOutside = false
function onClickOutside() {
  clickedOutside = true
}
watch(open, (isOpen) => {
  if (isOpen) return
  if (!clickedOutside) void nextTick(() => trigger.value?.focus())
  clickedOutside = false
})

const attrs = useAttrs()
const fallbackId = useId()
const id = computed(() => (attrs.id as string | undefined) ?? fallbackId)
const errorId = computed(() => `${id.value}-error`)

// An unparsable model (hand-typed, wrong format) counts as empty.
const date = computed(() => {
  if (!model.value) return undefined
  try {
    return parseDate(model.value)
  } catch {
    return undefined
  }
})

function pick(value: DateValue | undefined) {
  if (!value) return
  model.value = value.toString()
  open.value = false
}

// "Sep 18, 2024", as in Figma. All the text here goes through
// formatCalendarDate, not Reka's formatter (see format-date.ts).
const display = computed(() =>
  date.value ? formatCalendarDate(date.value, { dateStyle: 'medium' }) : '',
)

const navClass =
  'flex size-7 items-center justify-center rounded-lg text-brand transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-violet-300 disabled:pointer-events-none disabled:text-tertiary'
</script>

<template>
  <div :class="cn('flex min-w-0 flex-col gap-2', className)">
    <label v-if="label" :for="id" class="text-p3 font-medium text-secondary">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-red-400"> *</span>
    </label>

    <PopoverRoot v-model:open="open">
      <!-- Our own button, not PopoverTrigger: that one replaces the id, and the
           <label for> must point at the button. The anchor positions the calendar. -->
      <PopoverAnchor as-child>
        <button
          v-bind="attrs"
          :id="id"
          ref="trigger"
          type="button"
          aria-haspopup="dialog"
          :aria-expanded="open"
          :disabled="disabled"
          :aria-invalid="error ? true : undefined"
          :aria-describedby="error ? errorId : undefined"
          :class="selectTriggerClass(!!error)"
          @click="open = !open"
        >
          <VIcon name="calendar-02" :size="16" class="shrink-0 text-secondary" />
          <span :class="['min-w-0 flex-1 truncate', !display && 'text-neutral-600']">
            {{ display || placeholder }}
          </span>
        </button>
      </PopoverAnchor>

      <PopoverPortal>
        <PopoverContent
          align="start"
          :side-offset="8"
          :collision-padding="16"
          @close-auto-focus.prevent
          @pointer-down-outside="onClickOutside"
          class="z-50 rounded-xl border border-default bg-card p-2 shadow-[0_8px_24px_rgb(33_20_59/0.13)] data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <CalendarRoot
            v-slot="{ grid }"
            :model-value="date"
            locale="en-US"
            :week-starts-on="1"
            prevent-deselect
            initial-focus
            @update:model-value="pick"
          >
            <CalendarHeader class="flex h-11 w-70 items-center justify-between p-1">
              <CalendarPrev :class="navClass" aria-label="Previous month">
                <VIcon name="arrow-left-02-sharp" :size="16" />
              </CalendarPrev>
              <!-- "September 2024": the month on screen, announced when it changes. -->
              <span v-if="grid[0]" aria-live="polite" class="text-p2 font-semibold text-primary">
                {{ formatCalendarDate(grid[0].value, { month: 'long', year: 'numeric' }) }}
              </span>
              <CalendarNext :class="navClass" aria-label="Next month">
                <VIcon name="arrow-right-02-sharp" :size="16" />
              </CalendarNext>
            </CalendarHeader>

            <CalendarGrid
              v-for="month in grid"
              :key="month.value.toString()"
              class="mt-0.5 w-70 border-collapse"
            >
              <CalendarGridHead>
                <CalendarGridRow class="flex">
                  <!-- Figma: two letters, "Mo"…"Su"; named after the first week's days. -->
                  <CalendarHeadCell
                    v-for="day in month.rows[0]"
                    :key="day.toString()"
                    class="flex h-8 w-10 items-center justify-center text-p3 font-medium text-secondary"
                  >
                    {{ formatCalendarDate(day, { weekday: 'short' }).slice(0, 2) }}
                  </CalendarHeadCell>
                </CalendarGridRow>
              </CalendarGridHead>
              <CalendarGridBody>
                <CalendarGridRow
                  v-for="(week, index) in month.rows"
                  :key="`week-${index}`"
                  class="mt-0.5 flex"
                >
                  <CalendarCell
                    v-for="day in week"
                    :key="day.toString()"
                    :date="day"
                    class="relative p-0"
                  >
                    <!-- Other months' days stay blank, as in Figma. -->
                    <CalendarCellTrigger
                      :day="day"
                      :month="month.value"
                      class="flex h-9 w-10 items-center justify-center rounded-lg text-table font-medium text-primary transition-colors outline-none hover:bg-subtle focus-visible:ring-2 focus-visible:ring-violet-300 data-disabled:pointer-events-none data-disabled:text-tertiary data-outside-view:invisible data-selected:bg-action-accent data-selected:text-inverse data-unavailable:text-tertiary data-unavailable:line-through"
                    />
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>
          </CalendarRoot>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>

    <p v-if="error" :id="errorId" class="text-p3 font-medium text-red-400">
      {{ error }}
    </p>
  </div>
</template>
