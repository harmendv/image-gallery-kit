# API

`image-gallery-kit` exposes sixteen components, a plugin default export, the supporting types, and a stylesheet entry.

## Imports

```ts
import ImageGalleryPlugin, {
  // Root and preview
  ImageGallery,
  ImageGalleryImage,
  ImageGalleryOverflowTrigger,
  // Dialog parts
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
  ImageGalleryGridImage,
  // Types
  type GalleryDialogMode,
  type GalleryImage,
  type GalleryLabels
} from 'image-gallery-kit'
import 'image-gallery-kit/style.css'
```

The plugin registers every component under the same name it is exported by, so a
composed `dialog` slot reads identically whether you imported the parts or
installed the plugin.

```ts
import ImageGalleryPlugin from 'image-gallery-kit'

app.use(ImageGalleryPlugin)
```

## Anatomy

The gallery is two trees. The **preview** is your markup — a layout you write, with tiles dropped into it. The **dialog** is a composition of parts that ships assembled but comes apart.

```vue
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

Each part name links to its reference below.

| Part | Renders | Notes |
| --- | --- | --- |
| [`ImageGallery`](#props) | `<section>` | Root. Owns state, keyboard, scroll lock and the shared-element transition. |
| [`ImageGalleryImage`](#imagegalleryimage) | `<button>` | A preview tile. Unstyled and unsized — height, ratio, radius, shadow are your classes. |
| [`ImageGalleryOverflowTrigger`](#imagegalleryoverflowtrigger) | `<button>` | Opens the grid, and exposes the `+n` remainder count. |
| [`ImageGalleryOverlay`](#imagegalleryoverlay) | `<div role="dialog">` | Backdrop, shell and the panel that holds the two views. |
| [`ImageGalleryTopbar`](#imagegallerytopbar) | `<div>` | A `1fr auto 1fr` grid, so the middle column stays centred on the viewport whatever the sides hold. |
| [`ImageGalleryGridToggle`](#imagegallerygridtoggle) | `<button>` | Switches to the grid. Renders nothing when there is no second view to offer. |
| [`ImageGalleryCounter`](#imagegallerycounter) | `<div>` | The position reading. Renders nothing in grid mode. |
| [`ImageGalleryCloseButton`](#imagegalleryclosebutton) | `<button>` | Closes, and takes initial focus. |
| [`ImageGalleryStage`](#imagegallerystage) | `<div>` | The single-image view: the swipe surface, the stack and the caption. Renders in `single` mode. |
| [`ImageGalleryStageFrame`](#imagegallerystageframe) | `<div>` | One image-sized box, in one of three roles — `active`, `previous`, `next`. The stage drives one template for all three. |
| [`ImageGalleryStageImage`](#imagegallerystageimage) | `<img>` | The stage image. Takes no props; the frame around it says which image. |
| [`ImageGalleryPrevious`](#imagegalleryprevious-imagegallerynext) / [`ImageGalleryNext`](#imagegalleryprevious-imagegallerynext) | `<button>` | Step one image. Always rendered — a mouse never swipes, so they never contend with the gesture. |
| [`ImageGalleryGrid`](#imagegallerygrid) | `<div>` | The all-images view, and the grid element itself. Renders in `bento` mode. |
| [`ImageGalleryGridTile`](#imagegallerygridtile) | `<button>` | One grid tile. Registers itself for the flight. |
| [`ImageGalleryGridImage`](#imagegallerygridimage) | `<img>` | The tile image. Takes no props; the tile around it says which image. |

### The `dialog` slot is optional

Everything under `#dialog` above **is** the default. It is not an alternative implementation you opt into — it is the slot's default content, so there is one dialog, not two. Write nothing and you get exactly that tree. Override the slot and you rebuild it from the same parts.

```vue
<!-- These render identically. -->
<ImageGallery :images="images">
  <ImageGalleryImage v-for="image in images" :key="image.id" :image="image" class="aspect-square rounded-xl" />
</ImageGallery>
```

### Behaviour travels with the parts

Each part registers what it provides, so a rearranged dialog is still a working one. Two consequences worth knowing before you recompose:

- **`ImageGalleryOverlay` provides the dialog root.** It carries `role="dialog"`, `aria-modal` and the accessible name, and registers the element the focus trap, the Tab cycle and the scroll lock all key on. Leave it out and you have a styled div that traps nothing.
- **`ImageGalleryCloseButton` claims initial focus.** Without it focus falls back to the first focusable element — which is usually the grid toggle, so the first thing a keyboard user is offered is a change of view rather than a way out.

Nothing else is load-bearing. Drop the counter, drop the arrows, reorder the topbar columns, wrap any part in your own markup. [Examples](./examples) pairs a worked dialog with every preview layout — cinema, contact sheet, bottom bar, chromeless.

## `GalleryImage`

```ts
interface GalleryImage {
  id?: string | number
  src: string
  thumbnailSrc?: string
  srcset?: string
  sizes?: string
  alt: string
  caption?: string
  width?: number
  height?: number
  loading?: 'eager' | 'lazy'
  decoding?: 'sync' | 'async' | 'auto'
}
```

## Supporting Types

```ts
type GalleryDialogMode = 'single' | 'bento'

interface GalleryLabels {
  counter: (current: number, total: number) => string
  dialog: (counter: string) => string
  openImage: (index: number) => string
  openImageFromGrid: (index: number) => string
  showAllImages: (total: number) => string
  allImages: string
  toggleGrid: string
  close: string
  previous: string
  next: string
}
```

## Props

### Data and Control

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `images` | `GalleryImage[]` | required | The collection. Drives the dialog, carousel and all-images grid, and is what tiles resolve their index against. |
| `open` | `boolean \| null` | `null` | Controlled dialog state for `v-model:open`. Leave unset for internal state. |
| `index` | `number \| null` | `null` | Controlled active image index for `v-model:index`. Leave unset for internal state. |
| `imageAspectRatio` | `number \| string` | `'4 / 5'` | Fallback ratio for images with no intrinsic `width`/`height`. Read by the dialog and the all-images grid only — preview tiles are sized by your classes. |
| `loop` | `boolean` | `true` | Whether the carousel wraps at the ends. Off, the arrows disable at the edges, the arrow keys stop, and a swipe past an end rubber-bands instead of revealing a neighbour. |

### Labels

Every visible string and `aria-label` comes from `labels`, merged over English defaults. Pass only the keys you want to change — the component has no i18n dependency, so wire it to whatever your app already uses.

```vue-html
<ImageGallery
  :images="images"
  :labels="{
    counter: (current, total) => `${current} van ${total}`,
    openImage: (index) => `Foto ${index} openen`,
    allImages: 'Alle fotos',
    close: 'Sluiten'
  }"
/>
```

| Key | Type | Default |
| --- | --- | --- |
| `counter` | `(current: number, total: number) => string` | `` `${current} of ${total}` `` |
| `dialog` | `(counter: string) => string` | `` `Image dialog. ${counter}` `` |
| `openImage` | `(index: number) => string` | `` `Open image ${index}` `` |
| `openImageFromGrid` | `(index: number) => string` | `` `Open image ${index} from grid` `` |
| `showAllImages` | `(total: number) => string` | `` `Show all ${total} images` `` |
| `allImages` | `string` | `'All images'` |
| `toggleGrid` | `string` | `'Toggle image grid'` |
| `close` | `string` | `'Close dialog'` |
| `previous` | `string` | `'Previous image'` |
| `next` | `string` | `'Next image'` |

### Grid View

- Place `ImageGalleryOverflowTrigger` wherever the entrypoint belongs; it renders only when the collection is larger than the preview.
- The dialog shows an “All images” toggle so users can switch from the carousel to the bento grid.
- `allowGridView="false"` removes both, and the trigger renders nothing even if it is present in your markup.

### Large Collections

The grid renders every image and stays responsive into the thousands:

- Tiles are packed into explicit columns, shortest-column first, so the sequence reads across the grid. CSS multi-column balancing would instead put the first fifth of a collection in the first column.
- Off-screen tiles keep their reserved space but skip layout and paint, via `content-visibility`. Each tile carries its own aspect ratio so nothing shifts as it scrolls into range.
- The open and close transitions animate only the tiles in the scrollport, and the entrance cascade is spread across a fixed budget rather than a fixed per-tile delay.
- Opening the grid on an image below the fold scrolls it into view before the shared-image transition measures it.

Supplying `width` and `height` on each image lets the bento grid pack true mixed-height columns. Without them every tile falls back to `imageAspectRatio`, which is uniform and still packs correctly.

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

## Events

| Event | Payload | Meaning |
| --- | --- | --- |
| `open` | `index: number` | Fired when a preview or grid item opens. |
| `close` | none | Fired when the dialog closes. |
| `change` | `index: number` | Fired when the active image changes inside the dialog. |
| `update:open` | `value: boolean` | Emitted for `v-model:open` updates. |
| `update:index` | `value: number` | Emitted for `v-model:index` updates. |

## Slots

| Slot | Slot Props | Meaning |
| --- | --- | --- |
| default | `images`, `total`, `open`, `openGrid` | Your preview markup. Required — the component renders no preview of its own. See [Layout](/layout). |
| `dialog` | `image`, `index`, `total`, `mode`, `close`, `toggleMode` | Replaces the whole dialog. Defaults to the standard composition, so omitting it changes nothing. See [Anatomy](#anatomy). |
| `dialog-toolbar` | `image`, `index`, `total`, `mode`, `close`, `toggleMode` | Extends the dialog header with custom controls. |
| `dialog-caption` | `image`, `index`, `total` | Replaces the default caption area under the active dialog image. |

## Behavior Notes

- The fullscreen dialog has two views: the single-image carousel and the all-images bento grid.
- The component keeps SSR output free of browser-only dialog behavior until mounted.
- The dialog traps focus, restores focus to the previously focused trigger, and locks background scrolling while open.
- In the all-images grid, one tile is the Tab stop and the arrow keys move between tiles — `ArrowLeft` / `ArrowRight` follow the sequence, `ArrowUp` / `ArrowDown` walk the packed column, and `Home` / `End` jump to the ends — so Tab crosses the grid in a single step however large the collection is. Switching views moves focus with you: onto the active tile entering the grid, back onto the dialog's first control leaving it.
- In the carousel, `ArrowLeft` / `ArrowRight` page and `Escape` closes. A touch drag also turns the page: it slides the neighbour in, and lands the turn when the release is either past 40% of the stage or fast enough to read as a flick. One drag turns one image however far it runs. The gesture is touch-only — a mouse never swipes — so the arrows stay live at every width and neither has to be switched off for the other. `<ImageGalleryStage :swipe="false">` turns the gesture off; providing the `previous` and `next` slots empty removes the arrows.
- `vue` must be installed by the consuming app because it is a peer dependency.

### Keyboard

Active whenever the dialog is open.

| Key | Result |
| --- | --- |
| <kbd>Escape</kbd> | Closes the dialog. |
| <kbd>Tab</kbd> / <kbd>Shift</kbd>+<kbd>Tab</kbd> | Cycles focus within the dialog. Focus cannot leave it. |
| <kbd>→</kbd> | Next image. Single-image mode only. |
| <kbd>←</kbd> | Previous image. Single-image mode only. |

Focus lands on the close button when the dialog opens, and returns to the element that opened it on close. Controls that a media query has retired are excluded from the Tab cycle rather than left in it as dead stops.

### Accessibility notes

- The overlay is `role="dialog"` with `aria-modal="true"`, named from the counter so the accessible name says which image is open.
- Neighbour slides and flying clones are `aria-hidden`, and clones are `inert` — a decoration is never a tab stop.
- The grid toggle and the arrows are **absent** rather than disabled when they have nowhere to go, so they cost no Tab stop.
- `prefers-reduced-motion: reduce` skips every transition; the state change still happens, just without the flight.

## Component Reference

Every part below must be rendered inside `<ImageGallery>`; the dialog parts must be inside its `dialog` slot. Using one elsewhere throws at mount, naming the component.

None of the dialog parts take props. They read their state from the gallery, and their appearance is [yours to override with classes](#styling).

### `<ImageGalleryImage>`

A preview tile. Deliberately unstyled and unsized: height, width, aspect ratio, radius, background, shadow and hover are all classes you put on it.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `image` | `GalleryImage` | — | Required. Must be an entry of the root's `images`, matched by object identity, `id`, or `src`. |
| `imageClass` | `string \| null` | `null` | Classes for the inner `<img>`. The only way to reach it — `object-fit` and the hover transform belong to the image, not the tile. |

| Slot | Props | Description |
| --- | --- | --- |
| default | `{ index, image }` | A badge, a caption, or the overflow trigger. Positioned by you; the tile is a positioning context. |

The tile carries `group`, so `group-hover:` in `imageClass` reacts to a hover on the tile.

### `<ImageGalleryOverflowTrigger>`

Opens the grid, and knows how many images it stands for. Takes no props: the
count is `images.length` minus the number of tiles that registered, so it stays
correct when the previewed subset changes. Renders nothing when that count is
zero, or when `allowGridView` is `false`.

| Slot | Props | Description |
| --- | --- | --- |
| default | `{ count }` | Replaces the default icon and count. |

### `<ImageGalleryOverlay>`

Provides the dialog root: `role="dialog"`, `aria-modal="true"`, the accessible name, and the element the focus trap keys on. Renders the shell and the panel that holds the two views.

| Slot | Description |
| --- | --- |
| `topbar` | A sibling of the panel, on its own stacking level, so a translucent bar reads as glass over the stage rather than over flat paint. |
| default | The views. `ImageGalleryStage` and `ImageGalleryGrid` each render only in their own mode, so both belong here. |

### `<ImageGalleryTopbar>`

A `1fr auto 1fr` grid. The middle column stays centred on the viewport whatever the sides hold — a wider button on one side cannot shove it off centre.

| Slot | Description |
| --- | --- |
| `start` | Left column. |
| `center` | Middle column, held on the viewport centre. |
| `end` | Right column. |

Leaving a column empty is fine; the grid still holds the middle in place.

### `<ImageGalleryGridToggle>`

Switches to the grid view. Renders nothing when `allowGridView` is `false`, when the collection has one image, or when already in grid mode.

| Slot | Props | Description |
| --- | --- | --- |
| default | `{ label }` | Replaces the icon and text. |

### `<ImageGalleryCounter>`

Renders nothing in grid mode — a position reading beside a wall of thumbnails describes a place the reader has stepped out of.

| Slot | Props | Description |
| --- | --- | --- |
| default | `{ label, index, total }` | Reformat the reading without restating the `counter` label function. |

### `<ImageGalleryCloseButton>`

Closes the dialog, and takes focus when it opens.

| Slot | Description |
| --- | --- |
| default | Replaces the icon. |

### `<ImageGalleryStage>`

The single-image view. Renders in `single` mode. Owns the swipe surface and the stack the frame and its two neighbours share a centre in.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `swipe` | `boolean` | `true` | Whether a touch drag turns the page. A mouse never swipes either way, so this is only about switching the gesture off — for a stage inside a horizontally scrolling layout, say. |

| Slot | Props | Description |
| --- | --- | --- |
| `frame` | `{ image, role }` | Invoked three times — `role` is `active`, `previous` or `next`. Defaults to `<ImageGalleryStageFrame />`. One template for all three, so a radius or shadow you set applies to every role. |
| `previous` | — | Defaults to `<ImageGalleryPrevious />`. Provide it empty to remove the arrow entirely — it then costs no Tab stop. |
| `next` | — | Defaults to `<ImageGalleryNext />`. Same. |
| `caption` | `{ image, index, total }` | Defaults to `image.caption`. Renders only when the slot is given or the image has one. |

The two ways forward are removed by different means, which looks inconsistent until you see why:

- **An arrow is a slot**, so you remove it by providing that slot empty. That takes it out of the DOM rather than hiding it, so it costs no Tab stop. The arrow slots are the only ones that work this way — `frame`, `tile` and `image` always fall back to their default, because an empty one is almost certainly a mistake.
- **The gesture is not an element**, so there is no slot to leave empty and it takes a prop: `:swipe="false"`.

Neither needs turning *on*. `swipe` defaults to `true` and the arrows render unless you say otherwise, because a stage with no way forward is never what you meant.

### `<ImageGalleryStageFrame>`

One image-sized box on the stage. The active frame is what the shared-element transition flies into and out of, and registers itself; a neighbour carries the turn's transform and is hidden from assistive technology, being a duplicate of something already on screen.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `image` | `GalleryImage` | — | Required. Which image this frame draws. |
| `role` | `'active' \| 'previous' \| 'next'` | — | Required. Decides behaviour, not appearance. |

| Slot | Description |
| --- | --- |
| default | Defaults to `<ImageGalleryStageImage />`. |

### `<ImageGalleryStageImage>`

The stage `<img>`. No props — the frame around it says which image and in which role. `object-fit` is a class you put here.

### `<ImageGalleryPrevious>` / `<ImageGalleryNext>`

Step one image. Both render by default at every width — a mouse never swipes, so they never contend with the gesture. Remove one by providing `ImageGalleryStage`'s matching slot empty; hide it at some width with a class of your own.

| Slot | Description |
| --- | --- |
| default | Replaces the icon. |

### `<ImageGalleryGrid>`

The all-images view, and the grid element itself. Renders in `bento` mode. Columns are explicit elements rather than CSS multi-column, which is what lets `content-visibility` keep a collection of thousands affordable.

Density and spacing are classes on it, and the resolved `grid-template-columns` tracks are read back out to pack the columns — so your own `md:grid-cols-6` is understood.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `uniform` | `boolean` | `false` | Say this when every tile shares one shape (an `aspect-*` class on the tile). The packing plans columns from each image's own ratio; tiles that render at one shape regardless need it to plan the same way, or the columns come up ragged. Uniform packing is round-robin, so the reading order runs left-to-right. See [Uniform Grid](/examples#uniform-grid). |

| Slot | Props | Description |
| --- | --- | --- |
| `tile` | `{ image, index }` | Invoked per packed entry. Defaults to `<ImageGalleryGridTile />`. The packing decides which image lands in which column, so the loop is not yours to write. |

### `<ImageGalleryGridTile>`

One grid tile. Registers itself as the element the flight measures, and carries the `data-bento-*` attributes.

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `image` | `GalleryImage` | — | Required. Which image this tile draws. |
| `index` | `number` | — | Required. Its position in the collection — the grid's packing supplies it. |

| Slot | Props | Description |
| --- | --- | --- |
| `image` | — | Defaults to `<ImageGalleryGridImage />`. |
| default | `{ image, index }` | Rendered after the image, inside the tile. For a badge or a selection marker. Left behind when the tile flies. |

### `<ImageGalleryGridImage>`

The tile `<img>`. No props — the tile around it says which image. `object-fit` is a class you put here.
