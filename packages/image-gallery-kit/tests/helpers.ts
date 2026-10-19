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

/*
 * jsdom resolves no grid tracks, so every grid packs into a single column and
 * the horizontal arrows have nowhere to go. Reporting `count` tracks lets a spec
 * exercise the packing across columns; call the returned function to undo it.
 */
export function reportGridTracks(count: number) {
  const original = window.getComputedStyle;
  const gridTemplateColumns = Array.from({ length: count }, () => '1fr').join(' ');

  // A proxy rather than a spread: the declaration's properties are prototype
  // getters, which a spread drops, and the flight reads the radius off it.
  window.getComputedStyle = (element: Element, pseudo?: string | null) =>
    new Proxy(original(element, pseudo), {
      get: (style, property) =>
        property === 'gridTemplateColumns' ? gridTemplateColumns : Reflect.get(style, property, style)
    });

  return () => {
    window.getComputedStyle = original;
  };
}
