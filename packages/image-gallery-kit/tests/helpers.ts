import { h } from 'vue';
import ImageGalleryImage from '@/components/ImageGalleryImage.vue';
import type { GalleryImage } from '@/types';

/*
 * The preview is the consumer's markup, so every mount needs one. Tiles are
 * rendered from the same array that goes to `images` and carry a key, which is
 * both what the docs recommend and what keeps index resolution on the identity
 * path instead of the id/src fallbacks.
 */
export function previewSlot(collection: GalleryImage[], count = collection.length) {
  return () => collection.slice(0, count).map((image) => h(ImageGalleryImage, { image, key: image.src }));
}
