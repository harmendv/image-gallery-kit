<script setup lang="ts">
import { cn } from '@docs/lib/utils';

defineProps<{
  class?: string;
}>();
</script>

<template>
  <label :class="cn('flex items-center gap-2 text-sm leading-none font-medium select-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50', $props.class)">
    <slot />
  </label>
</template>
