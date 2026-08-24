<div align="center">

# image-gallery-kit

SSR-safe Vue 3 image gallery with an animated preview grid, a fullscreen dialog carousel, and an all-images grid view.

[![npm](https://img.shields.io/npm/v/image-gallery-kit.svg)](https://www.npmjs.com/package/image-gallery-kit)
[![license](https://img.shields.io/npm/l/image-gallery-kit.svg)](LICENSE)

</div>

## Features

- **Preview grid** — configurable `rows`/`columns` with an optional featured image docked to any side
- **Dialog carousel** — keyboard navigation, focus trap, focus restore, and body-scroll locking
- **All-images grid** — reached from an overflow trigger, with shared-element transitions between views
- **SSR-safe** — no browser globals are touched before mount
- **Themeable** — every surface is a CSS custom property, with a dark palette and reduced-motion support
- **Fully labelled** — all visible strings and `aria-label`s are overridable, with no i18n dependency
- **No global CSS reset** — the stylesheet only styles the gallery
- **Optional animation** — `gsap` is an optional peer; without it every view still works, just without transitions

## Install

```bash
npm install image-gallery-kit
```

`vue` (`^3.5`) is a required peer dependency. `gsap` (`^3`) is optional and enables the shared-element transitions:

```bash
npm install gsap
```

## Usage

```vue
<script setup lang="ts">
import { ImageGallery, type GalleryImage } from 'image-gallery-kit'
import 'image-gallery-kit/style.css'

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 1200, height: 900 },
  { src: '/two.jpg', alt: 'Two', width: 900, height: 1200 }
]
</script>

<template>
  <ImageGallery :images="images" :rows="2" :columns="3" :main-image-index="0" />
</template>
```

Or register it globally as a plugin:

```ts
import ImageGalleryKit from 'image-gallery-kit'
import 'image-gallery-kit/style.css'

app.use(ImageGalleryKit)
```

The dialog manages its own state by default. Pass `open` and/or `index` to control it:

```vue
<ImageGallery v-model:open="isOpen" v-model:index="activeIndex" :images="images" />
```

## API at a glance

### Props

| Prop | Type | Default |
| --- | --- | --- |
| `images` | `GalleryImage[]` | required |
| `open` | `boolean \| null` | `null` (uncontrolled) |
| `index` | `number \| null` | `null` (uncontrolled) |
| `rows` | `number` | `2` |
| `columns` | `number` | `2` |
| `imageAspectRatio` | `number \| string` | `'4 / 5'` |
| `mainImageIndex` | `number \| null` | `null` |
| `mainImagePosition` | `'top' \| 'right' \| 'bottom' \| 'left'` | `'left'` |
| `mainImageSize` | `number \| string \| null` | `0.4` |
| `mainImageAspectRatio` | `number \| string \| null` | `null` |
| `gap` | `string \| null` | `null` |
| `imageFit` | `'cover' \| 'contain' \| null` | `null` |
| `allowGridView` | `boolean` | `true` |
| `height` | `string \| null` | `null` |
| `width` | `string \| null` | `'100%'` |
| `imageRadius` | `string \| null` | `null` |
| `labels` | `Partial<GalleryLabels>` | `undefined` |

`rows * columns` is the capacity of the *secondary* grid only — a featured image adds one tile on top of that. A numeric `mainImageSize` is a layout fraction; a string is a raw CSS size such as `18rem`.

### Events

| Event | Payload |
| --- | --- |
| `open` | `index: number` |
| `close` | — |
| `change` | `index: number` |
| `update:open` | `value: boolean` |
| `update:index` | `value: number` |

### Slots

| Slot | Slot props |
| --- | --- |
| `dialog-toolbar` | `image`, `index`, `total`, `mode`, `close`, `toggleMode` |
| `dialog-caption` | `image`, `index`, `total` |
| `empty` | — |

Full prop, event, slot, and token reference: [`apps/docs/docs/api.md`](apps/docs/docs/api.md), or run the docs site locally.

## Theming

Every surface is driven by CSS custom properties. A dark palette ships with the stylesheet and follows `prefers-color-scheme`, a `.dark` class, or `[data-theme="dark"]`.

```css
:root {
  --ig-radius: 0.75rem;
  --ig-gap: 1rem;
  --ig-surface: #ffffff;
  --ig-text: #111111;
  --ig-tile-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08);
}
```

See [`apps/docs/docs/theming.md`](apps/docs/docs/theming.md) for the complete token table.

## Repository layout

This is an npm-workspaces monorepo.

```
packages/image-gallery-kit   the published package (Vue component, styles, types)
apps/docs                    VitePress documentation site with live examples
```

## Development

```bash
npm install
```

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

The docs site aliases `image-gallery-kit` to the package source, so component changes show up without a rebuild.

## License

[MIT](LICENSE) © Harmen de Vries
