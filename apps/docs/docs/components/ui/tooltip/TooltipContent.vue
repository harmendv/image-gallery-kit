<script setup lang="ts">
import {
  TooltipArrow,
  TooltipContent as TooltipContentPrimitive,
  TooltipPortal as TooltipPortalPrimitive,
  type TooltipContentProps
} from 'reka-ui';
import { cn } from '@docs/lib/utils';

const props = defineProps<TooltipContentProps & {
  class?: string;
}>();
</script>

<template>
  <TooltipPortalPrimitive>
    <TooltipContentPrimitive
      :side-offset="8"
      v-bind="props"
      :class="cn('z-50 max-w-64 rounded-md border border-[var(--docs-border)] bg-[var(--docs-popover)] px-3 py-2 text-xs leading-5 text-[var(--docs-popover-foreground)] shadow-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1', props.class)"
    >
      <slot />
      <TooltipArrow class="fill-[var(--docs-popover)] stroke-[var(--docs-border)]" :width="10" :height="5" />
    </TooltipContentPrimitive>
  </TooltipPortalPrimitive>
</template>
