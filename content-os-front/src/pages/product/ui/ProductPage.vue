<script setup lang="ts">
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui'
import { useTemplateRef } from 'vue'
import { ProductActionsMenu } from '@/features/product-actions'
import { useActiveTabInView } from '@/shared/lib'
import { VButton } from '@/shared/ui/button'
import { VIcon } from '@/shared/ui/icon'
import { VStatus } from '@/shared/ui/status'
import { useProductPage } from '../model/product-page'
import { productTabs } from '../model/product-tabs'
import ProductAbout from './ProductAbout.vue'
import ProductDeliverables from './ProductDeliverables.vue'
import ProductGallery from './ProductGallery.vue'
import ProductMoodboard from './ProductMoodboard.vue'
import ProductProgress from './ProductProgress.vue'
import ProductReferences from './ProductReferences.vue'
import ProductTeam from './ProductTeam.vue'

// The route's :id.
const { id } = defineProps<{ id: string }>()

const {
  product,
  loading,
  error,
  notFound,
  tab,
  canEdit,
  editRoute,
  status,
  meta,
  facts,
  deliverables,
  progress,
  team,
  moodboard,
  referenceSearch,
  referenceSort,
  references,
  deliverableSearch,
  foundDeliverables,
} = useProductPage(() => id)
useActiveTabInView(useTemplateRef('tabList'), tab)
</script>

<!--
  Figma "Product / Overview" (desktop) and the mobile Overview, References,
  Deliverables and Content screens. Edit, "+" and Add buttons are the owner's
  (the brand): each opens the edit form at its section.
  TODO(api): Upcoming shoots and Latest content cards — ProductResponse has no shoots,
  and content uploads don't exist yet.
-->
<template>
  <!-- Desktop: the summary column runs from the top, beside the back link. -->
  <div class="flex flex-col gap-4 md:gap-5 xl:flex-row xl:items-start">
    <div class="flex min-w-0 flex-1 flex-col gap-4 md:gap-5">
      <!-- TODO(ui): mobile topbar in AppLayout (Figma "CMS / Mobile / Topbar", Back
         variant with Edit and "…"); until then the page draws it. -->
      <div class="mb-4 flex min-h-11 items-center justify-between gap-4 md:mb-0 md:min-h-0">
        <RouterLink
          :to="{ name: 'products' }"
          class="flex items-center gap-1.5 text-p3 font-medium text-secondary transition-colors hover:text-brand"
        >
          <VIcon name="arrow-left-02-sharp" :size="14" />
          Back to products
        </RouterLink>
        <div v-if="product" class="flex items-center gap-1.5 md:hidden">
          <VButton
            v-if="canEdit"
            as-child
            variant="surface"
            class="h-11 gap-2 px-3.5 text-p2 font-semibold text-link"
          >
            <RouterLink :to="editRoute()">
              <VIcon name="edit-02" :size="14" />
              Edit
            </RouterLink>
          </VButton>
          <ProductActionsMenu :product="product" :can-edit="canEdit">
            <template #trigger>
              <VButton
                variant="surface"
                size="icon-44"
                aria-label="Product actions"
                class="data-[state=open]:inset-ring-[1.5px] data-[state=open]:inset-ring-violet-400"
              >
                <VIcon name="more-horizontal" :size="18" />
              </VButton>
            </template>
          </ProductActionsMenu>
        </div>
      </div>

      <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

      <p v-else-if="!product" class="py-10 text-center text-p2 font-medium text-secondary">
        {{
          notFound
            ? 'This product doesn’t exist or you don’t have access to it.'
            : error
              ? 'Couldn’t load the product. Please try again.'
              : ''
        }}
      </p>

      <template v-else>
        <header class="flex items-center justify-between gap-4">
          <div class="flex min-w-0 flex-col gap-2">
            <h1 class="text-h4 break-words text-primary md:text-h3">{{ product.name }}</h1>
            <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
              <p v-if="meta.length" class="text-p2 font-medium text-secondary">
                <template v-for="(part, index) in meta" :key="index">
                  <span v-if="index" aria-hidden="true" class="mx-2">·</span>{{ part }}
                </template>
              </p>
              <VStatus v-if="status" :tone="status.tone">{{ status.label }}</VStatus>
            </div>
          </div>
          <div class="hidden shrink-0 items-center gap-3 md:flex">
            <VButton v-if="canEdit" as-child variant="secondary" size="36" class="px-4.5">
              <RouterLink :to="editRoute()">
                <VIcon name="edit-02" />
                Edit
              </RouterLink>
            </VButton>
            <ProductActionsMenu :product="product" :can-edit="canEdit">
              <template #trigger>
                <VButton
                  variant="ghost"
                  size="icon-24"
                  aria-label="Product actions"
                  class="text-primary data-[state=open]:bg-status-accent"
                >
                  <VIcon name="more-horizontal" :size="18" />
                </VButton>
              </template>
            </ProductActionsMenu>
          </div>
        </header>

        <div class="flex items-start gap-5">
          <!-- Desktop: the gallery stays on the left whatever the tab. -->
          <ProductGallery
            :photos="product.photos"
            :name="product.name"
            :add-to="canEdit ? editRoute('photos') : null"
            class="hidden w-[260px] shrink-0 md:flex"
          />

          <TabsRoot v-model="tab" class="flex min-w-0 flex-1 flex-col gap-4 md:gap-5">
            <!-- Mobile: Figma "CMS / Mobile / Tab", equal widths; desktop: "Product tabs".
                 One underline slides between the tabs (Reka sizes it to the active one).
                 Tabs that don't fit scroll sideways; the bottom line is an inset shadow,
                 not a border, so the underline covers it inside the scroll box. -->
            <TabsList
              ref="tabList"
              aria-label="Product"
              class="scrollbar-none relative flex overflow-x-auto shadow-[inset_0_-2px_0_var(--border-color-strong)] md:gap-2 md:shadow-[inset_0_-1px_0_var(--border-color-default)]"
            >
              <TabsTrigger
                v-for="item in productTabs"
                :key="item.value"
                :value="item.value"
                class="flex flex-1 items-center justify-center px-4 py-2 text-p2 font-medium whitespace-nowrap text-tertiary transition-colors outline-none hover:text-primary focus-visible:ring-2 focus-visible:ring-violet-300 focus-visible:ring-inset data-[state=active]:text-primary md:h-11 md:flex-none md:px-5 md:font-semibold md:text-secondary md:data-[state=active]:text-link"
              >
                {{ item.label }}
              </TabsTrigger>
              <TabsIndicator
                class="absolute bottom-0 left-0 h-0.5 w-(--reka-tabs-indicator-size) translate-x-(--reka-tabs-indicator-position) bg-neutral-900 transition-[width,translate] duration-200 motion-reduce:transition-none md:bg-violet-400"
              />
            </TabsList>

            <TabsContent value="overview" class="flex flex-col gap-4 outline-none md:gap-5">
              <ProductGallery
                :photos="product.photos"
                :name="product.name"
                :add-to="canEdit ? editRoute('photos') : null"
                class="md:hidden"
              />
              <ProductAbout
                :about="product.about"
                :facts="facts"
                :tags="product.tags"
                :add-to="canEdit ? editRoute('details') : null"
              />
              <ProductMoodboard
                v-if="moodboard.length || canEdit"
                :images="moodboard"
                :edit-to="canEdit ? editRoute('references') : null"
              />
            </TabsContent>

            <TabsContent value="references" class="outline-none">
              <ProductReferences
                v-model:search="referenceSearch"
                v-model:sort="referenceSort"
                :references="references"
                :total="product.references.length"
                :add-to="canEdit ? editRoute('references') : null"
              />
            </TabsContent>

            <TabsContent value="deliverables" class="outline-none">
              <ProductDeliverables
                v-model:search="deliverableSearch"
                :deliverables="foundDeliverables"
                :total="deliverables.length"
                :add-to="canEdit ? editRoute('deliverables') : null"
              />
            </TabsContent>

            <!-- TODO(api): the product's content — content uploads don't exist yet. -->
            <TabsContent value="content" class="outline-none">
              <p class="rounded-2xl bg-card p-8 text-center text-p2 font-medium text-secondary">
                Content from the shoots will show up here.
              </p>
            </TabsContent>
          </TabsRoot>
        </div>
      </template>
    </div>

    <aside
      v-if="product"
      aria-label="Product summary"
      class="flex flex-col gap-5 xl:w-[296px] xl:shrink-0"
    >
      <ProductProgress :progress="progress" />
      <ProductTeam v-if="team.length" :members="team" />
    </aside>
  </div>
</template>
