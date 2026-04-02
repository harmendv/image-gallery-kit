import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

const docsRoot = fileURLToPath(new URL('../', import.meta.url));
const packageRoot = fileURLToPath(new URL('../../../../packages/image-gallery-kit/', import.meta.url));
const packageEntry = fileURLToPath(new URL('../../../../packages/image-gallery-kit/src/index.ts', import.meta.url));
const packageStyles = fileURLToPath(new URL('../../../../packages/image-gallery-kit/src/style.css', import.meta.url));
const packageSrcRoot = fileURLToPath(new URL('../../../../packages/image-gallery-kit/src/', import.meta.url));

export default defineConfig({
  title: 'image-gallery',
  description: 'Animated Vue image gallery component with a polished docs experience.',
  cleanUrls: true,
  srcExclude: ['README.md'],
  vite: {
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
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'Examples', link: '/examples' },
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
          { text: 'API', link: '/api' }
        ]
      }
    ],
    socialLinks: [
      { icon: 'npm', link: 'https://www.npmjs.com/package/image-gallery' }
    ],
    outline: 'deep',
    search: {
      provider: 'local'
    }
  }
});
