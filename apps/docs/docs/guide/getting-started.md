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

- `images`: array of `{ src, alt, id?, thumbnailSrc?, srcset?, sizes?, caption?, width?, height?, loading?, decoding? }`. Give each a stable `id` — it is how a tile finds its place in the collection
- the default slot: your preview markup. There are no layout props; arrangement and size are classes on your own elements
- `open` and `index`: optional controlled props for `v-model:open` and `v-model:index`
- `allowGridView`: enable or disable every route into the all-images grid
- `colorScheme`: force a light or dark palette for this instance
- `labels`: overrides for the built-in English strings and `aria-label`s
- `dialog-toolbar` and `dialog-caption`: slots for custom dialog controls and captions

## Building The Preview

`ImageGallery` renders no preview of its own — you put the tiles in its default slot, and CSS decides the arrangement. A different layout per breakpoint is a class, not a prop:

```vue
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

## Theming

Styling splits in two, along one line: **you style what you render, tokens style what the component renders.**

Your tiles and overflow trigger are your markup, so their appearance is classes — dark mode included, as a `dark:` variant. `imageClass` reaches the `<img>` inside a tile, where `object-fit` and the hover transform live:

```vue
<ImageGalleryImage
  :image="image"
  class="aspect-[4/5] rounded-xl bg-neutral-100 shadow-md dark:bg-neutral-800"
  image-class="transition duration-500 motion-safe:group-hover:scale-105"
/>
```

<LayoutShowcase
  root-class="grid grid-cols-3 gap-3"
  tile-class="aspect-[4/5] rounded-xl bg-neutral-100 shadow-md dark:bg-neutral-800"
  image-class="transition duration-500 group-hover:scale-105"
  :count="6"
/>

The dialog is the other half. It is rendered by the component and teleported to `<body>`, so no class of yours can reach it — tokens are the channel, and every one is named for the part it styles:

```css
:root {
  --ig-dialog-surface: #ffffff;
  --ig-dialog-text: rgba(60, 60, 67, 0.96);
  --ig-dialog-radius: 0.5rem;
  --ig-dialog-grid-columns-md: 3;
}
```

Declare them on `:root` for the whole site, or on any wrapper element to theme a single gallery. A neutral dark palette ships with the stylesheet and switches itself on under `prefers-color-scheme: dark`, a `.dark` class, or `[data-theme="dark"]`. If your app has its own light/dark toggle, add `data-ig-color-scheme` to the root element so the gallery follows your class rather than the OS preference.

See [Theming](/theming) for the full token table and a complete re-skin.

## Notes

- Import `image-gallery-kit/style.css` once in your app.
- `vue` is a peer dependency.
- The component is safe to render on the server; dialog and transition behavior activate on the client.
- The dialog traps focus, restores focus to the trigger, and locks body scroll while open.
