# Anatomy

The gallery is two trees. The **preview** is your markup — a layout you write, with tiles dropped into it. The **dialog** is a composition of parts that ships assembled but comes apart.

Import what you use, or install the plugin and use them all unprefixed.

```vue
<script setup lang="ts">
import {
  ImageGallery,
  ImageGalleryImage,
  ImageGalleryOverflowTrigger,
  ImageGalleryOverlay,
  ImageGalleryTopbar,
  ImageGalleryGridToggle,
  ImageGalleryCounter,
  ImageGalleryCloseButton,
  ImageGalleryStage,
  ImageGalleryStageFrame,
  ImageGalleryStageImage,
  ImageGalleryPrevious,
  ImageGalleryNext,
  ImageGalleryGrid,
  ImageGalleryGridTile,
  ImageGalleryGridImage
} from 'image-gallery-kit'
import 'image-gallery-kit/style.css'
</script>

<template>
  <ImageGallery>
    <!-- Preview: your layout, your classes. -->
    <ImageGalleryImage>
      <ImageGalleryOverflowTrigger />
    </ImageGalleryImage>

    <!-- Dialog: teleported to <body>. Omit to keep the default. -->
    <template #dialog>
      <ImageGalleryOverlay>
        <template #topbar>
          <ImageGalleryTopbar>
            <template #start><ImageGalleryGridToggle /></template>
            <template #center><ImageGalleryCounter /></template>
            <template #end><ImageGalleryCloseButton /></template>
          </ImageGalleryTopbar>
        </template>

        <ImageGalleryStage>
          <template #previous><ImageGalleryPrevious /></template>
          <template #next><ImageGalleryNext /></template>
          <!-- One template, three roles: the active frame and both neighbours. -->
          <template #frame="{ image, role }">
            <ImageGalleryStageFrame :image="image" :role="role">
              <ImageGalleryStageImage />
            </ImageGalleryStageFrame>
          </template>
          <template #caption />
        </ImageGalleryStage>

        <ImageGalleryGrid>
          <!-- Driven by the grid: the packing decides which image lands where. -->
          <template #tile="{ image, index }">
            <ImageGalleryGridTile :image="image" :index="index">
              <ImageGalleryGridImage />
            </ImageGalleryGridTile>
          </template>
        </ImageGalleryGrid>
      </ImageGalleryOverlay>
    </template>
  </ImageGallery>
</template>
```

## The `dialog` slot is optional

Everything under `#dialog` above **is** the default. It is not an alternative implementation you opt into — it is the slot's default content, so there is one dialog, not two. Write nothing and you get exactly that tree. Override the slot and you rebuild it from the same parts.

```vue
<!-- These render identically. -->
<ImageGallery :images="images">
  <ImageGalleryImage v-for="image in images" :key="image.id" :image="image" class="aspect-square rounded-xl" />
</ImageGallery>
```

## Behaviour travels with the parts

Each part registers what it provides, so a rearranged dialog is still a working one. Two consequences worth knowing before you recompose:

- **`ImageGalleryOverlay` provides the dialog root.** It carries `role="dialog"`, `aria-modal` and the accessible name, and registers the element the focus trap, the Tab cycle and the scroll lock all key on. Leave it out and you have a styled div that traps nothing.
- **`ImageGalleryCloseButton` claims initial focus.** Without it focus falls back to the first focusable element — which is usually the grid toggle, so the first thing a keyboard user is offered is a change of view rather than a way out.

Nothing else is load-bearing. Drop the counter, drop the arrows, reorder the topbar columns, wrap any part in your own markup. [Examples](./examples) pairs a worked dialog with every preview layout — cinema, contact sheet, bottom bar, chromeless.

## Parts

| Part | Renders | Notes |
| --- | --- | --- |
| `ImageGallery` | `<section>` | Root. Owns state, keyboard, scroll lock and the shared-element transition. |
| `ImageGalleryImage` | `<button>` | A preview tile. Unstyled and unsized — height, ratio, radius, shadow are your classes. |
| `ImageGalleryOverflowTrigger` | `<button>` | Opens the grid, and exposes the `+n` remainder count. |
| `ImageGalleryOverlay` | `<div role="dialog">` | Backdrop, shell and the panel that holds the two views. |
| `ImageGalleryTopbar` | `<div>` | A `1fr auto 1fr` grid, so the middle column stays centred on the viewport whatever the sides hold. |
| `ImageGalleryGridToggle` | `<button>` | Switches to the grid. Renders nothing when there is no second view to offer. |
| `ImageGalleryCounter` | `<div>` | The position reading. Renders nothing in grid mode. |
| `ImageGalleryCloseButton` | `<button>` | Closes, and takes initial focus. |
| `ImageGalleryStage` | `<div>` | The single-image view: the swipe surface, the stack and the caption. Renders in `single` mode. |
| `ImageGalleryStageFrame` | `<div>` | One image-sized box, in one of three roles — `active`, `previous`, `next`. The stage drives one template for all three. |
| `ImageGalleryStageImage` | `<img>` | The stage image. Takes no props; the frame around it says which image. |
| `ImageGalleryPrevious` / `ImageGalleryNext` | `<button>` | Step one image. Always rendered — a mouse never swipes, so they never contend with the gesture. |
| `ImageGalleryGrid` | `<div>` | The all-images view, and the grid element itself. Renders in `bento` mode. |
| `ImageGalleryGridTile` | `<button>` | One grid tile. Registers itself for the flight. |
| `ImageGalleryGridImage` | `<img>` | The tile image. Takes no props; the tile around it says which image. |

## Styling

**Every default is a class in `@layer components`, and no part leaves a utility of its own on the element.** That combination is what makes your class win: a Tailwind utility beats a layered class whatever the source order, and so does a plain unlayered class of your own. No merge helper, and no Tailwind required.

```vue
<!-- Replaces the fill. Keeps the radius, size, hover and focus ring. -->
<ImageGalleryCloseButton class="bg-white/90" />

<!-- Plain CSS works the same way. -->
<ImageGalleryTopbar class="my-topbar" />
```

Because the defaults are grouped per class rather than per property, **partial overrides work** — you replace the one declaration you name and inherit the rest.

The exceptions are deliberate, and both are values a class cannot express:

- **Each image's own ratio is a custom property, not an inline `aspect-ratio`.** So `aspect-video` on `ImageGalleryStageFrame`, or `aspect-square` on `ImageGalleryGridTile`, wins over it. Worth pinning whenever the image is `object-contain`, because a box that changes shape per image makes a letterboxed picture jump on every turn.
- **`touch-action` on the stage is unlayered.** Without `pan-y` the browser answers a swipe with a `pointercancel` partway through, so navigation would fire only sometimes.

Colour comes from CSS system colours, which follow the reader's platform on their own; everything else is a class on the part it belongs to. There are **no design tokens** — see [Styling](./theming).

## Data attributes

Present for styling hooks and for tests; all of them are stable API.

| Attribute | On | Values |
| --- | --- | --- |
| `data-bento-item` | a grid tile | `"true"` |
| `data-bento-index` | a grid tile | the image's index in `images` |
| `data-bento-active` | a grid tile | `"true"` on the tile matching the current index, `"false"` on the rest |
| `data-ig-entering` | a grid tile | `"true"` while the entrance animation is holding it back, `"false"` otherwise |
| `data-ig-swiping` | the stage | `"true"` only while a finger is actually down, `"false"` otherwise |
| `data-ig-slide` | a neighbour slide | `"previous"` \| `"next"` |
| `data-ig-tile-frame` | the image box inside a tile | `"true"` — marks the child the flight animation clones |
| `data-ig-flight` | a flying clone | `"true"` |
| `data-ig-flight-layer` | the clone's container | `"true"` — added to `<body>` for the length of a flight |

### The flight

Clicking a tile flies it into the stage. The clone carries the tile's own class list, so its radius, border, shadow and background travel with it and tween to whatever the stage has.

A **change of crop animates too**. `object-fit` is a discrete property — there is no halfway between `cover` and `contain` — so the flight does not lean on it: it pins the clone's image to the picture its source was painting and tweens that geometry to the picture the destination paints. A `cover` tile flying into an `object-contain` stage therefore scales continuously instead of snapping at the swap.

`object-position` is assumed to be centred, which is its default. Move it and the two ends still match; only the path between them would differ.

The swipe gesture is **touch-only**: a `pointerdown` whose `pointerType` is `mouse` never starts a turn. So the arrows and the gesture need no breakpoint to arbitrate between them — a touchscreen laptop can do both, and a mouse cannot drag the page out from under a click.

## Keyboard

Active whenever the dialog is open.

| Key | Result |
| --- | --- |
| <kbd>Escape</kbd> | Closes the dialog. |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Cycles focus within the dialog. Focus cannot leave it. |
| <kbd>→</kbd> | Next image. Single-image mode only. |
| <kbd>←</kbd> | Previous image. Single-image mode only. |

Focus lands on the close button when the dialog opens, and returns to the element that opened it on close. Controls that a media query has retired are excluded from the Tab cycle rather than left in it as dead stops.

## Accessibility notes

- The overlay is `role="dialog"` with `aria-modal="true"`, named from the counter so the accessible name says which image is open.
- Neighbour slides and flying clones are `aria-hidden`, and clones are `inert` — a decoration is never a tab stop.
- The grid toggle and the arrows are **absent** rather than disabled when they have nowhere to go, so they cost no Tab stop.
- `prefers-reduced-motion: reduce` skips every transition; the state change still happens, just without the flight.
