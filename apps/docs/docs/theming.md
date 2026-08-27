# Styling

There are no design tokens. Every part the gallery renders is a component, every default it applies is a class in `@layer components`, and no part leaves a utility of its own on the element — so a class of yours wins outright.

That combination is the whole styling API:

```vue
<ImageGalleryTopbar class="h-20 border-none bg-white/70 backdrop-blur-md">
  <template #end><ImageGalleryCloseButton class="rounded-lg bg-black text-white" /></template>
</ImageGalleryTopbar>
```

See [Anatomy](/api#anatomy) for the parts and how they nest.

## Why your class wins

A Tailwind utility lives in `@layer utilities`, which is declared after `components`, so it beats a layered default **whatever the source order**. A plain unlayered class of your own beats it too — layered rules always lose to unlayered ones. So this works without Tailwind, and without a `cn()`-style merge helper.

Because the defaults are grouped per class rather than per property, **partial overrides work**. `class="bg-white"` on the close button replaces the fill and keeps the radius, the size, the hover state and the focus ring.

Even each image's own ratio stays beatable: it is published as a custom property rather than an inline `aspect-ratio`, so `aspect-video` on a stage frame or `aspect-square` on a grid tile wins over it. Pin the shape when the image is `object-contain` — a box that changes shape per image makes a letterboxed picture jump on every turn.

One declaration is deliberately outside the layer, because it is a value a class cannot express: **`touch-action` on the stage**. Without `pan-y` the browser answers a swipe with a `pointercancel` partway through and navigation fires only sometimes.

## Colour

The dialog paints in **CSS system colours** — `Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `AccentColor`, mixed with `color-mix()` where a shade in between is wanted.

System colours follow the reader's platform light/dark setting on their own, and collapse correctly under forced-colors mode, so the default tracks the environment with no palette to declare, no media query to maintain and no `dark` class to watch for. The gallery does not bring a palette to your page — it borrows the platform's until you say otherwise.

### Following your own toggle

System colours resolve against the `color-scheme` in effect on the element, so an
app with its own light/dark switch needs no gallery-specific wiring — set
`color-scheme` where you set the switch, and every part follows it:

```css
:root { color-scheme: light }
:root.dark { color-scheme: dark }
```

That is one declaration for the whole dialog, and it beats the OS preference
rather than fighting it: pick light on a machine set to dark and the gallery
turns light with the rest of the page.

If you would rather paint the parts yourself, that works the same as any other
class:

```vue
<ImageGalleryOverlay class="bg-white dark:bg-zinc-900">
  <template #topbar>
    <ImageGalleryTopbar class="border-zinc-200 dark:border-zinc-800">
      <template #end>
        <ImageGalleryCloseButton class="bg-zinc-100 dark:bg-zinc-800" />
      </template>
    </ImageGalleryTopbar>
  </template>
  <ImageGalleryStage />
  <ImageGalleryGrid />
</ImageGalleryOverlay>
```

The gallery root itself carries no colour at all, because the preview inside it is your markup and inherits your page's text colour.

## Density and spacing

`<ImageGalleryGrid>` **is** the grid element, so its columns and gaps are classes on it. The component reads the resolved tracks back out of `grid-template-columns`, which means your own responsive column classes are understood rather than merely tolerated:

```vue
<ImageGalleryGrid class="grid-cols-3 gap-6 lg:grid-cols-6" />
```

One gap does both axes — the columns inherit it, so tiles down a column are spaced like the columns across.

## The image

`object-fit` is a class on the image part, not a setting:

```vue
<!-- Preview: the tile's own class reaches the tile, so imageClass reaches the image. -->
<ImageGalleryImage :image="image" image-class="object-contain" />

<!-- Dialog: -->
<ImageGalleryStageFrame :image="image" role="active">
  <ImageGalleryStageImage class="object-contain" />
</ImageGalleryStageFrame>
```

## Radius

One radius per part, and each reaches what is inside it:

- `<ImageGalleryStageFrame class="rounded-3xl">` — the stage image inherits it, and because the stage drives one `frame` template for all three roles, the two neighbours get it too.
- `<ImageGalleryGridTile class="rounded-none">` — the frame that clips the image inherits it.

## Internal variables

You may notice a handful of `--ig-internal-*` custom properties in the stylesheet and in the DOM. **They are not API — do not set or read them.** The prefix is the warning: anything named `--ig-internal-*` is private plumbing, exists because two places have to agree on one number exactly, and may be renamed or removed in any release without notice.

For the curious, what they carry:

| Variable | Why it exists |
| --- | --- |
| `--ig-internal-topbar-height` | Measured off the bar by `ImageGalleryOverlay`. The stage caps its frame to clear the bar, and the grid scrolls its tiles under it, so both need whatever height it actually has. Set the bar's height with a class and both follow. |
| `--ig-internal-slide-gap` | The resting offset of a neighbour slide, declared on the stack. The CSS resting transform and the component's mid-turn transform have to reach exactly the same value at either end of a turn. |
| `--ig-internal-frame-ratio` | One image's own ratio, set inline by `ImageGalleryStageFrame`. A class on the frame beats it. |
| `--ig-internal-tile-ratio` | The same, set inline by `ImageGalleryGridTile`. A class on the tile beats it. |

Everything these variables coordinate is reachable the supported way — a class on the part. Style the bar with a class and the height follows on its own; override a ratio with `aspect-*` on the frame or tile rather than with the variable.
