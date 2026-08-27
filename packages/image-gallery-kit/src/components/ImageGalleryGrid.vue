<script setup lang="ts">
import { onBeforeUnmount, watchEffect } from 'vue';
import ImageGalleryGridTile from '@/components/ImageGalleryGridTile.vue';
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * The all-images view. Columns are explicit elements rather than CSS
 * multi-column because containment is what makes a collection of thousands
 * affordable: a browser has to lay out every item to balance real columns,
 * which defeats the content-visibility on each tile entirely.
 *
 * The packing stays in ImageGallery and the columns stay in here, because
 * neither is yours to write -- shortest-column packing decides which image
 * lands where. What is yours is the tile, so this drives a slot over the
 * entries it packed rather than rendering the tile itself.
 */
const props = defineProps<{
  /*
   * Say this when every tile shares one shape (an `aspect-*` class on the
   * tile). The packing plans columns from each image's own ratio; tiles that
   * render at one shape regardless need it to plan the same way, or the
   * columns come up ragged. Uniform packing is round-robin, so the reading
   * order is left-to-right as well.
   */
  uniform?: boolean;
}>();

const gallery = useDialogContext('ImageGalleryGrid');
const dialog = gallery.dialog;
const grid = dialog.grid;

watchEffect(() => {
  grid.setUniform(props.uniform ?? false);
});
onBeforeUnmount(() => {
  grid.setUniform(false);
});
</script>

<template>
  <!--
    keydown, not a handler per tile: the arrows, Home and End move a roving
    tabindex across tiles this component does not render (the tile is a slot),
    so the container is the one element guaranteed to see every key.
  -->
  <div
    v-if="dialog.mode.value === 'bento'"
    :ref="(element) => grid.setGrid(element as HTMLElement | null)"
    class="image-gallery-bento"
    @keydown="grid.moveFocus"
  >
    <div
      v-for="(column, columnIndex) in grid.columns.value"
      :key="columnIndex"
      class="image-gallery-bento-column"
    >
      <!--
        The default is a plain ImageGalleryGridTile, so there is one tile
        implementation rather than a built-in one and a slot that shadows it.
        That costs a component instance per tile; the alternative was the same
        markup written twice, and a flight registration that has to be kept in
        step in both.
      -->
      <slot
        v-for="entry in column.entries"
        :key="dialog.imageKey(entry.image, entry.actualIndex)"
        name="tile"
        :image="entry.image"
        :index="entry.actualIndex"
      >
        <ImageGalleryGridTile :image="entry.image" :index="entry.actualIndex" />
      </slot>
    </div>
  </div>
</template>
