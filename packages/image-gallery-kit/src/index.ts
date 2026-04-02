import type { App, Plugin } from 'vue';
import ImageGallery from './components/ImageGallery.vue';
import './style.css';

export type { GalleryImage } from './types';
export { ImageGallery };

const plugin: Plugin = {
  install(app: App) {
    app.component('ImageGallery', ImageGallery);
  }
};

export default plugin;
