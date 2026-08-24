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

export default defineConfig({
  title: 'image-gallery-kit',
  description: 'Animated Vue image gallery component with a polished docs experience.',
  cleanUrls: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }]],
  srcExclude: ['README.md'],
  vite: {
    // Tailwind runs as a Vite plugin rather than a PostCSS plugin. Both
    // `@import 'tailwindcss'` and `@import 'tw-animate-css'` publish their CSS
    // only under the "style" export condition, which Vite's postcss-import
    // resolver does not honour; Tailwind's plugin resolves them itself.
    plugins: [tailwindcss()],
    // gsap is an optional peer of the package now, so nothing in the docs
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
      { text: 'Examples', link: '/examples' },
      { text: 'Theming', link: '/theming' },
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
          { text: 'Examples', link: '/examples' },
          { text: 'Theming', link: '/theming' },
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
