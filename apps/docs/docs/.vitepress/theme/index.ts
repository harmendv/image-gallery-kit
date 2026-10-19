import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { gsap } from 'gsap';
import { h } from 'vue';
import ImageGalleryKit from 'image-gallery-kit';
import 'image-gallery-kit/style.css';
import './style.css';
import DocsLogo from './DocsLogo.vue';
import HomeHero from '../../components/HomeHero.vue';
import DemoGrid from '../../components/DemoGrid.vue';
import LayoutShowcase from '../../components/LayoutShowcase.vue';

const theme: Theme = {
  ...DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'nav-bar-title-before': () => h(DocsLogo)
    }),
  enhanceApp({ app }) {
    app.use(ImageGalleryKit, { gsap });
    app.component('HomeHero', HomeHero);
    app.component('DemoGrid', DemoGrid);
    app.component('LayoutShowcase', LayoutShowcase);
  }
};

export default theme;
