<script setup lang="ts">
import { useId } from 'vue'
import { deliverableStatusOptions } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VDatePicker } from '@/shared/ui/date-picker'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VModal } from '@/shared/ui/modal'
import { selectChevronClass, selectTriggerClass, VSelect } from '@/shared/ui/select'
import type { DeliverableContext } from '../model/add-deliverable'
import { productOptions, useAddDeliverableForm } from '../model/add-deliverable-form'
import {
  firstAndMore,
  type DeliverableReference,
  type ShootDeliverable,
  type TeamMember,
} from '../model/shoot-draft'
import ListPicker from './ListPicker.vue'
import MediaPreview from './MediaPreview.vue'

// Figma "Edit / Edit product" (Add deliverable) for a shoot. Everything is
// picked from what the shoot has: its ticked products, its team (several
// assignees) and its ticked references. References aren't in Figma yet: a field
// in the same style under due date and status.
const { context } = defineProps<{ context: DeliverableContext }>()

// Closes with the new deliverable; nothing when cancelled.
const emit = defineEmits<{ close: [deliverable?: ShootDeliverable] }>()

const {
  form,
  errors,
  assignees,
  references,
  toggleAssignee,
  toggleReference,
  chooseStatus,
  submit,
} = useAddDeliverableForm(context)

async function onSubmit() {
  const deliverable = await submit()
  if (deliverable) emit('close', deliverable)
}

const memberName = (member: TeamMember) => member.name ?? ''
const referenceTitle = (reference: DeliverableReference) => reference.title

// The submit button sits in the modal footer, outside the <form>.
const formId = useId()
const assigneeId = useId()
const referencesId = useId()
</script>

<template>
  <!-- Figma: 704px content, 28px padding, 20px gaps and radius. -->
  <VModal title="Add deliverable" class="md:max-w-190 md:gap-5 md:rounded-[20px] md:p-7">
    <form :id="formId" class="flex flex-col gap-3.5 md:gap-5" @submit.prevent="onSubmit">
      <VInput
        v-model="form.name"
        label="Deliverable"
        required
        placeholder="Enter here"
        :error="errors.name"
      />

      <div class="grid gap-3.5 md:grid-cols-2 md:gap-5">
        <VSelect
          v-model="form.productId"
          :options="productOptions(context)"
          label="Product"
          required
          placeholder="Select"
          :error="errors.productId"
        />

        <div class="flex min-w-0 flex-col gap-2">
          <label :for="assigneeId" class="text-p3 font-medium text-secondary">Assignee</label>
          <ListPicker
            :items="context.team"
            :selected="form.assigneeIds"
            :text="memberName"
            multiple
            label="Assignee"
            empty-text="Add creators to the shoot's team first."
            @toggle="toggleAssignee"
          >
            <template #default>
              <button :id="assigneeId" type="button" :class="selectTriggerClass(false)">
                <span v-if="assignees.length" class="flex shrink-0 -space-x-2">
                  <VAvatar
                    v-for="member in assignees.slice(0, 3)"
                    :key="member.id"
                    :name="member.name"
                    :src="member.photo_url"
                    :size="24"
                    class="ring-2 ring-card"
                  />
                </span>
                <span
                  :class="[
                    'min-w-0 flex-1 truncate',
                    assignees.length ? 'text-primary' : 'text-neutral-600',
                  ]"
                >
                  {{
                    firstAndMore(assignees.map((member) => member.name || 'Unnamed')) || 'Select'
                  }}
                </span>
                <VIcon name="arrow-down-01-sharp" :size="16" :class="selectChevronClass" />
              </button>
            </template>
            <template #item="{ item }">
              <VAvatar :name="item.name" :src="item.photo_url" :size="24" />
              <span class="min-w-0 flex-1 truncate">{{ item.name || 'Unnamed' }}</span>
            </template>
          </ListPicker>
        </div>

        <VDatePicker v-model="form.dueDate" label="Due date" placeholder="Select due date" />
        <VSelect
          :model-value="form.status"
          :options="deliverableStatusOptions"
          label="Status"
          placeholder="Select status"
          @update:model-value="chooseStatus"
        />
      </div>

      <div class="flex min-w-0 flex-col gap-2">
        <label :for="referencesId" class="text-p3 font-medium text-secondary">References</label>
        <ListPicker
          :items="context.references"
          :selected="form.referenceIds"
          :text="referenceTitle"
          multiple
          label="References"
          search-placeholder="Search references…"
          empty-text="Add references to the shoot first."
          @toggle="toggleReference"
        >
          <template #default>
            <button :id="referencesId" type="button" :class="selectTriggerClass(false)">
              <MediaPreview
                v-if="references[0]"
                :src="references[0].previewUrl"
                :icon-size="12"
                class="h-7 w-[22px] rounded-md"
              />
              <span
                :class="[
                  'min-w-0 flex-1 truncate',
                  references.length ? 'text-primary' : 'text-neutral-600',
                ]"
              >
                {{
                  firstAndMore(references.map((reference) => reference.title)) ||
                  (context.references.length ? 'All shoot references' : 'Select')
                }}
              </span>
              <VIcon name="arrow-down-01-sharp" :size="16" :class="selectChevronClass" />
            </button>
          </template>
          <template #item="{ item }">
            <MediaPreview :src="item.previewUrl" :icon-size="12" class="h-7 w-[22px] rounded-md" />
            <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
          </template>
        </ListPicker>
      </div>
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
