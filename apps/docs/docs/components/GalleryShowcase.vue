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
    itemAspectRatio?: number | string;
    mainImageIndex?: number | null;
    mainImagePosition?: 'top' | 'right' | 'bottom' | 'left';
    mainImageSize?: number | string;
    gap?: string;
    imageFit?: 'cover' | 'contain';
    allowGridView?: boolean;
    height?: string | null;
    width?: string | null;
    imageRadius?: string | null;
  }>(),
  {
    images: () => demoImages,
    imageCount: 9,
    rows: 2,
    columns: 2,
    itemAspectRatio: '4 / 5',
    mainImageIndex: null,
    mainImagePosition: 'left',
    mainImageSize: 0.4,
    gap: '1rem',
    imageFit: 'cover',
    allowGridView: true,
    height: '26rem',
    width: '100%',
    imageRadius: '1.4rem'
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
      :item-aspect-ratio="itemAspectRatio"
      :main-image-index="mainImageIndex"
      :main-image-position="mainImagePosition"
      :main-image-size="mainImageSize"
      :gap="gap"
      :image-fit="imageFit"
      :allow-grid-view="allowGridView"
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
