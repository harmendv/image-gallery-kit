# API

`image-gallery-kit` exposes a single main component, a plugin default export, an image type, a labels type, and a stylesheet entry.

## Imports

```ts
import ImageGalleryPlugin, {
  ImageGallery,
  type GalleryImage,
  type GalleryLabels,
  type ImageFit,
  type MainImagePosition,
  type MainImageSize
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
type MainImagePosition = 'top' | 'right' | 'bottom' | 'left'
type MainImageSize = number | string
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
  empty: string
}
```

## Props

### Data and Control

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `images` | `GalleryImage[]` | required | Source data for preview, dialog, and bento modes. |
| `open` | `boolean \| null` | `null` | Controlled dialog state for `v-model:open`. Leave unset for internal state. |
| `index` | `number \| null` | `null` | Controlled active image index for `v-model:index`. Leave unset for internal state. |

### Grid Layout

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `rows` | `number` | `2` | Maximum number of rows in the secondary preview grid. |
| `columns` | `number` | `2` | Maximum number of columns in the secondary preview grid. |
| `imageAspectRatio` | `number \| string` | `'4 / 5'` | Visible tile aspect ratio when the preview height is intrinsic. |

### Main Image

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `mainImageIndex` | `number \| null` | `null` | Selects the featured image. Invalid values fall back to a plain grid. |
| `mainImagePosition` | `MainImagePosition` | `'left'` | Docks the featured image to one side of the secondary grid. |
| `mainImageSize` | `MainImageSize` | `0.4` | Controls the main image width on `left/right` and height on `top/bottom`. |
| `mainImageAspectRatio` | `number \| string \| null` | `null` | Optional featured-image ratio, applied in all four `mainImagePosition` values when `height` is intrinsic. |

### Styling and Behavior

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `gap` | `string` | `'1rem'` | Spacing between preview tiles. |
| `imageFit` | `ImageFit` | `'cover'` | Object-fit mode for preview tiles and the dialog image. |
| `allowGridView` | `boolean` | `true` | Enables the all-images grid entrypoint and the dialog grid toggle. |
| `height` | `string \| null` | `null` | Fixes the preview height and divides the secondary grid rows evenly. |
| `width` | `string \| null` | `'100%'` | Controls the outer gallery width. |
| `imageRadius` | `string \| null` | `null` | Overrides the package border radius token. |
| `labels` | `Partial<GalleryLabels>` | `undefined` | Overrides the built-in English UI strings. Partial objects are merged over the defaults. |

## Preview Layout Rules

- `rows * columns` defines the maximum capacity of the secondary preview grid.
- The count is the secondary grid only: `rows="1"` with `columns="3"` plus a `mainImageIndex` renders four tiles in total.
- The grid is sparse: if fewer items are available than slots, only the existing items render.
- Items do not expand across empty slots just to fill the configured capacity.
- `mainImageIndex` removes that image from the secondary grid and renders it in the docked main-image area.

### Main Image Sizing

- `left` and `right`: the main image matches the full height of the secondary grid, and `mainImageSize` controls its width. Setting `mainImageAspectRatio` instead lets the ratio drive its height, and the secondary grid then sizes intrinsically.
- `top` and `bottom`: the main image always matches the full width of the secondary grid, and `mainImageSize` controls its height.
- `mainImageAspectRatio`: when set and `height` is intrinsic, the featured image uses this ratio in every `mainImagePosition`.
- Precedence rule: with an intrinsic `height`, `mainImageAspectRatio` takes precedence over numeric `mainImageSize`. An explicit `height` overrides the ratio.
- If `mainImageSize` is a `number`, it is treated as a layout fraction.
- If `mainImageSize` is a `string`, it is used as a raw CSS size such as `18rem`, `35%`, or `min(28rem, 40vw)`.

### Labels

Every visible string and `aria-label` comes from `labels`, merged over English defaults. Pass only the keys you want to change — the component has no i18n dependency, so wire it to whatever your app already uses.

```vue
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
| `empty` | `string` | `'No images available'` |

### Grid View

- When `allowGridView` is `true`, overflow adds the “show all images” trigger on the last visible preview tile.
- The dialog also shows the “All images” toggle so users can switch from the carousel to the masonry grid.
- When `allowGridView` is `false`, the preview never shows the trigger and the dialog stays carousel-only.

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
| `dialog-toolbar` | `image`, `index`, `total`, `mode`, `close`, `toggleMode` | Extends the dialog header with custom controls. |
| `dialog-caption` | `image`, `index`, `total` | Replaces the default caption area under the active dialog image. |
| `empty` | none | Replaces the placeholder shown when `images` is empty. |

## Behavior Notes

- The fullscreen dialog still supports both the single-image carousel and the all-images masonry view.
- The component keeps SSR output free of browser-only dialog behavior until mounted.
- The dialog traps focus, restores focus to the previously focused trigger, and locks background scrolling while open.
- `vue` must be installed by the consuming app because it is a peer dependency.
