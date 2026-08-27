<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue';
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * Registers itself because it is where focus goes when the dialog opens. That
 * is a deliberate choice rather than an accident of DOM order: the first
 * focusable element is otherwise the grid toggle, and landing there means the
 * first thing a keyboard or screen-reader user is offered is a change of view
 * rather than a way out.
 */
const gallery = useDialogContext('ImageGalleryCloseButton');
const button = ref<HTMLElement | null>(null);

gallery.dialog.registerCloseButton(button);
onBeforeUnmount(() => {
  button.value = null;
});
</script>

<template>
  <button
    ref="button"
    type="button"
    class="image-gallery-control image-gallery-control-round"
    :aria-label="gallery.labels.value.close"
    @click="gallery.dialog.close()"
  >
    <slot>
      <svg viewBox="0 0 24 24" class="image-gallery-icon">
        <path d="M6 6l12 12M18 6 6 18" />
      </svg>
    </slot>
  </button>
</template>
