<script setup lang="ts">
import { ReferenceCard } from '@/entities/reference'
import { useReferencesList } from '../model/references-list'

const { references } = useReferencesList()
</script>

<!-- TODO(ui): header, filters and empty state of the references page — not designed yet. -->
<template>
  <div class="flex flex-col gap-4 md:gap-5">
    <h1 class="text-h6 text-brand md:text-h3">References</h1>

    <ul
      v-if="references.length"
      class="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-4"
    >
      <li v-for="reference in references" :key="reference.id">
        <ReferenceCard :reference="reference" />
      </li>
    </ul>
  </div>
</template>
