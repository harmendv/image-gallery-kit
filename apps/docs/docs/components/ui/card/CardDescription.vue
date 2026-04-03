<script setup lang="ts">
import { cn } from '@docs/lib/utils';

defineProps<{
  class?: string;
}>();
</script>

<template>
  <div :class="cn('text-sm text-[var(--docs-muted-foreground)]', $props.class)">
    <slot />
  </div>
</template>
