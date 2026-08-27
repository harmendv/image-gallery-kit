<script setup lang="ts">
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * Renders nothing in grid mode: a "3 of 40" reading beside a wall of forty
 * thumbnails describes a position the reader has stepped out of.
 */
const gallery = useDialogContext('ImageGalleryCounter');
</script>

<template>
  <!--
    aria-live, because the reading changes on gestures a screen reader cannot
    otherwise observe: a swipe or an arrow key repaints the stage without moving
    focus, so nothing else announces that the page turned. Polite -- it narrates,
    it must not interrupt.
  -->
  <div v-if="gallery.dialog.mode.value === 'single'" class="image-gallery-counter" aria-live="polite">
    <!-- Scoped so a consumer can reformat the reading without restating the label function. -->
    <slot
      :label="gallery.dialog.counterLabel.value"
      :index="gallery.dialog.index.value"
      :total="gallery.total.value"
    >
      {{ gallery.dialog.counterLabel.value }}
    </slot>
  </div>
</template>
