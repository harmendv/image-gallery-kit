<script setup lang="ts">
import { cn } from '@docs/lib/utils';

defineProps<{
  class?: string;
}>();
</script>

<template>
  <div :class="cn('p-6 pt-0', $props.class)">
    <slot />
  </div>
</template>
