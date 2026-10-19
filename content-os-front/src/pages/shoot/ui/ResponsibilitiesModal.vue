<script setup lang="ts">
import { useId } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VModal } from '@/shared/ui/modal'
import { VTextarea } from '@/shared/ui/textarea'
import type { ResponsibilitiesBody } from '../api/responsibilities'
import { useResponsibilitiesForm } from '../model/responsibilities-form'

// Add / Edit responsibilities of a team member, laid out like the note modal:
// one point per line. Closes with the request; the page saves it.
const { name, text } = defineProps<{ name: string; text: string }>()

const emit = defineEmits<{ close: [body?: ResponsibilitiesBody] }>()

const { form, errors, submit } = useResponsibilitiesForm(text)

async function onSubmit() {
  const body = await submit()
  if (body) emit('close', body)
}

// The submit button sits in the modal footer, outside the <form>.
const formId = useId()
</script>

<template>
  <VModal
    :title="text ? 'Edit responsibilities' : 'Add responsibilities'"
    :description="`What ${name} does on this shoot.`"
    class="md:max-w-160 md:gap-5 md:rounded-[20px] md:p-8"
  >
    <form :id="formId" class="flex flex-col gap-3.5 md:gap-5" @submit.prevent="onSubmit">
      <VTextarea
        v-model="form.responsibilities"
        label="Responsibilities"
        :rows="5"
        placeholder="One point per line"
        :error="errors.responsibilities"
      />
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
          Save
        </VButton>
      </div>
    </template>
  </VModal>
</template>
