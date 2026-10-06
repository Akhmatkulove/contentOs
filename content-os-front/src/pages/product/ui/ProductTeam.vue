<script setup lang="ts">
import type { Assignee } from '@/entities/deliverable'
import { VAvatar } from '@/shared/ui/avatar'

// Figma "Card / Team": who works on the product. For now the art directors of
// its deliverables.
const { members } = defineProps<{ members: Assignee[] }>()
</script>

<template>
  <section class="flex flex-col gap-4 rounded-2xl bg-card p-5" aria-labelledby="product-team">
    <h2 id="product-team" class="text-p1 font-semibold text-primary">Team</h2>
    <!-- Figma "CMS / Shared / Team member row". -->
    <ul class="flex flex-col gap-4">
      <li v-for="member in members" :key="member.id" class="flex h-11 items-center gap-3">
        <VAvatar :name="member.name" :src="member.photo_url" :size="36" />
        <div class="flex min-w-0 flex-col gap-1">
          <p class="truncate text-p2 font-semibold text-primary">{{ member.name || 'Unnamed' }}</p>
          <p class="text-p3 font-medium text-secondary">Art Director</p>
        </div>
      </li>
    </ul>
  </section>
</template>
