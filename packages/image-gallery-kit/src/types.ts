export interface GalleryImage {
  id?: string | number;
  src: string;
  thumbnailSrc?: string;
  srcset?: string;
  sizes?: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  loading?: 'eager' | 'lazy';
  decoding?: 'sync' | 'async' | 'auto';
}

export interface GalleryLabels {
  counter: (current: number, total: number) => string;
  dialog: (counter: string) => string;
  openImage: (index: number) => string;
  openImageFromGrid: (index: number) => string;
  showAllImages: (total: number) => string;
  allImages: string;
  toggleGrid: string;
  close: string;
  previous: string;
  next: string;
}

export type GalleryDialogMode = 'single' | 'bento';

/*
 * The slice of gsap the transitions use. Typed structurally rather than as
 * gsap's own types so the declarations never reference a peer the
 * consumer may not have installed; the real `gsap` export satisfies it.
 */
export interface GalleryGsap {
  to(targets: object | object[], vars: Record<string, unknown>): unknown;
}
