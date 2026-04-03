<script setup lang="ts">
import { cn } from '@docs/lib/utils';

defineProps<{
  class?: string;
}>();
</script>

<template>
  <div :class="cn('leading-none font-semibold tracking-tight', $props.class)">
    <slot />
  </div>
</template>
