import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
import 'image-gallery-kit/style.css';
import './style.css';
import DocsLogo from './DocsLogo.vue';
import GalleryShowcase from '../../components/GalleryShowcase.vue';
import HomeHero from '../../components/HomeHero.vue';

const theme: Theme = {
  ...DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      'nav-bar-title-before': () => h(DocsLogo)
    }),
  enhanceApp({ app }) {
    app.component('GalleryShowcase', GalleryShowcase);
    app.component('HomeHero', HomeHero);
  }
};

export default theme;
