# Getting Started

`image-gallery-kit` is built for Vue 3.5+ and ships as a focused package: sixteen components, one plugin install path, one stylesheet, and no layout or styling props — the arrangement and the appearance are markup and classes you write.

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

- `images`: array of `{ src, alt, id?, thumbnailSrc?, srcset?, sizes?, caption?, width?, height?, loading?, decoding? }`. Give each a stable `id` — it is how a tile finds its place in the collection
- the default slot: your preview markup. There are no layout props; arrangement and size are classes on your own elements
- `open` and `index`: optional controlled props for `v-model:open` and `v-model:index`
- `allowGridView`: enable or disable every route into the all-images grid
- `labels`: overrides for the built-in English strings and `aria-label`s
- `dialog-toolbar` and `dialog-caption`: slots for custom dialog controls and captions
- `dialog`: the whole dialog, if you want to recompose it. It defaults to the standard composition, so leaving it alone changes nothing — see [Anatomy](/anatomy) for the parts and [Examples](/examples) for worked compositions

## Building The Preview

`ImageGallery` renders no preview of its own — you put the tiles in its default slot, and CSS decides the arrangement. A different layout per breakpoint is a class, not a prop:

```vue-html
<ImageGallery :images="images">
  <div class="flex flex-col gap-3 md:flex-row">
    <ImageGalleryImage :image="images[0]" class="h-56 shrink-0 rounded-2xl md:h-auto md:w-2/5" />

    <div class="grid min-w-0 flex-1 grid-cols-2 gap-3 md:grid-cols-3">
      <ImageGalleryImage
        v-for="image in images.slice(1, 5)"
        :key="image.id"
        :image="image"
        class="h-24 rounded-xl md:h-40"
      />
    </div>
  </div>
</ImageGallery>
```

<LayoutShowcase
  root-class="flex flex-col gap-3 md:flex-row"
  main-class="h-56 shrink-0 rounded-2xl md:h-auto md:w-2/5"
  grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
  tile-class="h-24 rounded-xl md:h-40"
  :count="5"
/>

The dialog, carousel, all-images grid and transitions all render from `images`, so they work the same whatever your preview looks like. See [Layout](/layout) for sizing rules and the overflow trigger, and [Examples](/examples) for ready-made arrangements.

## Styling

There are no design tokens. Every part is a component, every default is a class
in `@layer components`, and no part leaves a utility of its own on the element --
so a class of yours wins, with or without Tailwind:

```vue
<ImageGalleryCloseButton class="rounded-lg bg-black text-white" />
<ImageGalleryGrid class="grid-cols-3 gap-6 lg:grid-cols-6" />
```

Colour comes from CSS system colours (`Canvas`, `CanvasText`, `ButtonFace`,
`AccentColor`), which follow the reader's platform light/dark setting on their
own and collapse correctly under forced-colors. Your own dark mode is whatever
your project already does -- `class="bg-white dark:bg-zinc-900"` on the parts.

See [Styling](/theming) for the whole surface, and [Anatomy](/anatomy) for the parts.

## Animation

Opening a tile plays a shared-element flight: the tile's frame and corner radius tween onto the dialog image, and the all-images grid animates its tiles in and out the same way.

Those animations are driven by [gsap](https://gsap.com), which is an *optional* peer dependency — install it to switch them on:

```sh
npm install gsap
```

Without it the gallery still works exactly as it does with it: the dialog opens, the index changes and the grid toggles, just without the tweens. The same is true under `prefers-reduced-motion: reduce`, which skips the animations even when gsap is installed.

## Notes

- Import `image-gallery-kit/style.css` once in your app.
- `vue` is a required peer dependency; `gsap` is an optional one that enables the animations.
- The component is safe to render on the server; dialog and transition behavior activate on the client.
- The dialog traps focus, restores focus to the trigger, and locks body scroll while open.
