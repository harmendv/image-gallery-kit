export interface GalleryImage {
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export type MainImagePosition = 'top' | 'right' | 'bottom' | 'left';
export type MainImageSize = number | string;
export type ImageFit = 'cover' | 'contain';
