<script setup lang="ts">
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * Three columns, because the counter has to sit centred on the viewport rather
 * than centred in whatever space the controls leave over -- a 1fr auto 1fr grid
 * is the only arrangement where a wider button on one side does not shove it
 * off centre. The named slots are those columns; leaving one empty is fine, and
 * the grid still holds the middle in place.
 */
useDialogContext('ImageGalleryTopbar');
</script>

<template>
  <div class="image-gallery-topbar">
    <div class="image-gallery-topbar-start">
      <slot name="start" />
    </div>

    <div>
      <slot name="center" />
    </div>

    <div class="image-gallery-topbar-end">
      <slot name="end" />
    </div>
  </div>
</template>
