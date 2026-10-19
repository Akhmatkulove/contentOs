<script setup lang="ts">
import { useShootPlan } from '../model/shoot-plan'
import ShootForm from './ShootForm.vue'

// Create new shoot; Plan shoot from the backlog starts it with the brand's
// deliverable (docs/adr/0019).
const { plan, waiting } = useShootPlan()
</script>

<template>
  <p v-if="waiting" class="py-10 text-center text-p2 font-medium text-secondary">Loading…</p>
  <!-- Keyed by the URL: the form reads its starting state once. -->
  <ShootForm v-else :key="$route.fullPath" :plan="plan" />
</template>
