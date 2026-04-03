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

export type MainImagePosition = 'top' | 'right' | 'bottom' | 'left';
export type MainImageSize = number | string;
export type ImageFit = 'cover' | 'contain';
