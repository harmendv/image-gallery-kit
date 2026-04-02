<script setup lang="ts">
import { HugeiconsIcon } from '@hugeicons/vue';
import { GridViewIcon } from '@hugeicons/core-free-icons';
</script>

<template>
  <span class="docs-logo" aria-hidden="true">
    <HugeiconsIcon :icon="GridViewIcon" :size="22" :stroke-width="1.8" />
  </span>
</template>

<style scoped>
.docs-logo {
  display: inline-flex;
  align-items: center;
  margin-right: 8px;
  color: var(--vp-c-text-1);
}
</style>
