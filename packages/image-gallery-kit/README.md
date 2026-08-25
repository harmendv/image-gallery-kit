# image-gallery-kit

SSR-safe Vue 3 image gallery with an animated preview grid, a dialog carousel, and an all-images grid view.

- **Preview you compose yourself** — no layout props; arrangement and sizing are your own classes
- **Dialog carousel** with keyboard navigation, focus trap, and body-scroll locking
- **All-images grid** reached from an overflow trigger, with shared-element transitions between views
- **SSR-safe** — no browser globals touched before mount
- **Themeable** via CSS custom properties, including a dark palette and reduced-motion support
- **No global CSS reset** — the stylesheet only styles the gallery

## Install

```bash
npm install image-gallery-kit
```

`gsap` is an optional peer dependency. Install it to enable the shared-element
transitions; without it every view still works, just without animation.

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

Or register globally as a plugin:

```ts
import ImageGalleryKit from 'image-gallery-kit'
import 'image-gallery-kit/style.css'

app.use(ImageGalleryKit)
```

## Theming

Every surface is driven by CSS custom properties. A neutral dark palette ships
with the stylesheet and follows `prefers-color-scheme`, a `.dark` class, or
`[data-theme="dark"]`; the `colorScheme` prop overrides both per instance.

If your app has its own light/dark toggle, add `data-ig-color-scheme` to the
root element so the gallery follows your class rather than the OS preference:

```html
<html data-ig-color-scheme="class">
```

```css
:root {
  --ig-dialog-radius: 0.75rem;
  --ig-dialog-grid-columns-md: 3;
}
```

## Documentation

Full prop, event, slot, and token reference:
[harmendv.github.io/image-gallery-kit](https://harmendv.github.io/image-gallery-kit/).

- [Getting started](https://harmendv.github.io/image-gallery-kit/guide/getting-started)
- [Examples](https://harmendv.github.io/image-gallery-kit/examples)
- [Theming](https://harmendv.github.io/image-gallery-kit/theming)
- [API](https://harmendv.github.io/image-gallery-kit/api)

## License

MIT
