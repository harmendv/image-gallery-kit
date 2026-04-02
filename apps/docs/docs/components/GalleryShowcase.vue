<script setup lang="ts">
import { computed } from 'vue';
import { ImageGallery } from 'image-gallery-kit';
import type { GalleryImage } from 'image-gallery-kit';
import { demoImages } from './imageFixtures';

const props = withDefaults(
  defineProps<{
    images?: GalleryImage[];
    previewCount?: number;
    previewAspectRatio?: number | string;
    mainImageIndex?: number | null;
    height?: string | null;
    width?: string | null;
    imageRadius?: string | null;
  }>(),
  {
    images: () => demoImages,
    previewCount: 4,
    previewAspectRatio: '1 / 1',
    mainImageIndex: null,
    height: '26rem',
    width: '100%',
    imageRadius: '1.4rem'
  }
);

const visibleImages = computed(() => props.images.slice(0, 9));
</script>

<template>
  <div class="gallery-shell vp-raw">
    <ImageGallery
      :images="visibleImages"
      :preview-count="previewCount"
      :preview-aspect-ratio="previewAspectRatio"
      :main-image-index="mainImageIndex"
      :height="height"
      :width="width"
      :image-radius="imageRadius"
    />
  </div>
</template>

<style scoped>
.gallery-shell {
  width: 100%;
}
</style>
