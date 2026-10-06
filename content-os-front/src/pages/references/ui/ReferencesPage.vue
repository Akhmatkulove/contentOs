<script setup lang="ts">
import { ReferenceCard } from '@/entities/reference'
import { VPagination } from '@/shared/ui/pagination'
import { REFERENCES_PER_PAGE, useReferencesList } from '../model/references-list'

const { references, total, loading, page } = useReferencesList()
</script>

<!-- TODO(ui): header, filters and empty state of the references page — not designed yet. -->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <h1 class="text-h6 text-brand md:text-h3">References</h1>

    <p v-if="loading" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>

    <template v-else-if="references.length">
      <ul class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4">
        <li v-for="reference in references" :key="reference.id">
          <ReferenceCard :reference="reference" />
        </li>
      </ul>
      <VPagination
        v-if="total > REFERENCES_PER_PAGE"
        v-model:page="page"
        :total="total"
        :items-per-page="REFERENCES_PER_PAGE"
        class="self-center md:self-end"
      />
    </template>

    <p v-else class="py-10 text-center text-p2 font-medium text-secondary">
      References show up here once a brand assigns you a deliverable.
    </p>
  </div>
</template>
