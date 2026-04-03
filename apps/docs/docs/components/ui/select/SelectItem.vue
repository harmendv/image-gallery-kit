<script setup lang="ts">
import { Check } from 'lucide-vue-next';
import {
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  type SelectItemProps,
  useForwardProps
} from 'reka-ui';
import { cn } from '@docs/lib/utils';

const props = defineProps<SelectItemProps & { class?: string }>();
const forwarded = useForwardProps(props);
</script>

<template>
  <SelectItem
    v-bind="forwarded"
    :class="cn('relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-none select-none data-[disabled]:pointer-events-none data-[highlighted]:bg-[var(--docs-accent)] data-[highlighted]:text-[var(--docs-accent-foreground)] data-[disabled]:opacity-50', props.class)"
  >
    <span class="absolute right-2 flex size-3.5 items-center justify-center">
      <SelectItemIndicator>
        <Check class="size-4" />
      </SelectItemIndicator>
    </span>

    <SelectItemText>
      <slot />
    </SelectItemText>
  </SelectItem>
</template>
