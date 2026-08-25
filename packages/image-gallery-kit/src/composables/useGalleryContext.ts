import type { InjectionKey, Ref } from 'vue';
import type { GalleryImage, GalleryLabels } from '@/types';

export interface GalleryContext {
  /*
   * A child announces which image it draws and the element the flight
   * animation should measure. The frame arrives as a ref rather than an
   * element because a child registers on mount, and the parent reads the
   * element later -- at click time -- by which point v-if or a keyed update may
   * have swapped it.
   */
  registerPreview: (image: GalleryImage, frame: Ref<HTMLElement | null>) => void;
  unregisterPreview: (image: GalleryImage) => void;
  /*
   * Position in `images`, which is the collection's source of truth. Deriving
   * it here rather than from registration order is what lets the preview show
   * an arbitrary subset in an arbitrary order: the dialog counter, the arrow
   * keys and the shared-element transition all key on the real index, not on
   * whichever tile happened to mount first.
   */
  resolveIndex: (image: GalleryImage) => number;
  openImage: (index: number) => void;
  openGrid: (index: number) => void;
  labels: Ref<GalleryLabels>;
  overflowCount: Ref<number>;
  total: Ref<number>;
  /*
   * Gates every route into the grid view, so a gallery configured without it
   * cannot be pushed there by a stray trigger in the consumer's markup.
   */
  allowGridView: Ref<boolean>;
  lastPreviewedIndex: Ref<number>;
}

export const GALLERY_CONTEXT: InjectionKey<GalleryContext> = Symbol('image-gallery-context');
