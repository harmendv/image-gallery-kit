import { defineConfig } from 'vitepress';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

const docsRoot = fileURLToPath(new URL('../', import.meta.url));
const packageRoot = fileURLToPath(new URL('../../../../packages/image-gallery-kit/', import.meta.url));
const packageEntry = fileURLToPath(
  new URL('../../../../packages/image-gallery-kit/src/index.ts', import.meta.url)
);
const packageStyles = fileURLToPath(
  new URL('../../../../packages/image-gallery-kit/src/style.css', import.meta.url)
);
const packageSrcRoot = fileURLToPath(new URL('../../../../packages/image-gallery-kit/src/', import.meta.url));

// Project pages are served from https://harmendv.github.io/image-gallery-kit/,
// so every generated URL needs that prefix. Absolute paths written by hand —
// raw HTML `href`/`src` and anything in `head` — are not rewritten by VitePress
// and must go through `withBase()` or this constant.
const base = '/image-gallery-kit/';

export default defineConfig({
  base,
  title: 'image-gallery-kit',
  description: 'Animated Vue image gallery component with a polished docs experience.',
  cleanUrls: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${base}logo.svg` }]],
  srcExclude: ['README.md'],

  // The example snippets are template *fragments*, not whole SFCs, so they are
  // fenced as `vue-html`: Shiki's `vue` grammar only tokenises HTML inside a
  // `<template>` block and emits every other line as one flat, uncoloured token.
  // `vue-html` resolves to a grammar Shiki registers under the name `template`,
  // which is what reaches the label, so both keys are mapped back to `vue`.
  markdown: {
    languageLabel: {
      'vue-html': 'vue',
      template: 'vue'
    }
  },
  vite: {
    // Tailwind runs as a Vite plugin rather than a PostCSS plugin. Both
    // `@import 'tailwindcss'` and `@import 'tw-animate-css'` publish their CSS
    // only under the "style" export condition, which Vite's postcss-import
    // resolver does not honour; Tailwind's plugin resolves them itself.
    plugins: [tailwindcss()],
    // gsap is an optional peer of the package, so nothing in the docs
    // source imports it and the dep scanner never sees the bare specifier
    // inside the built entry. Without this the gallery silently falls back to
    // its no-animation path.
    optimizeDeps: {
      include: ['gsap']
    },
    server: {
      fs: {
        allow: [packageRoot]
      }
    },
    resolve: {
      alias: [
        {
          find: 'image-gallery-kit/style.css',
          replacement: packageStyles
        },
        {
          find: 'image-gallery-kit',
          replacement: packageEntry
        },
        {
          find: /^@\//,
          replacement: `${packageSrcRoot}`
        },
        {
          find: '@docs',
          replacement: docsRoot
        }
      ]
    }
  },
  themeConfig: {
    nav: [
      { text: 'Getting Started', link: '/guide/getting-started' },
      { text: 'Layout', link: '/layout' },
      { text: 'Examples', link: '/examples' },
      { text: 'Styling', link: '/theming' },
      { text: 'API', link: '/api' }
    ],
    sidebar: [
      {
        text: 'Introduction',
        items: [
          { text: 'Overview', link: '/' },
          { text: 'Getting Started', link: '/guide/getting-started' }
        ]
      },
      {
        text: 'Reference',
        items: [
          { text: 'Layout', link: '/layout' },
          { text: 'Examples', link: '/examples' },
          { text: 'Styling', link: '/theming' },
          { text: 'API', link: '/api' }
        ]
      }
    ],
    socialLinks: [{ icon: 'npm', link: 'https://www.npmjs.com/package/image-gallery-kit' }],
    outline: 'deep',
    search: {
      provider: 'local'
    }
  }
});
