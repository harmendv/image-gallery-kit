import type { App, Plugin } from 'vue';
import ImageGallery from './components/ImageGallery.vue';
import ImageGalleryCloseButton from './components/ImageGalleryCloseButton.vue';
import ImageGalleryCounter from './components/ImageGalleryCounter.vue';
import ImageGalleryGrid from './components/ImageGalleryGrid.vue';
import ImageGalleryGridImage from './components/ImageGalleryGridImage.vue';
import ImageGalleryGridTile from './components/ImageGalleryGridTile.vue';
import ImageGalleryGridToggle from './components/ImageGalleryGridToggle.vue';
import ImageGalleryImage from './components/ImageGalleryImage.vue';
import ImageGalleryNext from './components/ImageGalleryNext.vue';
import ImageGalleryOverflowTrigger from './components/ImageGalleryOverflowTrigger.vue';
import ImageGalleryOverlay from './components/ImageGalleryOverlay.vue';
import ImageGalleryPrevious from './components/ImageGalleryPrevious.vue';
import ImageGalleryStage from './components/ImageGalleryStage.vue';
import ImageGalleryStageFrame from './components/ImageGalleryStageFrame.vue';
import ImageGalleryStageImage from './components/ImageGalleryStageImage.vue';
import ImageGalleryTopbar from './components/ImageGalleryTopbar.vue';
import './style.css';

export type { GalleryDialogMode, GalleryImage, GalleryLabels } from './types';
export type {
  GalleryContext,
  GalleryDialogContext,
  GalleryGridTileContext,
  GalleryStageFrameContext
} from './composables/useGalleryContext';
export { GALLERY_CONTEXT, GRID_TILE, STAGE_FRAME } from './composables/useGalleryContext';

export {
  ImageGallery,
  ImageGalleryCloseButton,
  ImageGalleryCounter,
  ImageGalleryGrid,
  ImageGalleryGridImage,
  ImageGalleryGridTile,
  ImageGalleryGridToggle,
  ImageGalleryImage,
  ImageGalleryNext,
  ImageGalleryOverflowTrigger,
  ImageGalleryOverlay,
  ImageGalleryPrevious,
  ImageGalleryStage,
  ImageGalleryStageFrame,
  ImageGalleryStageImage,
  ImageGalleryTopbar
};

/*
 * Registered globally by the same names they are exported under, so a template
 * that composes the `dialog` slot reads identically whether the parts were
 * imported or installed.
 */
const components = {
  ImageGallery,
  ImageGalleryCloseButton,
  ImageGalleryCounter,
  ImageGalleryGrid,
  ImageGalleryGridImage,
  ImageGalleryGridTile,
  ImageGalleryGridToggle,
  ImageGalleryImage,
  ImageGalleryNext,
  ImageGalleryOverflowTrigger,
  ImageGalleryOverlay,
  ImageGalleryPrevious,
  ImageGalleryStage,
  ImageGalleryStageFrame,
  ImageGalleryStageImage,
  ImageGalleryTopbar
};

const plugin: Plugin = {
  install(app: App) {
    Object.entries(components).forEach(([name, component]) => {
      app.component(name, component);
    });
  }
};

export default plugin;
