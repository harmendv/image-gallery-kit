<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { ChevronDown } from 'lucide-vue-next';
import { cn } from '@docs/lib/utils';

const props = defineProps<{
  class?: string;
}>();

const [modelValue] = defineModel<string>();
const attrs = useAttrs();
const classes = computed(() =>
  cn(
    'flex h-9 w-full min-w-0 appearance-none rounded-md border border-[var(--docs-input)] bg-transparent px-3 py-2 pr-9 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-[var(--docs-ring)] focus-visible:ring-[3px] focus-visible:ring-[var(--docs-ring)]/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
    props.class
  )
);
</script>

<template>
  <div class="relative">
    <select v-model="modelValue" :class="classes" v-bind="attrs">
      <slot />
    </select>
    <ChevronDown class="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 opacity-50" />
  </div>
</template>
