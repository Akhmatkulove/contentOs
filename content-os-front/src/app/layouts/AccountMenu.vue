<script setup lang="ts">
import { DropdownMenuSeparator } from 'reka-ui'
import { useRouter } from 'vue-router'
import { useLogout } from '@/features/logout'
import { VAvatar } from '@/shared/ui/avatar'
import { VDropdownMenu, VDropdownMenuItem } from '@/shared/ui/dropdown-menu'
import { VIcon } from '@/shared/ui/icon'

// Figma "Account menu": opens from the profile block at the bottom of the
// sidebar, so it goes up. The block itself comes in #trigger.
// Notification settings, Appearance, Keyboard shortcuts and Switch account
// are left out for now.
const { name, role, photoUrl } = defineProps<{
  name: string
  role: string
  photoUrl: string | null
}>()

const router = useRouter()
const { logout, loggingOut } = useLogout()

const itemClass = 'rounded-[10px] data-highlighted:bg-status-accent'
</script>

<template>
  <VDropdownMenu
    side="top"
    content-class="w-66 gap-1 rounded-[20px] p-3 shadow-[0_8px_14px_rgb(20_8_31/0.12)]"
  >
    <template #trigger>
      <slot />
    </template>

    <div class="flex h-16 items-center gap-3 px-2">
      <VAvatar :name="name" :src="photoUrl" :size="40" />
      <div class="flex min-w-0 flex-col gap-1">
        <p class="truncate text-p2 font-semibold text-primary">{{ name }}</p>
        <p class="truncate text-p3 font-medium text-secondary">{{ role }}</p>
      </div>
    </div>

    <VDropdownMenuItem :class="itemClass" @select="router.push({ name: 'profile' })">
      <VIcon name="user" :size="18" class="text-link" />
      My profile
    </VDropdownMenuItem>
    <VDropdownMenuItem :class="itemClass" @select="router.push({ name: 'help' })">
      <VIcon name="help-circle" :size="18" class="text-link" />
      Help &amp; support
    </VDropdownMenuItem>

    <DropdownMenuSeparator class="mx-2 my-[7.5px] h-px bg-neutral-300" />

    <VDropdownMenuItem :class="[itemClass, 'text-red-400']" :disabled="loggingOut" @select="logout">
      <VIcon name="logout-square-01" :size="18" />
      Log out
    </VDropdownMenuItem>
  </VDropdownMenu>
</template>
