import type { App, Plugin } from 'vue';
import ImageGallery from './components/ImageGallery.vue';
import ImageGalleryImage from './components/ImageGalleryImage.vue';
import ImageGalleryOverflowTrigger from './components/ImageGalleryOverflowTrigger.vue';
import './style.css';

export type { GalleryColorScheme, GalleryImage, GalleryLabels } from './types';
export { ImageGallery, ImageGalleryImage, ImageGalleryOverflowTrigger };

const plugin: Plugin = {
  install(app: App) {
    app.component('ImageGallery', ImageGallery);
    app.component('ImageGalleryImage', ImageGalleryImage);
    app.component('ImageGalleryOverflowTrigger', ImageGalleryOverflowTrigger);
  }
};

export default plugin;
