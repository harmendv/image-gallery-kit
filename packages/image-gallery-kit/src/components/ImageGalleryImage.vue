<script setup lang="ts">
import { computed, inject, onBeforeUnmount, ref, watch } from 'vue';
import { GALLERY_CONTEXT } from '@/composables/useGalleryContext';
import type { GalleryImage } from '@/types';

const props = defineProps<{
  image: GalleryImage;
  /*
   * Classes for the <img> itself. Your own classes land on the tile, and the
   * image is a descendant, so this is the only way to reach it -- which matters
   * because object-fit and the hover transform belong to the image, not the
   * tile. The tile carries `group`, so `group-hover:` works from here.
   */
  imageClass?: string | null;
}>();

const injected = inject(GALLERY_CONTEXT, null);

if (!injected) {
  throw new Error(
    '[image-gallery-kit] <ImageGalleryImage> must be rendered inside the default slot of <ImageGallery>.'
  );
}

// Narrowed alias: a bare `throw` does not narrow the injected value for the template.
const gallery = injected;

const tile = ref<HTMLElement | null>(null);
const index = computed(() => gallery.resolveIndex(props.image));

/*
 * The tile itself is what registers, not the frame inside it. The flight clones
 * whatever is registered, and every bit of a tile's appearance -- radius,
 * border, shadow, background, ring -- is a class the consumer put here, on the
 * button. Registering the frame flew a stripped copy that had none of it.
 *
 * Registered during setup, not on mount. The parent derives the overflow count
 * from how many tiles registered, and that count is rendered -- so registering
 * on mount means the server emits "+20" for a 5-tile preview of 20 images and
 * the client silently corrects it to "+15" after hydration. Setup runs on the
 * server too, and the tile ref this passes is filled in later either way,
 * since nothing reads it until a click.
 */
gallery.registerPreview(props.image, tile);
onBeforeUnmount(() => gallery.unregisterPreview(props.image));

/*
 * Re-register when the bound image changes identity. The registry is keyed by
 * image, so a tile that starts drawing a different one would otherwise leave
 * its old key pointing at this element -- and the flight animation would fly
 * from the wrong tile.
 */
watch(
  () => props.image,
  (next, previous) => {
    if (previous) {
      gallery.unregisterPreview(previous);
    }

    gallery.registerPreview(next, tile);
  }
);

function onClick() {
  if (index.value >= 0) {
    gallery.openImage(index.value);
  }
}
</script>

<template>
  <!--
    Deliberately unstyled as well as unsized. Height, width, aspect ratio,
    spans, radius, background, shadow and hover are all the consumer's classes;
    this contributes only the positioning context the image fills, the overflow
    clip that makes their radius bite, and `group` so they can drive the image
    from a hover on the tile. Note the image is absolutely positioned, so the
    tile has no intrinsic height of its own -- something on the outside has to
    give it one.
  -->
  <button
    ref="tile"
    type="button"
    class="image-gallery-tile group"
    :aria-label="gallery.labels.value.openImage(index + 1)"
    @click="onClick"
  >
    <!--
      Marked, not merely present: the flight clones this tile to carry the
      consumer's own appearance with it, and this attribute is how the clone
      tells the image apart from whatever the slot below put beside it.
    -->
    <div data-ig-tile-frame="true" class="image-gallery-tile-frame">
      <img
        :src="props.image.thumbnailSrc ?? props.image.src"
        :alt="props.image.alt"
        :srcset="props.image.srcset"
        :sizes="props.image.sizes"
        :decoding="props.image.decoding"
        :loading="props.image.loading ?? 'lazy'"
        class="image-gallery-image"
        :class="props.imageClass ?? undefined"
      />
    </div>

    <!-- For a badge, caption or the overflow trigger, positioned by the consumer. -->
    <slot :index="index" :image="props.image" />
  </button>
</template>
