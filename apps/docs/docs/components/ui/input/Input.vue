<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '@docs/lib/utils';

const props = defineProps<{
  class?: string;
}>();

const [modelValue, modelModifiers] = defineModel<string | number>();
const attrs = useAttrs();
const classes = computed(() =>
  cn(
    'flex h-9 w-full min-w-0 rounded-md border border-[var(--docs-input)] bg-transparent px-3 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--docs-muted-foreground)] selection:bg-[var(--docs-primary)] selection:text-[var(--docs-primary-foreground)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 focus-visible:border-[var(--docs-ring)] focus-visible:ring-[3px] focus-visible:ring-[var(--docs-ring)]/20',
    props.class
  )
);

function onInput(event: Event) {
  const target = event.target as HTMLInputElement;
  modelValue.value = modelModifiers.number ? target.valueAsNumber : target.value;
}
</script>

<template>
  <input :class="classes" :value="modelValue" v-bind="attrs" @input="onInput">
</template>
