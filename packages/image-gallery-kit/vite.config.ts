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
      '@': resolve(import.meta.dirname, 'src')
    }
  },
  build: {
    lib: {
      entry: resolve(import.meta.dirname, 'src/index.ts'),
      fileName: () => 'image-gallery-kit.js',
      // Vite 8 names lib CSS after the library ("image-gallery-kit.css").
      // `image-gallery-kit/style.css` is public API — it is the import in the
      // README, the docs, and every consumer's setup — so pin the old name.
      cssFileName: 'style',
      formats: ['es']
    },
    rollupOptions: {
      // gsap is an optional peer: the composable imports it dynamically and
      // degrades gracefully, so it must not be inlined into the bundle.
      external: ['vue', 'gsap'],
      output: {
        exports: 'named'
      }
    }
  }
});
