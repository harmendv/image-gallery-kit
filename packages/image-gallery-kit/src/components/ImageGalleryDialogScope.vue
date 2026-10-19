<script setup lang="ts">
import { provide } from 'vue';
import { GALLERY_DIALOG, useGallery } from '@/composables/useGalleryContext';

/*
 * Internal: wraps the `dialog` slot so its parts can tell they are in it. Slot
 * content mounts under whichever component renders the slot, so a provide on
 * ImageGallery itself reaches the preview just as well -- this component is the
 * one ancestor only the dialog has. Renders nothing of its own.
 */
provide(GALLERY_DIALOG, useGallery('ImageGallery'));
</script>

<template>
  <slot />
</template>
