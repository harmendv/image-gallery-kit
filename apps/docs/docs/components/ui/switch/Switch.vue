<script setup lang="ts">
import { SwitchRoot, SwitchThumb, type SwitchRootEmits, type SwitchRootProps, useForwardPropsEmits } from 'reka-ui';
import { cn } from '@docs/lib/utils';

const props = defineProps<SwitchRootProps & { class?: string }>();
const emit = defineEmits<SwitchRootEmits>();
const forwarded = useForwardPropsEmits(props, emit);
</script>

<template>
  <SwitchRoot
    v-bind="forwarded"
    :class="cn('peer inline-flex h-[1.15rem] w-8 shrink-0 items-center rounded-full border border-transparent shadow-xs transition-all outline-none data-[state=checked]:bg-[var(--docs-primary)] data-[state=unchecked]:bg-[var(--docs-input)] focus-visible:border-[var(--docs-ring)] focus-visible:ring-[3px] focus-visible:ring-[var(--docs-ring)]/20 disabled:cursor-not-allowed disabled:opacity-50', props.class)"
  >
    <SwitchThumb
      class="pointer-events-none block size-4 rounded-full bg-white ring-0 transition-transform data-[state=checked]:translate-x-[calc(100%-2px)] data-[state=unchecked]:translate-x-0"
    />
  </SwitchRoot>
</template>
