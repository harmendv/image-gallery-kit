<script setup lang="ts">
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * Always rendered, and always visible. The arrows and the swipe gesture serve
 * different inputs rather than different widths -- a mouse never swipes, a finger
 * always can -- so the two never contend and neither has to be switched off for
 * the other. Hide it with a class of your own if you want it gone at some width.
 */
const gallery = useDialogContext('ImageGalleryNext');
</script>

<template>
  <!--
    Disabled, not hidden, at the end of a non-looping gallery: a control that
    vanishes underneath the pointer invites a stray click on whatever replaces
    it, and a disabled arrow is itself the answer to "is there more".
  -->
  <button
    type="button"
    class="image-gallery-stage-arrow image-gallery-stage-arrow-next image-gallery-control image-gallery-control-round"
    :aria-label="gallery.labels.value.next"
    :disabled="!gallery.dialog.canGoNext.value"
    @click="gallery.dialog.next()"
  >
    <slot>
      <svg viewBox="0 0 24 24" class="image-gallery-icon">
        <path d="m9.5 5.5 6 6-6 6" />
      </svg>
    </slot>
  </button>
</template>
