<script setup lang="ts">
import { CircleHelp } from 'lucide-vue-next';
import {
  TooltipArrow,
  TooltipContent,
  TooltipPortal,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger
} from 'reka-ui';

defineProps<{
  text: string;
}>();
</script>

<template>
  <TooltipProvider :delay-duration="120">
    <TooltipRoot>
      <TooltipTrigger as-child>
        <button
          type="button"
          class="playground-info-button"
          aria-label="Field help"
        >
          <CircleHelp class="size-4" />
        </button>
      </TooltipTrigger>

      <TooltipPortal>
        <TooltipContent
          :side-offset="8"
          class="playground-tooltip"
        >
          {{ text }}
          <TooltipArrow class="playground-tooltip-arrow" :width="10" :height="5" />
        </TooltipContent>
      </TooltipPortal>
    </TooltipRoot>
  </TooltipProvider>
</template>
