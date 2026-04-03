<script setup lang="ts">
import { SelectRoot, useForwardPropsEmits } from 'reka-ui';

const props = defineProps<{
  modelValue?: string;
  defaultValue?: string;
  disabled?: boolean;
}>();

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const forwarded = useForwardPropsEmits(props, emit);
</script>

<template>
  <SelectRoot v-bind="forwarded">
    <slot />
  </SelectRoot>
</template>
