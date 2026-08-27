<script setup lang="ts">
import { computed, inject } from 'vue';
import { STAGE_FRAME, useDialogContext } from '@/composables/useGalleryContext';

/*
 * The `<img>` on the stage. Takes no props: the frame around it says which image
 * it draws and in which role, so `object-fit` is a class you put here.
 */
const gallery = useDialogContext('ImageGalleryStageImage');
const frame = inject(STAGE_FRAME, null);

if (!frame) {
  throw new Error(
    '[image-gallery-kit] <ImageGalleryStageImage> must be rendered inside <ImageGalleryStageFrame>.'
  );
}

const dialog = gallery.dialog;
const isActive = computed(() => frame.role.value === 'active');
</script>

<template>
  <!--
    A neighbour is a duplicate of an image the reader can already see, so it
    carries no alt text and is never keyed: re-keying it would throw away a
    decode the turn is about to need.
  -->
  <img
    :key="isActive ? dialog.imageKey(frame.image.value, dialog.index.value) : undefined"
    :src="frame.image.value.src"
    :alt="isActive ? frame.image.value.alt : ''"
    :srcset="frame.image.value.srcset"
    :sizes="frame.image.value.sizes"
    :decoding="frame.image.value.decoding"
    :loading="isActive ? dialog.dialogImageLoading(frame.image.value) : undefined"
    draggable="false"
    class="image-gallery-image image-gallery-stage-image"
  />
</template>
