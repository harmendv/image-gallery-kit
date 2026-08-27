<script setup lang="ts">
import { onBeforeUnmount, provide, ref, toRef } from 'vue';
import ImageGalleryGridImage from '@/components/ImageGalleryGridImage.vue';
import { GRID_TILE, useDialogContext } from '@/composables/useGalleryContext';
import type { GalleryImage } from '@/types';

/*
 * One tile in the all-images grid. `image` and `index` are props because they
 * are data, not appearance -- the grid's packing decides which image lands
 * where, so a recomposed tile has to be told. Everything you can see is a class
 * you put on it -- including the shape: the image's ratio goes out as a custom
 * property, so an `aspect-square` of yours wins over it.
 *
 * The tile registers itself, not the frame inside it: the flight clones whatever
 * is registered, and a tile's appearance lives out here on the button.
 */
const props = defineProps<{
  image: GalleryImage;
  index: number;
}>();

const gallery = useDialogContext('ImageGalleryGridTile');
const dialog = gallery.dialog;
const tile = ref<HTMLElement | null>(null);

dialog.grid.registerTile(toRef(props, 'index'), tile);
onBeforeUnmount(() => {
  dialog.grid.unregisterTile(props.index);
});

// So the image inside needs no props of its own.
provide(GRID_TILE, { image: toRef(props, 'image') });
</script>

<template>
  <!--
    Roving tabindex: only the tile the grid's focus index points at is a Tab
    stop, so Tab crosses a thousand-image grid in one step and the arrow keys
    (handled on the grid container) walk between tiles instead.
  -->
  <button
    ref="tile"
    type="button"
    data-bento-item="true"
    :tabindex="props.index === dialog.grid.focusIndex.value ? undefined : -1"
    :data-bento-index="props.index"
    :data-bento-active="props.index === dialog.index.value ? 'true' : 'false'"
    :data-ig-entering="dialog.grid.isEntering.value && props.index !== dialog.index.value ? 'true' : 'false'"
    class="image-gallery-bento-tile group"
    :style="{ '--ig-internal-tile-ratio': dialog.aspectRatio(props.image) }"
    :aria-label="gallery.labels.value.openImageFromGrid(props.index + 1)"
    @click="dialog.grid.select(props.index)"
  >
    <!--
      Marked so the flight's clone of this tile knows which child is the image,
      and which children are yours to leave behind in the grid.
    -->
    <div data-ig-tile-frame="true" class="image-gallery-bento-frame">
      <slot name="image">
        <ImageGalleryGridImage />
      </slot>
    </div>

    <slot :image="props.image" :index="props.index" />
  </button>
</template>
