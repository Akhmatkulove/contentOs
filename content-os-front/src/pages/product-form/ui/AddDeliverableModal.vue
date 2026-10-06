<script setup lang="ts">
import { useId } from 'vue'
import { deliverableStatusOptions } from '@/entities/deliverable'
import { VButton } from '@/shared/ui/button'
import { VInput } from '@/shared/ui/input'
import { VModal } from '@/shared/ui/modal'
import { VSelect } from '@/shared/ui/select'
import { VTextarea } from '@/shared/ui/textarea'
import type { DeliverableContext } from '../model/add-deliverable'
import { useAddDeliverableForm } from '../model/add-deliverable-form'
import type { DeliverableDraft } from '../model/deliverable-draft'

// Figma "Edit / Edit task" (Add deliverable). The product comes from the page.
const { context } = defineProps<{ context: DeliverableContext }>()

// Closes with the new draft; nothing when cancelled.
const emit = defineEmits<{ close: [draft?: DeliverableDraft] }>()

const { form, errors, assignees, assigneesLoading, chooseStatus, submit } = useAddDeliverableForm()

async function onSubmit() {
  const draft = await submit()
  if (draft) emit('close', draft)
}

// The submit button sits in the modal footer, outside the <form>.
const formId = useId()
</script>

<template>
  <!-- Figma: 704px content, 32px padding, 20px gaps and radius. -->
  <VModal title="Add deliverable" class="md:max-w-192 md:gap-5 md:rounded-[20px] md:p-8">
    <form :id="formId" class="flex flex-col gap-3.5 md:gap-5" @submit.prevent="onSubmit">
      <VInput
        v-model="form.name"
        label="Deliverable"
        required
        placeholder="Enter deliverable"
        :error="errors.name"
      />

      <div class="grid gap-3.5 md:grid-cols-2 md:gap-5">
        <!-- Taken from the product, so not editable here. -->
        <VInput :model-value="context.product" label="Product" disabled />
        <VSelect
          v-model="form.assigneeId"
          :options="assignees"
          label="Assignee"
          required
          :error="errors.assigneeId"
          :placeholder="assigneesLoading ? 'Loading…' : 'Select art director'"
        />
        <VSelect
          :model-value="form.status"
          :options="deliverableStatusOptions"
          label="Status"
          placeholder="Select status"
          @update:model-value="chooseStatus"
        />
        <!-- TODO(ui): VDatePicker — Figma shows a select with a chevron; native date input until then. -->
        <VInput v-model="form.dueDate" label="Due date" type="date" />
      </div>

      <VTextarea v-model="form.brief" label="Brief" placeholder="Add a brief…" :rows="4" />
    </form>

    <template #footer>
      <div class="flex items-center gap-2.5 md:justify-end md:gap-3">
        <VButton
          variant="secondary"
          class="flex-1 md:w-[115px] md:flex-none"
          @click="emit('close')"
        >
          Cancel
        </VButton>
        <VButton type="submit" :form="formId" class="flex-1 md:flex-none">Add deliverable</VButton>
      </div>
    </template>
  </VModal>
</template>
