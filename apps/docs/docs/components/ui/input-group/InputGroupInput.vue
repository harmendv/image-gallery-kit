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
    'h-full w-full min-w-0 flex-1 bg-transparent px-3 py-1 text-sm outline-none placeholder:text-[var(--docs-muted-foreground)] selection:bg-[var(--docs-primary)] selection:text-[var(--docs-primary-foreground)] disabled:cursor-not-allowed',
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
