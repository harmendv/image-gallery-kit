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
  empty: string;
}

export type MainImagePosition = 'top' | 'right' | 'bottom' | 'left';
export type MainImageSize = number | string;
