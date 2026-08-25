import DefaultTheme from 'vitepress/theme';
import type { Theme } from 'vitepress';
import { h } from 'vue';
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
    app.component('HomeHero', HomeHero);
    app.component('DemoGrid', DemoGrid);
    app.component('LayoutShowcase', LayoutShowcase);
  }
};

export default theme;
