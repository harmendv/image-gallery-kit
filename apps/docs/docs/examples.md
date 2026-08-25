# Examples

Every example below is the same component with different classes. `ImageGallery` owns the dialog, the carousel, the all-images grid and the transitions; your markup owns the layout.

These run the real package from the workspace, not a local source import.

## Responsive Arrangement

The main image sits on top below `md` and docks left from `md`, and the tiles change height with it. Resize the page — no JavaScript is involved.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-col gap-3 md:flex-row"
    main-class="h-56 shrink-0 rounded-2xl md:h-auto md:w-2/5"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
    tile-class="h-24 rounded-xl md:h-40"
    :count="5"
  />
</div>

<<< ./snippets/examples/responsive.txt{vue-html}

`shrink-0` on the main image and `min-w-0 flex-1` on the grid are worth copying. Flex items refuse to shrink below their content by default, so a grid of images without `min-w-0` pushes past its container instead of narrowing.

## Plain Grid With Overflow

No main image. Six tiles at a fixed ratio, and an overflow trigger on the last one because the collection is larger.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-2 gap-3 sm:grid-cols-3"
    tile-class="aspect-[4/5] rounded-xl"
    :count="6"
  />
</div>

<<< ./snippets/examples/plain-grid.txt{vue-html}

## Left-Docked Main Image

`w-2/5` sizes the main image to two fifths of the row. It needs no height of its own: the tile grid establishes the height, and `align-items: stretch` — flex's default — makes the main image meet it.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex gap-3"
    main-class="w-2/5 shrink-0 rounded-2xl"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
    tile-class="h-32 rounded-xl"
    :count="5"
  />
</div>

<<< ./snippets/examples/left-main.txt{vue-html}

## Right-Docked Main Image

Identical markup to the previous example. The only difference is `flex-row-reverse`, so the reading order of your template stays main-image-first regardless of which side it lands on.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-row-reverse gap-3"
    main-class="w-2/5 shrink-0 rounded-2xl"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
    tile-class="h-32 rounded-xl"
    :count="5"
  />
</div>

<<< ./snippets/examples/right-main.txt{vue-html}

## Top Banner

A wide banner over a row of squares. `aspect-[21/9]` sets the banner's ratio, and it composes with everything else because it is just a class.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-col gap-3"
    main-class="aspect-[21/9] rounded-2xl"
    grid-class="grid grid-cols-3 gap-3"
    tile-class="aspect-square rounded-xl"
    :count="4"
  />
</div>

<<< ./snippets/examples/top-banner.txt{vue-html}

## Bottom Banner

`flex-col-reverse` moves the banner underneath without reordering the markup — which matters, because DOM order is what decides tab order and what screen readers announce.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-col-reverse gap-3"
    main-class="h-48 rounded-2xl"
    grid-class="grid grid-cols-3 gap-3"
    tile-class="aspect-square rounded-xl"
    :count="4"
  />
</div>

<<< ./snippets/examples/bottom-banner.txt{vue-html}

## Mosaic

Spans of differing size — a 2×2 main image and one double-width tile. There was no way to ask for this before.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-4 grid-rows-[9rem_9rem] gap-3"
    main-class="col-span-2 row-span-2 rounded-2xl"
    tile-class="rounded-xl"
    first-tile-class="col-span-2"
    :count="4"
  />
</div>

<<< ./snippets/examples/mosaic.txt{vue-html}

Note the explicit `grid-rows-[9rem_9rem]`. A tile has no intrinsic height, so `grid-rows-2` would size both rows to content and collapse to nothing — see [the warning in Layout](/layout#how-sizing-works).

## Scrolling Strip

No grid and no main image: a snap-scrolling row. The dialog still opens on the right image and still browses the whole collection.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
    tile-class="h-40 w-56 shrink-0 snap-start rounded-xl"
    :count="6"
  />
</div>

<<< ./snippets/examples/strip.txt{vue-html}

## Wide Tiles

`aspect-video` fixes each tile to 16 / 9. The ratio lives on the tile, so one tile can differ from its neighbours.

<div class="vp-raw">
  <LayoutShowcase root-class="grid grid-cols-2 gap-3" tile-class="aspect-video rounded-xl" :count="4" />
</div>

<<< ./snippets/examples/wide-tiles.txt{vue-html}

## Carousel Only

Place no overflow trigger and the preview has no route into the grid. `allow-grid-view="false"` closes the other one — the dialog's own "All images" toggle — and also makes any stray `ImageGalleryOverflowTrigger` render nothing, so the setting cannot be defeated from your markup.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-3 gap-3"
    tile-class="aspect-[4/5] rounded-xl"
    :count="6"
    :allow-grid-view="false"
  />
</div>

<<< ./snippets/examples/carousel-only.txt{vue-html}
