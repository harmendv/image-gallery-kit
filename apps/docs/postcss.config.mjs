import { postcssIsolateStyles } from 'vitepress';

// Tailwind itself runs as a Vite plugin (see .vitepress/config.ts). It has to:
// `@import 'tailwindcss'` and `@import 'tw-animate-css'` expose their CSS only
// through the "style" export condition, which Vite's own postcss-import
// resolver does not honour — it falls back to a bare path join and fails.
// Tailwind's Vite plugin resolves those imports with its own resolver.
export default {
  plugins: [postcssIsolateStyles()]
};
