<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '@docs/lib/utils';

const props = withDefaults(
  defineProps<{
    align?: 'inline-start' | 'inline-end';
    class?: string;
  }>(),
  {
    align: 'inline-start'
  }
);

const classes = computed(() =>
  cn(
    'flex h-full shrink-0 items-center gap-1.5 text-sm text-[var(--docs-muted-foreground)]',
    props.align === 'inline-end' ? 'pr-1 pl-0.5' : 'pr-0.5 pl-1',
    props.class
  )
);
</script>

<template>
  <div :class="classes" :data-align="align" data-slot="input-group-addon">
    <slot />
  </div>
</template>
