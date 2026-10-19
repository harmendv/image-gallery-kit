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
  /**
   * @deprecated Unused. The grid toggle is named by `allImages`, its visible
   * text. Still accepted so existing overrides type-check.
   */
  toggleGrid?: string;
  close: string;
  previous: string;
  next: string;
}

export type GalleryDialogMode = 'single' | 'bento';
