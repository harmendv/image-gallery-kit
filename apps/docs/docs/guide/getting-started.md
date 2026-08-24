# Getting Started

`image-gallery-kit` is built for Vue 3.5+ and ships as a focused package: one component, one plugin install path, one stylesheet, and a small prop surface for layout control.

```sh
npm install image-gallery-kit
```

```ts
import 'image-gallery-kit/style.css'
```

## Use It In A Component

Import the component directly when you only need it in one place.

<<< ../snippets/local-usage.txt{vue}

## Register It As A Plugin

If you want `<ImageGallery />` globally available, use the default export as a Vue plugin.

<<< ../snippets/plugin-usage.txt{ts}

## What To Configure First

- `images`: array of `{ src, alt, id?, thumbnailSrc?, srcset?, sizes?, caption?, width?, height?, loading?, decoding? }`
- `rows` and `columns`: the maximum size of the secondary preview grid
- `imageAspectRatio`: the visible tile ratio in the preview layout
- `mainImageIndex`, `mainImagePosition`, `mainImageSize`: turn one image into the lead tile and dock it around the grid
- `open` and `index`: optional controlled props for `v-model:open` and `v-model:index`
- `allowGridView`: enable or disable the all-images grid entrypoint and dialog toggle
- `height`, `width`, `imageRadius`: presentation controls for the outer frame
- `labels`: overrides for the built-in English strings and `aria-label`s
- `dialog-toolbar`, `dialog-caption`, and `empty`: slots for custom dialog controls, captions, and the no-images placeholder

## Notes

- Import `image-gallery-kit/style.css` once in your app.
- `vue` is a peer dependency.
- The component is safe to render on the server; dialog and transition behavior activate on the client.
- The dialog traps focus, restores focus to the trigger, and locks body scroll while open.
