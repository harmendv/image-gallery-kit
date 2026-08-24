<script setup lang="ts">
import { computed } from 'vue';
import { ImageGallery } from 'image-gallery-kit';
import type { GalleryImage } from 'image-gallery-kit';
import { demoImages } from './imageFixtures';

const props = withDefaults(
  defineProps<{
    images?: GalleryImage[];
    imageCount?: number | null;
    rows?: number;
    columns?: number;
    imageAspectRatio?: number | string;
    mainImageAspectRatio?: number | string | null;
    mainImageIndex?: number | null;
    mainImagePosition?: 'top' | 'right' | 'bottom' | 'left';
    mainImageSize?: number | string;
    allowGridView?: boolean;
    height?: string | null;
    width?: string | null;
  }>(),
  {
    images: () => demoImages,
    imageCount: 9,
    rows: 2,
    columns: 2,
    imageAspectRatio: '4 / 5',
    mainImageAspectRatio: null,
    mainImageIndex: null,
    mainImagePosition: 'left',
    mainImageSize: 0.4,
    allowGridView: true,
    height: '26rem',
    width: '100%'
  }
);

const visibleImages = computed(() => {
  const maxCount = props.imageCount === null ? 9 : Math.max(1, Math.floor(props.imageCount));
  return props.images.slice(0, maxCount);
});
</script>

<template>
  <div class="gallery-shell vp-raw">
    <ImageGallery
      :images="visibleImages"
      :rows="rows"
      :columns="columns"
      :image-aspect-ratio="imageAspectRatio"
      :main-image-aspect-ratio="mainImageAspectRatio"
      :main-image-index="mainImageIndex"
      :main-image-position="mainImagePosition"
      :main-image-size="mainImageSize"
      :allow-grid-view="allowGridView"
      :height="height"
      :width="width"
    />
  </div>
</template>

<style scoped>
.gallery-shell {
  width: 100%;
}
</style>
