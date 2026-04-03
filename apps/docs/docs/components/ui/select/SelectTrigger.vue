<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next';
import { SelectIcon, SelectTrigger, type SelectTriggerProps, useForwardProps } from 'reka-ui';
import { cn } from '@docs/lib/utils';

const props = defineProps<SelectTriggerProps & { class?: string }>();
const forwarded = useForwardProps(props);
</script>

<template>
  <SelectTrigger
    v-bind="forwarded"
    :class="cn('flex h-9 w-full items-center justify-between gap-2 rounded-md border border-[var(--docs-input)] bg-transparent px-3 py-2 text-sm shadow-xs whitespace-nowrap outline-none data-[placeholder]:text-[var(--docs-muted-foreground)] focus-visible:border-[var(--docs-ring)] focus-visible:ring-[3px] focus-visible:ring-[var(--docs-ring)]/20 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1', props.class)"
  >
    <slot />

    <SelectIcon as-child>
      <ChevronDown class="size-4 opacity-50" />
    </SelectIcon>
  </SelectTrigger>
</template>
