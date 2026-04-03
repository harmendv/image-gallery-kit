<script setup lang="ts">
import { TooltipRoot as TooltipRootPrimitive, type TooltipRootProps } from 'reka-ui';

defineProps<TooltipRootProps>();
</script>

<template>
  <TooltipRootPrimitive v-bind="$props">
    <slot />
  </TooltipRootPrimitive>
</template>
