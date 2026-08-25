# Layout

`ImageGallery` renders no preview of its own. You put the tiles in its default slot, and **arrangement and size are CSS** — so every breakpoint is a class you already know how to write.

```vue-html
<ImageGallery :images="images">
  <div class="grid grid-cols-3 gap-3">
    <ImageGalleryImage
      v-for="image in images.slice(0, 3)"
      :key="image.id"
      :image="image"
      class="h-32 rounded-xl md:h-48"
    />
  </div>
</ImageGallery>
```

<LayoutShowcase
  root-class="grid grid-cols-3 gap-3"
  tile-class="h-32 rounded-xl md:h-48"
  :count="3"
/>

What the component owns is everything that isn't layout: the fullscreen dialog, the carousel, the all-images grid, the shared-element flight animation, focus trapping, scroll locking and keyboard handling. All of it renders from `images`, so it works the same whatever your preview looks like.

## How Sizing Works

`ImageGalleryImage` is deliberately unsized. It renders a positioning context and an overflow clip, and the image inside fills it absolutely. Everything else is yours:

| You write | Effect |
| --- | --- |
| `h-24 md:h-40` | Fixed height per breakpoint. |
| `aspect-[4/5]` | Height from width and a ratio. |
| `md:w-2/5` | Width as a fraction of a flex row. |
| `col-span-2 row-span-2` | Grid spans, when the parent is a grid. |
| `rounded-xl` | Corner radius. The component's `overflow-hidden` makes it clip the image. |

Because the clip lives on the tile, a radius class works without any extra wrapper.

The `<img>` inside a tile is a descendant, so your classes cannot reach it — `imageClass` does. That is where `object-fit` and the hover transform belong, and the tile carries `group` so a hover anywhere on it can drive the image:

```vue-html
<ImageGalleryImage
  :image="image"
  class="aspect-[4/5] rounded-xl bg-neutral-100"
  image-class="object-cover transition duration-500 motion-safe:group-hover:scale-105"
/>
```

Since the hover is yours, so is its reduced-motion behaviour — hence `motion-safe:`. The component has no hover of its own to disable.

::: warning A tile has no intrinsic height
The image inside a tile is absolutely positioned, so the tile contributes **nothing** to its own height. Every tile needs its height to come from somewhere — a class on it, or a definite track in its parent.

This is easy to trip over in a grid, because grid rows size to their content by default and a row of tiles has no content height to measure:

```vue-html
<!-- Collapses to zero. `grid-rows-2` sizes both rows to content, and there is none. -->
<div class="grid grid-cols-4 grid-rows-2 gap-3">
  <ImageGalleryImage :image="images[0]" class="col-span-2 row-span-2" />
</div>

<!-- Works: the tracks are definite. -->
<div class="grid grid-cols-4 grid-rows-[9rem_9rem] gap-3">
  <ImageGalleryImage :image="images[0]" class="col-span-2 row-span-2" />
</div>

<!-- Also works: each tile carries its own height. -->
<div class="grid grid-cols-4 gap-3">
  <ImageGalleryImage :image="images[0]" class="aspect-[4/5]" />
</div>
```

Every tile in the first one computes to exactly `0px` tall, so there is nothing to show. Both fixes render properly, and they differ: definite tracks give every tile the same height, while `aspect-[4/5]` lets each tile derive its own from its width:

<DemoGrid>
  <LayoutShowcase
    label="grid-rows-[9rem_9rem] — definite tracks"
    root-class="grid grid-cols-4 grid-rows-[9rem_9rem] gap-3"
    main-class="col-span-2 row-span-2 rounded-2xl"
    tile-class="rounded-xl"
    :count="5"
  />
  <LayoutShowcase
    label="aspect-[4/5] — tiles size themselves"
    root-class="grid grid-cols-4 gap-3"
    tile-class="aspect-[4/5] rounded-xl"
    :count="4"
  />
</DemoGrid>

In a flex row the reverse applies and works in your favour: `align-items: stretch` is the default, so a main image with no height of its own grows to match the tile grid beside it. That is how the [left-docked example](/examples#left-docked-main-image) keeps both sides equal without stating a height anywhere.
:::

## Positioning The Main Image

`flex-direction` places the main image, and unlike a prop it takes a breakpoint:

| Main image sits | Class |
| --- | --- |
| Left | `flex` |
| Right | `flex flex-row-reverse` |
| Top | `flex flex-col` |
| Bottom | `flex flex-col-reverse` |

The `-reverse` variants matter for more than brevity: they move the image visually without reordering your markup, and DOM order is what decides tab order and what a screen reader announces. Write the main image first and let CSS place it.

<DemoGrid>
  <LayoutShowcase
    label="flex"
    root-class="flex gap-2"
    main-class="w-2/5 shrink-0 rounded-xl"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-2"
    tile-class="h-20 rounded-lg"
    :count="5"
  />
  <LayoutShowcase
    label="flex flex-row-reverse"
    root-class="flex flex-row-reverse gap-2"
    main-class="w-2/5 shrink-0 rounded-xl"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-2"
    tile-class="h-20 rounded-lg"
    :count="5"
  />
  <LayoutShowcase
    label="flex flex-col"
    root-class="flex flex-col gap-2"
    main-class="h-28 rounded-xl"
    grid-class="grid grid-cols-4 gap-2"
    tile-class="h-16 rounded-lg"
    :count="5"
  />
  <LayoutShowcase
    label="flex flex-col-reverse"
    root-class="flex flex-col-reverse gap-2"
    main-class="h-28 rounded-xl"
    grid-class="grid grid-cols-4 gap-2"
    tile-class="h-16 rounded-lg"
    :count="5"
  />
</DemoGrid>

Combining them is the part no prop could do — top on phones, left on desktops:

```vue-html
<!-- Resize the page to see this one switch. -->
<div class="flex flex-col md:flex-row gap-3">
```

<LayoutShowcase
  root-class="flex flex-col gap-3 md:flex-row"
  main-class="h-40 shrink-0 rounded-2xl md:h-auto md:w-2/5"
  grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
  tile-class="h-20 rounded-xl md:h-[6.25rem]"
  :count="5"
/>

## Overflow Counts Itself

`images` is the source of truth for the collection; your slot describes only what the preview shows. The difference between the two is the overflow, so `ImageGalleryOverflowTrigger` derives its own count and renders nothing when there is none:

```vue-html
<ImageGalleryOverflowTrigger v-slot="{ count }" class="absolute bottom-2 right-2">
  +{{ count }}
</ImageGalleryOverflowTrigger>
```

Four tiles out of twenty, so the trigger reads `+16`. Click it to land in the all-images grid:

<LayoutShowcase
  root-class="grid grid-cols-4 gap-3"
  tile-class="aspect-square rounded-xl"
  :count="4"
/>

Change how many tiles you render — at a breakpoint, from a filter, from a "show more" toggle — and the count follows without you restating anything. Place it inside an `ImageGalleryImage` to pin it to a tile (the tile is already a positioning context, so `absolute` works), or anywhere else in the slot to stand on its own. Its default content is a grid icon; the slot replaces it.

Setting `allow-grid-view="false"` makes it render nothing regardless, so the option cannot be defeated by a stray trigger.

## Slot Props

The default slot receives what only the gallery can know:

| Prop | Type | Meaning |
| --- | --- | --- |
| `images` | `GalleryImage[]` | The collection, as passed. |
| `total` | `number` | `images.length` — the whole collection, not your previewed subset. |
| `open` | `(index: number) => void` | Open the carousel at a collection index. |
| `openGrid` | `(index: number) => void` | Open the all-images grid, scrolled to a collection index. |

```vue-html
<ImageGallery v-slot="{ total, open, openGrid }" :images="images">
  <ImageGalleryImage v-for="image in images.slice(0, 4)" :key="image.id" :image="image" class="h-32" />

  <button @click="openGrid(0)">Browse all {{ total }}</button>
  <button @click="open(0)">Start a slideshow</button>
</ImageGallery>
```

<LayoutShowcase
  root-class="grid grid-cols-4 gap-3"
  tile-class="h-32 rounded-xl"
  :count="4"
  :controls="true"
/>

There is deliberately no `previewed` or `overflow` slot prop. Tiles register themselves during setup, which runs inside this component's render pass — so a slot prop carrying that count would make the render invalidate itself every time a tile registered. The count reaches you through `ImageGalleryOverflowTrigger` instead, which is a separate component rendering after the tiles. Nothing is lost: you chose which tiles to render, so you already know how many there are.

## How An Image Finds Its Index

Every tile needs its position in `images` — the carousel counter, the arrow keys and the flight animation all key on it. `ImageGalleryImage` takes an `image`, not an index, and the gallery resolves it by object identity, then `id`, then `src`.

The fallbacks matter more than they look. A collection built in a computed property hands children a fresh object on every recompute:

```ts
const images = computed(() => photos.value.map((p, index) => ({ ...p, id: index })))
```

Identity alone would resolve to `-1` there and the tile would quietly stop opening. A stable `id` is the reliable fix; matching on `src` is the last resort. An image matching nothing in `images` logs a development warning and its tile becomes inert.

::: tip
Render your tiles from the same array you pass to `images` — `images.slice(0, 5)`, a filter, whatever subset you like. Then identity matches on the first try and the fallbacks never run.
:::

## Tile Overlays

`ImageGalleryImage` has a default slot for anything that sits on top of the image — a badge, a caption, an index, the overflow trigger. The tile is already `position: relative`, so `absolute` works directly:

```vue-html
<ImageGalleryImage v-slot="{ index }" :image="image" class="aspect-square">
  <span class="absolute left-2 top-2 rounded bg-black/60 px-2 text-xs text-white">
    {{ index + 1 }}
  </span>
</ImageGalleryImage>
```

The index is the position in `images`, so it keeps counting from wherever your preview starts:

<LayoutShowcase
  root-class="grid grid-cols-4 gap-3"
  tile-class="aspect-square rounded-xl"
  :count="4"
  :overlay="true"
/>

## Server Rendering

Tiles register during setup rather than on mount, so the overflow count is already correct in server-rendered HTML instead of being corrected after hydration. Nothing reads a tile's element until it is clicked, so no measurement happens on the server.

## Errors

`ImageGalleryImage` and `ImageGalleryOverflowTrigger` read the gallery through provide/inject and throw immediately if they cannot find it:

```
[image-gallery-kit] <ImageGalleryImage> must be rendered inside the default slot of <ImageGallery>.
```

The usual cause is a wrapper component that renders the tiles but sits outside the gallery. Inject crosses component boundaries freely, so the fix is to move the `ImageGallery` up so the tiles render inside its slot — the wrapper itself is fine.
