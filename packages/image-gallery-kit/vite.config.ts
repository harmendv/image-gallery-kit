import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'node:path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  plugins: [
    vue(),
    dts({
      include: ['src'],
      exclude: ['src/**/*.spec.ts', 'src/**/*.test.ts']
    })
  ],
  css: {
    postcss: './postcss.config.cjs'
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'ImageGallery',
      fileName: (format) => (format === 'es' ? 'image-gallery-kit.js' : 'image-gallery-kit.umd.cjs'),
      formats: ['es', 'umd']
    },
    rollupOptions: {
      // gsap is an optional peer: the composable imports it dynamically and
      // degrades gracefully, so it must not be inlined into the bundle.
      external: ['vue', 'gsap'],
      output: {
        exports: 'named',
        globals: {
          vue: 'Vue',
          gsap: 'gsap'
        }
      }
    }
  }
});
