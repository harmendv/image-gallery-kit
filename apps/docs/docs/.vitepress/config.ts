import { defineConfig } from 'vitepress';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
  title: 'image-gallery',
  description: 'Animated Vue image gallery component with a polished docs experience.',
  cleanUrls: true,
  srcExclude: ['README.md'],
  vite: {
    resolve: {
      alias: {
        '@docs': fileURLToPath(new URL('../', import.meta.url))
      }
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
