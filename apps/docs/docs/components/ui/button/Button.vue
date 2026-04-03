<script setup lang="ts">
import { computed, useAttrs } from 'vue';
import { cn } from '@docs/lib/utils';
import { buttonVariants, type ButtonVariants } from './button';

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants['variant'];
    size?: ButtonVariants['size'];
    class?: string;
    type?: 'button' | 'submit' | 'reset';
  }>(),
  {
    variant: 'default',
    size: 'default',
    type: 'button',
    class: undefined
  }
);

const attrs = useAttrs();
const classes = computed(() => cn(buttonVariants({ variant: props.variant, size: props.size }), props.class));
</script>

<template>
  <button :type="type" :class="classes" v-bind="attrs">
    <slot />
  </button>
</template>
