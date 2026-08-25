<div align="center">

<img src="assets/logo.svg" alt="" width="88" height="88">

<h1>image-gallery-kit</h1>

<p><strong>SSR-safe Vue 3 image gallery</strong> — an animated preview grid, a fullscreen dialog carousel,<br>and an all-images grid, with tiles that fly between views.</p>

<p>
  <img src="https://img.shields.io/badge/Vue-3.5%2B-42b883?logo=vue.js&logoColor=white&style=flat-square" alt="Vue 3.5+">
  <img src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white&style=flat-square" alt="TypeScript">
  <img src="https://img.shields.io/badge/SSR-safe-0ea5e9?style=flat-square" alt="SSR safe">
  <img src="https://img.shields.io/badge/gsap-optional%20peer-88ce02?style=flat-square" alt="gsap optional peer">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-8b5cf6?style=flat-square" alt="MIT license"></a>
</p>

<p>
  <a href="https://www.npmjs.com/package/image-gallery-kit"><img src="https://img.shields.io/npm/v/image-gallery-kit?style=flat-square" alt="npm"></a>
  <a href="https://www.npmjs.com/package/image-gallery-kit"><img src="https://img.shields.io/npm/dm/image-gallery-kit?style=flat-square" alt="downloads"></a>
</p>

<p>
  <a href="https://harmendv.github.io/image-gallery-kit/">Documentation</a> ·
  <a href="https://harmendv.github.io/image-gallery-kit/guide/getting-started">Getting started</a> ·
  <a href="https://harmendv.github.io/image-gallery-kit/examples">Examples</a> ·
  <a href="https://harmendv.github.io/image-gallery-kit/theming">Theming</a> ·
  <a href="https://harmendv.github.io/image-gallery-kit/api">API</a>
</p>

</div>

---

## Why this one

|  | |
| --- | --- |
| **Layout is CSS, not props** | You write the preview markup. Arrangement, sizing and breakpoints are your own classes. |
| **A dialog that's actually finished** | Keyboard navigation, focus trap, focus restore, and body-scroll locking. |
| **Tiles fly into the dialog** | The real tile animates into place instead of cross-fading a copy. |
| **Renders on the server** | No browser globals touched before mount, no hydration mismatch, no empty-grid flash. |
| **Themed with tokens** | Every surface reads a CSS custom property. Reskin it without touching a class. |
| **Every string is yours** | All visible text and `aria-label`s come from one object. No i18n dependency. |
| **Stays in its lane** | No global CSS reset — the stylesheet only styles the gallery. |
| **Degrades cleanly** | `gsap` is an optional peer; without it every view works, just without transitions. |

## Install

```bash
npm install image-gallery-kit
```

`vue` (`^3.5`) is a required peer. `gsap` (`^3`) is optional and enables the shared-element transitions:

```bash
npm install gsap
```

## Quick start

```vue
<script setup lang="ts">
import { ImageGallery, ImageGalleryImage, type GalleryImage } from 'image-gallery-kit'
import 'image-gallery-kit/style.css'

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 1200, height: 900 },
  { src: '/two.jpg', alt: 'Two', width: 900, height: 1200 }
]
</script>

<template>
  <ImageGallery :images="images">
    <div class="grid grid-cols-3 gap-4">
      <ImageGalleryImage
        v-for="image in images"
        :key="image.src"
        :image="image"
        class="aspect-[4/5] rounded-xl"
      />
    </div>
  </ImageGallery>
</template>
```

<details>
<summary>Register it globally instead</summary>

```ts
import ImageGalleryKit from 'image-gallery-kit'
import 'image-gallery-kit/style.css'

app.use(ImageGalleryKit)
```

</details>

<details>
<summary>Control the dialog yourself</summary>

The dialog manages its own state by default. Pass `open` and/or `index` to take over:

```vue
<ImageGallery v-model:open="isOpen" v-model:index="activeIndex" :images="images" />
```

</details>

## Layouts

There are no layout props. The preview is your markup, so arrangement is whatever CSS you already write — including things a prop could never express, like a different arrangement per breakpoint:

```vue
<!-- Main image on top for phones, docked left from md -->
<ImageGallery :images="images">
  <div class="flex flex-col gap-3 md:flex-row">
    <ImageGalleryImage :image="images[0]" class="h-56 shrink-0 rounded-2xl md:h-auto md:w-2/5" />

    <div class="grid min-w-0 flex-1 grid-cols-2 gap-3">
      <ImageGalleryImage
        v-for="image in images.slice(1, 5)"
        :key="image.id"
        :image="image"
        class="h-24 rounded-xl md:h-40"
      >
        <!-- Knows how many images the preview left out, and hides itself when none -->
        <ImageGalleryOverflowTrigger v-slot="{ count }" class="absolute bottom-2 right-2">
          +{{ count }}
        </ImageGalleryOverflowTrigger>
      </ImageGalleryImage>
    </div>
  </div>
</ImageGallery>
```

`flex-row` / `flex-row-reverse` / `flex-col` / `flex-col-reverse` place the main image on any side.
A tile has no intrinsic height, so give it one — a class on the tile, or a definite track in its parent.

## API at a glance

<details open>
<summary><strong>Props</strong></summary>

| Prop | Type | Default |
| --- | --- | --- |
| `images` | `GalleryImage[]` | required |
| `open` | `boolean \| null` | `null` (uncontrolled) |
| `index` | `number \| null` | `null` (uncontrolled) |
| `allowGridView` | `boolean` | `true` |
| `imageAspectRatio` | `number \| string` | `'4 / 5'` |
| `colorScheme` | `'auto' \| 'light' \| 'dark'` | `'auto'` |
| `labels` | `Partial<GalleryLabels>` | `undefined` |

`imageAspectRatio` is a fallback for the all-images grid only — it needs a height per tile to pack columns, so images without intrinsic `width`/`height` borrow it. Preview tiles are sized by your classes.

`ImageGalleryImage` takes one prop, `image`. `ImageGalleryOverflowTrigger` takes none — it derives its count.

Layout is your markup; pure presentation — gaps, radii, `object-fit`, hover scale, transition duration — lives in [CSS tokens](#theming). Neither is a prop.

</details>

<details>
<summary><strong>Events</strong></summary>

| Event | Payload |
| --- | --- |
| `open` | `index: number` |
| `close` | — |
| `change` | `index: number` |
| `update:open` | `value: boolean` |
| `update:index` | `value: number` |

</details>

<details>
<summary><strong>Slots</strong></summary>

| Slot | Slot props |
| --- | --- |
| `dialog-toolbar` | `image`, `index`, `total`, `mode`, `close`, `toggleMode` |
| `dialog-caption` | `image`, `index`, `total` |
| `empty` | — |

</details>

Full prop, event, slot, and token reference: [the API docs](https://harmendv.github.io/image-gallery-kit/api).

## Theming

Every surface is driven by a CSS custom property. A neutral dark palette ships with the stylesheet and follows `prefers-color-scheme`, a `.dark` class, or `[data-theme="dark"]`; the `colorScheme` prop overrides both for a single instance. Transitions respect `prefers-reduced-motion`.

If your app has its own light/dark toggle, add `data-ig-color-scheme` to the root element so the gallery follows your class instead of the OS preference:

```html
<html data-ig-color-scheme="class">
```

```css
/* Tokens style the dialog -- the part you cannot reach with a class. */
:root {
  --ig-dialog-surface: #ffffff;
  --ig-dialog-text: rgba(60, 60, 67, 0.96);
  --ig-dialog-radius: 1.5rem;
  --ig-dialog-grid-columns-md: 3;
}
```

The preview is your markup, so its appearance is classes. `imageClass` reaches the `<img>` inside a tile:

```vue
<ImageGalleryImage
  :image="image"
  class="aspect-[4/5] rounded-xl shadow-md"
  image-class="transition duration-500 motion-safe:group-hover:scale-105"
/>
```

See [Theming](https://harmendv.github.io/image-gallery-kit/theming) for the complete token table.

## Repository layout

An npm-workspaces monorepo.

```
packages/image-gallery-kit   the published package (Vue component, styles, types)
apps/docs                    VitePress documentation site with live examples
```

## Development

```bash
npm install
npm run dev
```

The docs site aliases `image-gallery-kit` to the package source, so component changes show up without a rebuild.

| Command | What it does |
| --- | --- |
| `npm run dev` | Run the docs site against the package source |
| `npm run build` | Build the package, then the docs |
| `npm run build:package` | Build the package to `packages/image-gallery-kit/dist` |
| `npm run build:docs` | Build the docs site |
| `npm run preview:docs` | Preview the built docs site |
| `npm test` | Run the package test suite (Vitest) |
| `npm run typecheck` | Typecheck the package, templates included (`vue-tsc`) |
| `npm run lint` | Lint with oxlint (`lint:fix` to autofix) |
| `npm run format` | Format with oxfmt (`format:check` to verify only) |
| `npm run check` | Everything above, in the order CI should run it |
| `npm run clean` | Remove build output and caches |

## License

[MIT](LICENSE) © Harmen de Vries
