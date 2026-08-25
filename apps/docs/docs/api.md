# API

`image-gallery-kit` exposes three components, a plugin default export, the supporting types, and a stylesheet entry.

## Imports

```ts
import ImageGalleryPlugin, {
  ImageGallery,
  ImageGalleryImage,
  ImageGalleryOverflowTrigger,
  type GalleryColorScheme,
  type GalleryImage,
  type GalleryLabels,
  type ImageFit
} from 'image-gallery-kit'
import 'image-gallery-kit/style.css'
```

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
type GalleryColorScheme = 'auto' | 'light' | 'dark'
type ImageFit = 'cover' | 'contain'

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
| `colorScheme` | `'auto' \| 'light' \| 'dark'` | `'auto'` | Forces the dialog palette for this instance. `'auto'` follows the page. |

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
- The dialog shows an “All images” toggle so users can switch from the carousel to the masonry grid.
- `allowGridView="false"` removes both, and the trigger renders nothing even if it is present in your markup.

### Large Collections

The grid renders every image and stays responsive into the thousands:

- Tiles are packed into explicit columns, shortest-column first, so the sequence reads across the grid. CSS multi-column balancing would instead put the first fifth of a collection in the first column.
- Off-screen tiles keep their reserved space but skip layout and paint, via `content-visibility`. Each tile carries its own aspect ratio so nothing shifts as it scrolls into range.
- The open and close transitions animate only the tiles in the scrollport, and the entrance cascade is spread across a fixed budget rather than a fixed per-tile delay.
- Opening the grid on an image below the fold scrolls it into view before the shared-image transition measures it.

Supplying `width` and `height` on each image gives true mixed-height masonry. Without them every tile falls back to `imageAspectRatio`, which is uniform and still packs correctly.

## Preview Components

You build the preview out of these. Both must be rendered inside `ImageGallery`'s default slot — they read the gallery through provide/inject and throw a descriptive error otherwise. See [Layout](/layout) for the full guide.

### `ImageGalleryImage`

One preview tile. Deliberately unsized *and* unstyled: it renders a positioning context, an overflow clip and `group`, and the image fills it absolutely — so height, width, aspect ratio, spans, radius, background, shadow and hover all come from the classes you put on it.

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `image` | `GalleryImage` | required | Which image this tile draws. Resolved to a collection index by identity, then `id`, then `src`. |
| `imageClass` | `string \| null` | `null` | Classes for the `<img>` inside the tile. Your own `class` lands on the tile, and the image is a descendant, so this is the only way to reach it — which is where `object-fit` and the hover transform belong. The tile carries `group`, so `group-hover:` works from here. |

| Slot | Slot Props | Meaning |
| --- | --- | --- |
| default | `index`, `image` | Overlay content — a badge, a caption, an overflow trigger. The tile is already a positioning context, so `absolute` works directly. |

### `ImageGalleryOverflowTrigger`

Opens the all-images grid, and knows how many images it stands for. Takes no props: the count is `images.length` minus the number of tiles that registered, so it stays correct when the previewed subset changes. Renders nothing when that count is zero, or when `allowGridView` is `false`. Ships unstyled apart from centring its content — put classes on it as you would any button.

| Slot | Slot Props | Meaning |
| --- | --- | --- |
| default | `count` | Replaces the default grid icon. |

## Theming

Every visual surface is driven by CSS custom properties, with a dark palette and reduced-motion handling included. See [Theming](./theming) for the full token table.

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
| `dialog-toolbar` | `image`, `index`, `total`, `mode`, `close`, `toggleMode` | Extends the dialog header with custom controls. |
| `dialog-caption` | `image`, `index`, `total` | Replaces the default caption area under the active dialog image. |

## Behavior Notes

- The fullscreen dialog still supports both the single-image carousel and the all-images masonry view.
- The component keeps SSR output free of browser-only dialog behavior until mounted.
- The dialog traps focus, restores focus to the previously focused trigger, and locks background scrolling while open.
- In the carousel, `ArrowLeft` / `ArrowRight` page and `Escape` closes. Below 768px the prev/next arrows give way to swiping: drag the image sideways and it slides the neighbour in, snapping in past 30% of the stage and back below it. One drag turns one image however far it runs. Both halves are switched by `--ig-dialog-swipe` — see [Theming](/theming) to keep swiping at every width, or to turn it off.
- `vue` must be installed by the consuming app because it is a peer dependency.
