/// <reference types="vite/client" />

/*
 * The dev-only warning in ImageGallery.vue gates on process.env.NODE_ENV,
 * which the consumer's bundler resolves; this package itself has no
 * @types/node, so the global is declared here. Optional, because the UMD
 * bundle can run in a bare browser where `process` does not exist.
 */
declare var process: { env: { NODE_ENV?: string } } | undefined;

declare module '*.vue' {
  import type { DefineComponent } from 'vue';

  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}
