# image-gallery-kit

SSR-safe Vue 3 image gallery with a preview you compose yourself, a fullscreen
dialog carousel, and an all-images grid, with tiles that fly between the views.

- **Preview you compose yourself** — no layout props; arrangement and sizing are your own classes
- **Dialog carousel** with keyboard navigation, touch swipe, focus trap, and body-scroll locking
- **All-images grid** reached from an overflow trigger, with shared-element transitions between views
- **A dialog that comes apart** — sixteen components you rearrange in the `dialog` slot
- **Styled with classes** — no design tokens; every default is a class in `@layer components` that yours beats
- **SSR-safe** — no browser globals touched before mount
- **No global CSS reset** — the stylesheet only styles the gallery

## Install

```bash
npm install image-gallery-kit
```

`vue` (`^3.5`) is a required peer. `gsap` (`^3`) is an optional peer dependency:
install it to enable the shared-element transitions; without it every view works
the same, just without animation.

```bash
npm install gsap
```

## Usage

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

Or register every component globally as a plugin:

```ts
import ImageGalleryKit from 'image-gallery-kit'
import 'image-gallery-kit/style.css'

app.use(ImageGalleryKit)
```

## Styling

There are no design tokens and no theme prop. Every part is a component, every
default is a class in `@layer components`, and no part leaves a utility of its
own on the element — so a class of yours wins, with or without Tailwind:

```vue
<ImageGalleryCloseButton class="rounded-lg bg-black text-white" />
<ImageGalleryGrid class="grid-cols-3 gap-6 lg:grid-cols-6" />
```

Colour comes from CSS system colours (`Canvas`, `CanvasText`, `ButtonFace`,
`AccentColor`), which follow the reader's platform light/dark setting on their
own and collapse correctly under forced-colors. Your own dark mode is whatever
your project already does — `class="bg-white dark:bg-zinc-900"` on the parts.

## Documentation

Full prop, event, slot and component reference:
[harmendv.github.io/image-gallery-kit](https://harmendv.github.io/image-gallery-kit/).

- [Getting started](https://harmendv.github.io/image-gallery-kit/guide/getting-started)
- [Layout](https://harmendv.github.io/image-gallery-kit/layout)
- [Anatomy](https://harmendv.github.io/image-gallery-kit/api#anatomy)
- [Examples](https://harmendv.github.io/image-gallery-kit/examples)
- [Styling](https://harmendv.github.io/image-gallery-kit/theming)
- [API](https://harmendv.github.io/image-gallery-kit/api)

## License

MIT
