<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@docs/lib/utils';

const props = defineProps<{
  class?: string;
}>();

// The border and focus ring move from the input to this wrapper so the control
// and its addons read as one field. The inner input drops both.
const classes = computed(() =>
  cn(
    'flex h-9 w-full min-w-0 items-center rounded-md border border-[var(--docs-input)] bg-transparent shadow-xs transition-[color,box-shadow] outline-none has-[input:focus-visible]:border-[var(--docs-ring)] has-[input:focus-visible]:ring-[3px] has-[input:focus-visible]:ring-[var(--docs-ring)]/20 has-[input:disabled]:pointer-events-none has-[input:disabled]:opacity-50',
    props.class
  )
);
</script>

<template>
  <div :class="classes" data-slot="input-group">
    <slot />
  </div>
</template>
