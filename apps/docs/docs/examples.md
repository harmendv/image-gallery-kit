# Examples

Every example below is the same components with different classes — a preview layout paired with a dialog composed to match it. Neither half is configuration: the arrangement is your markup, and the dialog is the parts from [Anatomy](/anatomy) rearranged in the `dialog` slot.

Each one is a live gallery. Click a tile to open the dialog it is paired with.

## Responsive Arrangement

**A property listing.** The main image sits on top below `md` and docks left from `md`, and the tiles change height with it. Resize the page — no JavaScript is involved.

The dialog puts a wordmark and the one action a viewer came for beside the parts. `h-20` on the bar is the only sizing needed: the stage caps its frame to clear the bar and the grid scrolls its tiles under it, both from the height it ends up with.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-col gap-3 md:flex-row"
    main-class="h-56 shrink-0 rounded-2xl md:h-auto md:w-2/5"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
    tile-class="h-24 rounded-xl md:h-40"
    :count="5"
    dialog="listing"
  />
</div>

<<< ./snippets/examples/responsive.txt{vue-html}

`shrink-0` on the main image and `min-w-0 flex-1` on the grid are worth copying. Flex items refuse to shrink below their content by default, so a grid of images without `min-w-0` pushes past its container instead of narrowing.

## Plain Grid With Overflow

No main image. Six tiles at a fixed ratio, and an overflow trigger on the last one because the collection is larger.

The trigger lands in the grid view, so that view is where the composition spends its effort: dense square tiles and a tight gap, scannable in one screen. Your column classes are authoritative — the packing reads the resolved tracks back out, so `2xl:grid-cols-10` really packs into ten.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-2 gap-3 sm:grid-cols-3"
    tile-class="aspect-[4/5] rounded-xl"
    :count="6"
    dialog="contact-sheet"
  />
</div>

<<< ./snippets/examples/plain-grid.txt{vue-html}

## Uniform Grid

The all-images view packs each tile at its own image's ratio by default — the bento look. It doesn't have to: **one `aspect-*` class on the tile pins every tile to the same shape**, and `object-cover` crops each image to fill it.

The `uniform` flag on `ImageGalleryGrid` is the other half. The packing plans columns from each image's own ratio, so tiles that render at one shape regardless need it to plan the same way — without it, a column that drew the portraits is planned tall, rendered short, and comes up ragged at the bottom. With it, the packing is a plain round-robin: even columns, aligned rows, and a reading order that runs left-to-right. Your responsive column classes keep working unchanged.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-3 gap-3"
    tile-class="aspect-square rounded-xl"
    :count="6"
    dialog="uniform"
  />
</div>

<<< ./snippets/examples/uniform-grid.txt{vue-html}

## Left-Docked Main Image

**A product page.** `w-2/5` sizes the main image to two fifths of the row. It needs no height of its own: the tile grid establishes the height, and `align-items: stretch` — flex's default — makes the main image meet it.

A buyer wants the detail shot and a way to reach every other angle without leaving, so the caption carries the shot's description and the grid is dense enough to scan at a glance.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex gap-3"
    main-class="w-2/5 shrink-0 rounded-2xl"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
    tile-class="h-32 rounded-xl"
    :count="5"
    dialog="product"
  />
</div>

<<< ./snippets/examples/left-main.txt{vue-html}

## Right-Docked Main Image

Identical markup to the previous example, dialog included. The only difference is `flex-row-reverse`, so the reading order of your template stays main-image-first regardless of which side it lands on.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-row-reverse gap-3"
    main-class="w-2/5 shrink-0 rounded-2xl"
    grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
    tile-class="h-32 rounded-xl"
    :count="5"
    dialog="product"
  />
</div>

<<< ./snippets/examples/right-main.txt{vue-html}

## Top Banner

A wide banner over a row of squares. `aspect-[21/9]` sets the banner's ratio, and it composes with everything else because it is just a class.

The dialog drops the grid toggle and gives the stage a caption instead — the whole collection is already on screen in the preview, so the second view has little to add.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-col gap-3"
    main-class="aspect-[21/9] rounded-2xl"
    grid-class="grid grid-cols-3 gap-3"
    tile-class="aspect-square rounded-xl"
    :count="4"
    dialog="captions"
  />
</div>

<<< ./snippets/examples/top-banner.txt{vue-html}

## Bottom Banner

`flex-col-reverse` moves the banner underneath without reordering the markup — which matters, because DOM order is what decides tab order and what screen readers announce.

The bar follows it down. Position is a class on `ImageGalleryTopbar`, and its height is measured wherever it sits, so the stage clears it without being told.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex flex-col-reverse gap-3"
    main-class="h-48 rounded-2xl"
    grid-class="grid grid-cols-3 gap-3"
    tile-class="aspect-square rounded-xl"
    :count="4"
    dialog="bottom-bar"
  />
</div>

<<< ./snippets/examples/bottom-banner.txt{vue-html}

The grid pads for a bar at the top by default, so a bottom bar wants `pt-4` and a matching `pb-*`.

## Mosaic

**A photo essay.** Spans of differing size — a 2×2 main image and one double-width tile, both of them grid classes on the tiles.

The picture is the argument, so the text sits under it rather than over it and nothing crops. Note what this dialog **does not** do: it never pins a frame ratio.

That is deliberate, and it is the opposite of [Wide Tiles](#wide-tiles) below. This collection mixes portrait and landscape, and one fixed shape can only match one of them — pin `aspect-[3/2]` and the portraits arrive in a box far wider than they are, with a couple of hundred pixels of bar down each side. Letting each frame take its own image's ratio means `object-contain` fills the box exactly, so there is no letterbox at all and none for the flight to cross.

The flight still animates the change of crop, because a mosaic tile crops hard to fill its span while the stage shows the whole picture ([the flight](/anatomy#the-flight)). Matching the ratio is what keeps that change as small as it can be: the images this preview crops only along one axis fly with their box and picture growing in lockstep.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-4 grid-rows-[9rem_9rem] gap-3"
    main-class="col-span-2 row-span-2 rounded-2xl"
    tile-class="rounded-xl"
    first-tile-class="col-span-2"
    :count="4"
    dialog="essay"
  />
</div>

<<< ./snippets/examples/mosaic.txt{vue-html}

Note the explicit `grid-rows-[9rem_9rem]`. A tile has no intrinsic height, so `grid-rows-2` would size both rows to content and collapse to nothing — see [the warning in Layout](/layout#how-sizing-works).

## Scrolling Strip

**A lookbook.** No grid and no main image: a snap-scrolling row. The dialog opens on the right image and browses the whole collection.

Composed without `ImageGalleryTopbar`, the overlay reserves no room for a bar, so the stage runs the full height. The close button and the counter float over the image instead — `ImageGalleryCloseButton` claims initial focus wherever you put it, because that comes with the part rather than with the bar.

<div class="vp-raw">
  <LayoutShowcase
    root-class="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2"
    tile-class="h-40 w-56 shrink-0 snap-start rounded-xl"
    :count="6"
    dialog="lookbook"
  />
</div>

<<< ./snippets/examples/strip.txt{vue-html}

## Wide Tiles

`aspect-video` fixes each tile to 16 / 9. The ratio lives on the tile, so one tile can differ from its neighbours.

Pinning the same ratio on `ImageGalleryStageFrame` carries it into the dialog, and because the stage drives one `frame` template for all three roles, the active image and both neighbours square off together. A constant frame with bars where the image doesn't reach is what a cinema viewer does, and nothing resizes mid-turn.

It asks something of the collection, though: **pin a ratio only when your images share an orientation.** These do not, so the 3 : 2 shots sit in the 16 : 9 frame with a thin bar while the portraits get a wide one — and the wider the bar, the more the flight's box has to outgrow the picture landing inside it. Where a collection mixes orientations, leave the ratio off and let each frame take its own, as [Mosaic](#mosaic) does.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-2 gap-3"
    tile-class="aspect-video rounded-xl"
    :count="4"
    dialog="cinema"
  />
</div>

<<< ./snippets/examples/wide-tiles.txt{vue-html}

## Carousel Only

Place no overflow trigger and the preview has no route into the grid. `allow-grid-view="false"` closes the other one — the dialog's own "All images" toggle — and also makes any stray `ImageGalleryOverflowTrigger` render nothing, so the setting cannot be defeated from your markup.

With no second view to reach, the composition leaves `ImageGalleryGrid` out entirely and the bar carries only a reading and a way out.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-3 gap-3"
    tile-class="aspect-[4/5] rounded-xl"
    :count="6"
    :allow-grid-view="false"
    dialog="minimal"
  />
</div>

<<< ./snippets/examples/carousel-only.txt{vue-html}

## Leaving the dialog alone

The `dialog` slot's default content **is** the standard composition, so omitting it is not a lesser option — it is the same parts, already assembled. Every example above overrides it to make a point; this one does not, and nothing about the preview changes.

<div class="vp-raw">
  <LayoutShowcase
    root-class="grid grid-cols-4 gap-3"
    tile-class="aspect-square rounded-xl"
    :count="4"
  />
</div>

```vue-html
<ImageGallery :images="images">
  <div class="grid grid-cols-4 gap-3">
    <ImageGalleryImage
      v-for="image in images.slice(0, 4)"
      :key="image.id"
      :image="image"
      class="aspect-square rounded-xl"
    />
  </div>
</ImageGallery>
```

See [Anatomy](/anatomy) for the parts these dialogs are built from.
