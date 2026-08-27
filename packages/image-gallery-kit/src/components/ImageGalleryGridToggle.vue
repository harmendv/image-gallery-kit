<script setup lang="ts">
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * Absent, not disabled, when there is nowhere to go: a gallery with grid view
 * switched off, or a collection of one, has no second view to offer. A disabled
 * control would still take up a Tab stop to say so.
 */
const gallery = useDialogContext('ImageGalleryGridToggle');
</script>

<template>
  <button
    v-if="gallery.dialog.mode.value === 'single' && gallery.allowGridView.value && gallery.total.value > 1"
    type="button"
    class="image-gallery-control image-gallery-control-pill"
    :aria-label="gallery.labels.value.toggleGrid"
    @click="gallery.dialog.toggleMode()"
  >
    <slot :label="gallery.labels.value.allImages">
      <svg viewBox="0 0 24 24" class="image-gallery-icon image-gallery-icon-sm">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
      <span>{{ gallery.labels.value.allImages }}</span>
    </slot>
  </button>
</template>
