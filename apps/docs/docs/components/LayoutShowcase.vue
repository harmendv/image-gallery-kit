<script setup lang="ts">
import { computed } from 'vue';
import { ImageGallery, ImageGalleryImage, ImageGalleryOverflowTrigger } from 'image-gallery-kit';
import { demoImages } from './imageFixtures';

/*
 * Generic on purpose: every layout example in the docs is the same markup with
 * different classes, which is exactly the point being demonstrated. Passing the
 * classes in from the page keeps each snippet honest -- what you read is what
 * renders.
 */
const props = withDefaults(
  defineProps<{
    /* Classes for the layout root, e.g. `flex gap-3 md:flex-row`. */
    rootClass: string;
    /* Classes for the main tile. Omit for a preview with no main image. */
    mainClass?: string | null;
    /* Wrapper around the supporting tiles. Empty means they are direct children of the root. */
    gridClass?: string;
    tileClass?: string;
    /* Classes for the <img> inside every tile -- object-fit and hover live here. */
    imageClass?: string;
    /*
     * Classes for the first supporting tile only. A mosaic's whole point is
     * spans that differ per tile, which one shared tileClass cannot express.
     */
    firstTileClass?: string | null;
    count?: number;
    allowGridView?: boolean;
    /* Caption shown above the preview, for side-by-side comparisons. */
    label?: string | null;
    /* Adds an index badge to every tile, demonstrating the tile's own slot. */
    overlay?: boolean;
    /* Adds buttons driving the gallery through its slot props. */
    controls?: boolean;
    /* Wrapper class for theming demos, where tokens are redeclared in scope. */
    themeClass?: string | null;
  }>(),
  {
    mainClass: null,
    gridClass: '',
    tileClass: '',
    imageClass: 'transition duration-500 group-hover:scale-105',
    firstTileClass: null,
    count: 5,
    allowGridView: true,
    label: null,
    overlay: false,
    controls: false,
    themeClass: null
  }
);

const images = computed(() => demoImages.map((image, index) => ({ ...image, id: index })));
const previewed = computed(() => images.value.slice(0, props.count));
const main = computed(() => (props.mainClass ? previewed.value[0] : null));
const tiles = computed(() => (props.mainClass ? previewed.value.slice(1) : previewed.value));
</script>

<template>
  <div class="gallery-shell vp-raw">
    <p v-if="props.label" class="showcase-label">{{ props.label }}</p>

    <div :class="props.themeClass">
      <ImageGallery :images="images" :allow-grid-view="props.allowGridView">
        <template #default="{ total, open, openGrid }">
          <div v-if="props.controls" class="showcase-controls">
            <button type="button" @click="open(0)">Start a slideshow</button>
            <button type="button" @click="openGrid(0)">Browse all {{ total }}</button>
          </div>

          <div :class="props.rootClass">
            <ImageGalleryImage
              v-if="main"
              :image="main"
              :class="props.mainClass ?? undefined"
              :image-class="props.imageClass"
            >
              <span v-if="props.overlay" class="showcase-badge">1</span>
            </ImageGalleryImage>

            <!--
              `contents` is Tailwind for `display: contents`, which removes this
              wrapper from layout so the tiles become direct children of the root
              grid or flex container. That is what lets one showcase serve both
              the nested-grid examples and the ones where tiles sit in the root.
            -->
            <div :class="props.gridClass || 'contents'">
              <ImageGalleryImage
                v-for="(image, position) in tiles"
                :key="image.id"
                :image="image"
                :class="[props.tileClass, position === 0 ? props.firstTileClass : null]"
                :image-class="props.imageClass"
              >
                <template #default="{ index }">
                  <span v-if="props.overlay" class="showcase-badge">{{ index + 1 }}</span>

                  <ImageGalleryOverflowTrigger
                    v-if="!props.overlay && position === tiles.length - 1"
                    v-slot="{ count }"
                    class="showcase-trigger"
                  >
                    +{{ count }}
                  </ImageGalleryOverflowTrigger>
                </template>
              </ImageGalleryImage>
            </div>
          </div>
        </template>
      </ImageGallery>
    </div>
  </div>
</template>
