<script setup lang="ts">
import { cn } from '@docs/lib/utils';

defineProps<{
  class?: string;
}>();
</script>

<template>
  <div
    :class="cn('rounded-xl border border-[var(--docs-border)] bg-[var(--docs-card)] text-[var(--docs-card-foreground)] shadow-sm', $props.class)"
  >
    <slot />
  </div>
</template>
