<script setup lang="ts">
import { inject } from 'vue';
import { GRID_TILE, useDialogContext } from '@/composables/useGalleryContext';

/*
 * The `<img>` inside a grid tile. Takes no props: the tile it sits in says which
 * image it draws, so `object-fit` is a class you put here.
 */
const gallery = useDialogContext('ImageGalleryGridImage');
const tile = inject(GRID_TILE, null);

if (!tile) {
  throw new Error(
    '[image-gallery-kit] <ImageGalleryGridImage> must be rendered inside <ImageGalleryGridTile>.'
  );
}

const dialog = gallery.dialog;
</script>

<template>
  <img
    :src="dialog.previewImageSrc(tile.image.value)"
    :alt="tile.image.value.alt"
    :srcset="tile.image.value.srcset"
    :sizes="tile.image.value.sizes"
    :decoding="tile.image.value.decoding"
    :loading="dialog.previewImageLoading(tile.image.value)"
    class="image-gallery-image image-gallery-bento-image"
  />
</template>
