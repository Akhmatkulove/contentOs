<script setup lang="ts">
import { useId } from 'vue'
import { VAvatar } from '@/shared/ui/avatar'
import { VButton } from '@/shared/ui/button'
import { VCheckbox } from '@/shared/ui/checkbox'
import { VIcon } from '@/shared/ui/icon'
import { VInput } from '@/shared/ui/input'
import { VListPicker } from '@/shared/ui/list-picker'
import { VModal } from '@/shared/ui/modal'
import { VSelect } from '@/shared/ui/select'
import { VTextarea } from '@/shared/ui/textarea'
import type { ShootNote, ShootNoteBody } from '../api/notes'
import { useNoteForm } from '../model/note-form'
import { noteTypeOptions, noteVisibilityOptions, visibilityHints } from '../model/notes'
import type { TeamMember } from '../model/shoot'

// Figma "Card / New note modal": New note, or Edit note with `note`. Closes
// with the request; the page saves it.
const { team, note } = defineProps<{ team: TeamMember[]; note?: ShootNote }>()

const emit = defineEmits<{ close: [body?: ShootNoteBody] }>()

const { form, errors, assignees, toggleAssignee, chooseType, chooseVisibility, submit } =
  useNoteForm(team, note)

async function onSubmit() {
  const body = await submit()
  if (body) emit('close', body)
}

const memberName = (member: TeamMember) => member.name ?? ''

// The submit button sits in the modal footer, outside the <form>.
const formId = useId()
const pinId = useId()
const assignId = useId()
</script>

<template>
  <!-- Figma: 576px content, 32px padding, 20px gaps. -->
  <VModal
    :title="note ? 'Edit note' : 'New note'"
    class="md:max-w-160 md:gap-5 md:rounded-[20px] md:p-8"
  >
    <form :id="formId" class="flex flex-col gap-3.5 md:gap-5" @submit.prevent="onSubmit">
      <VInput
        v-model="form.title"
        label="Title"
        required
        placeholder="Enter here"
        :error="errors.title"
      />

      <div class="grid grid-cols-1 gap-3.5 md:grid-cols-2 md:gap-4">
        <VSelect
          :model-value="form.type"
          :options="noteTypeOptions"
          label="Type"
          @update:model-value="chooseType"
        />
        <div class="flex flex-col gap-1.5">
          <VSelect
            :model-value="form.visibility"
            :options="noteVisibilityOptions"
            label="Visibility"
            @update:model-value="chooseVisibility"
          />
          <p class="text-p4 font-medium text-secondary">{{ visibilityHints[form.visibility] }}</p>
        </div>
      </div>

      <VTextarea
        v-model="form.body"
        label="Note"
        required
        :rows="5"
        placeholder="One point per line"
        :error="errors.body"
      />

      <div class="flex items-start gap-3">
        <VCheckbox :id="pinId" v-model="form.pinned" class="mt-0.5" />
        <label :for="pinId" class="flex cursor-pointer flex-col gap-1">
          <span class="text-p2 font-medium text-primary">Pin note</span>
          <span class="text-p3 font-medium text-secondary"
            >Keep this note at the top of the list.</span
          >
        </label>
      </div>

      <div role="group" :aria-labelledby="assignId" class="flex min-w-0 flex-col gap-2">
        <span :id="assignId" class="text-p3 font-medium text-secondary">Assign to</span>
        <!-- Chips and "Add teammates…" in one pill box, as in Figma. -->
        <ul
          class="flex min-h-11 flex-wrap items-center gap-2 rounded-3xl border border-default p-1.5"
        >
          <li
            v-for="member in assignees"
            :key="member.id"
            class="flex h-9 items-center gap-1.5 rounded-full bg-subtle pr-3 pl-1.5"
          >
            <VAvatar :name="member.name" :src="member.photo_url" :size="24" />
            <span class="text-p3 font-medium text-primary">{{ member.name || 'Unnamed' }}</span>
            <!-- 12px like Figma; ::after widens the tap area to 28px. -->
            <VButton
              variant="ghost"
              size="icon-24"
              :aria-label="`Remove ${member.name || 'teammate'}`"
              class="relative size-3 text-secondary after:absolute after:-inset-2 hover:text-primary"
              @click="toggleAssignee(member.id)"
            >
              <VIcon name="multiplication-sign" :size="12" />
            </VButton>
          </li>
          <li class="flex flex-1">
            <VListPicker
              :items="team"
              :selected="form.assigneeIds"
              :text="memberName"
              multiple
              label="Assign to"
              empty-text="The shoot has no team yet."
              @toggle="toggleAssignee"
            >
              <template #item="{ item }">
                <VAvatar :name="item.name" :src="item.photo_url" :size="24" />
                <span class="min-w-0 flex-1 truncate">{{ item.name || 'Unnamed' }}</span>
              </template>
              <button
                type="button"
                class="h-8 min-w-32 flex-1 rounded-full px-2.5 text-left text-p3 font-medium text-neutral-600 outline-none focus-visible:ring-2 focus-visible:ring-violet-300"
              >
                Add teammates…
              </button>
            </VListPicker>
          </li>
        </ul>
      </div>
    </form>

    <template #footer>
      <div class="flex items-center gap-2.5 md:justify-end md:gap-3">
        <VButton
          variant="secondary"
          class="flex-1 md:w-[134px] md:flex-none"
          @click="emit('close')"
        >
          Cancel
        </VButton>
        <VButton type="submit" :form="formId" class="flex-1 md:flex-none md:px-5">
          <VIcon name="tick-01" />
          {{ note ? 'Save changes' : 'Create note' }}
        </VButton>
      </div>
    </template>
  </VModal>
</template>
