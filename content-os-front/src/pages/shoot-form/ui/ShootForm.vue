<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VNotificationButton } from '@/shared/ui/notification-button'
import { useShootForm } from '../model/shoot-form'
import { useShootTeam } from '../model/shoot-team'
import ShootDeliverablesSection from './ShootDeliverablesSection.vue'
import ShootDetailsSection from './ShootDetailsSection.vue'
import ShootProductsSection from './ShootProductsSection.vue'
import ShootReferencesSection from './ShootReferencesSection.vue'
import ShootTeamSection from './ShootTeamSection.vue'

// Create new shoot (Figma "SCREEN:s_new Create new shoot" and its mobile
// state): details, team, products, references, deliverables.
const {
  details,
  errors,
  products,
  productSearch,
  selectedProducts,
  browseProducts,
  references,
  selectedReferences,
  browseReferences,
  deliverables,
  selectedDeliverables,
  submit,
  saveDraft,
} = useShootForm()
const {
  artDirector,
  loading: teamLoading,
  creatorIds,
  creators,
  creatorOptions,
  mobilographerId,
  mobilographer,
  mobilographerOptions,
} = useShootTeam()

const formElement = useTemplateRef('formElement')

// A failed submit moves focus to the first invalid field: the browser scrolls to
// it (the mobile button is at the bottom, the fields at the top) and a screen
// reader reads its error.
async function onSubmit() {
  if (await submit()) return
  await nextTick()
  formElement.value?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}
</script>

<template>
  <!-- Bottom padding on mobile clears the fixed action bar. -->
  <form
    ref="formElement"
    novalidate
    class="flex flex-col gap-4 pb-20 md:gap-5 md:pb-0"
    @submit.prevent="onSubmit"
  >
    <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar", Back variant); move the back link and the bell there. -->
    <div class="mb-2 flex items-center justify-between gap-4 md:mb-0">
      <RouterLink
        :to="{ name: 'shoots' }"
        class="flex items-center gap-1.5 text-p3 font-medium text-secondary transition-colors hover:text-brand"
      >
        <VIcon name="arrow-left-02-sharp" :size="14" />
        Back to shoots
      </RouterLink>
      <VNotificationButton unread class="lg:hidden" />
    </div>

    <header class="flex items-center justify-between gap-4 md:min-h-16">
      <div class="flex min-w-0 flex-col gap-1.5">
        <h1 class="text-h3 text-brand">Create new shoot</h1>
        <p class="max-w-[247px] text-p2 font-medium text-secondary md:max-w-none">
          Plan a new shoot, assign your team, and select the products to capture.
        </p>
      </div>
      <div class="hidden shrink-0 items-center gap-2.5 md:flex">
        <VButton variant="secondary" @click="saveDraft">Save draft</VButton>
        <VButton type="submit">
          <VIcon name="tick-01" />
          Create shoot
        </VButton>
      </div>
    </header>

    <ShootDetailsSection
      v-model:name="details.name"
      v-model:date="details.date"
      v-model:location="details.location"
      v-model:start-time="details.startTime"
      v-model:duration="details.duration"
      :errors="errors"
    />

    <ShootTeamSection
      v-model:creator-ids="creatorIds"
      v-model:mobilographer-id="mobilographerId"
      :art-director="artDirector"
      :creators="creators"
      :creator-options="creatorOptions"
      :mobilographer="mobilographer"
      :mobilographer-options="mobilographerOptions"
      :loading="teamLoading"
    />

    <ShootProductsSection
      v-model:search="productSearch"
      v-model:selected="selectedProducts"
      :products="products"
      :error="errors.products"
      @browse="browseProducts"
    />

    <ShootReferencesSection
      v-model:selected="selectedReferences"
      :references="references"
      @browse="browseReferences"
    />

    <ShootDeliverablesSection
      v-model:selected="selectedDeliverables"
      :deliverables="deliverables"
    />

    <!-- Figma "Form footer": the header's actions again after the long form. -->
    <div class="hidden justify-end gap-3 py-2 md:flex">
      <VButton variant="secondary" @click="saveDraft">Save draft</VButton>
      <VButton type="submit">
        <VIcon name="tick-01" />
        Create shoot
      </VButton>
    </div>

    <!-- Figma "Fixed actions": on mobile the actions stay above the tab bar. -->
    <div
      class="fixed inset-x-0 bottom-[calc(60px+env(safe-area-inset-bottom))] flex gap-2 bg-card px-4 pt-4 pb-6 md:hidden"
    >
      <VButton variant="secondary" class="flex-1" @click="saveDraft">Save draft</VButton>
      <VButton type="submit" class="flex-1">
        <VIcon name="tick-01" />
        Create shoot
      </VButton>
    </div>
  </form>
</template>
