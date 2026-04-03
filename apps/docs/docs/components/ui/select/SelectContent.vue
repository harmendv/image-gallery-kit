<script setup lang="ts">
import { Check, ChevronDown, ChevronUp } from 'lucide-vue-next';
import {
  SelectContent,
  SelectPortal,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectViewport,
  type SelectContentProps,
  useForwardProps
} from 'reka-ui';
import { cn } from '@docs/lib/utils';

const props = withDefaults(
  defineProps<SelectContentProps & {
    class?: string;
    position?: 'item-aligned' | 'popper';
  }>(),
  {
    position: 'popper'
  }
);

const forwarded = useForwardProps(props);
</script>

<template>
  <SelectPortal>
    <SelectContent
      v-bind="forwarded"
      :class="cn(
        'relative z-50 max-h-96 min-w-[8rem] overflow-x-hidden overflow-y-auto rounded-md border border-[var(--docs-border)] bg-[var(--docs-popover)] text-[var(--docs-popover-foreground)] shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1',
        props.position === 'popper' && 'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
        props.class
      )"
      :position="props.position"
    >
      <SelectScrollUpButton class="flex cursor-default items-center justify-center py-1">
        <ChevronUp class="size-4" />
      </SelectScrollUpButton>

      <SelectViewport
        :class="cn('p-1', props.position === 'popper' && 'h-[var(--reka-select-trigger-height)] w-full min-w-[var(--reka-select-trigger-width)] scroll-my-1')"
      >
        <slot />
      </SelectViewport>

      <SelectScrollDownButton class="flex cursor-default items-center justify-center py-1">
        <ChevronDown class="size-4" />
      </SelectScrollDownButton>
    </SelectContent>
  </SelectPortal>
</template>
