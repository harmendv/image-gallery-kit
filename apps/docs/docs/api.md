# API

`image-gallery-kit` exposes a single main component, a plugin default export, one image type, and a stylesheet entry.

## Imports

```ts
import ImageGalleryPlugin, {
  ImageGallery,
  type GalleryImage,
  type ImageFit,
  type MainImagePosition,
  type MainImageSize
} from 'image-gallery-kit'
import 'image-gallery-kit/style.css'
```

## `GalleryImage`

```ts
interface GalleryImage {
  src: string
  alt: string
  width?: number
  height?: number
}
```

## Supporting Types

```ts
type MainImagePosition = 'top' | 'right' | 'bottom' | 'left'
type MainImageSize = number | string
type ImageFit = 'cover' | 'contain'
```

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `images` | `GalleryImage[]` | required | Source data for preview, dialog, and bento modes. |
| `rows` | `number` | `2` | Maximum number of rows in the secondary preview grid. |
| `columns` | `number` | `2` | Maximum number of columns in the secondary preview grid. |
| `itemAspectRatio` | `number \| string` | `'4 / 5'` | Visible tile aspect ratio when the preview height is intrinsic. |
| `mainImageIndex` | `number \| null` | `null` | Selects the featured image. Invalid values fall back to a plain grid. |
| `mainImagePosition` | `MainImagePosition` | `'left'` | Docks the featured image to one side of the secondary grid. |
| `mainImageSize` | `MainImageSize` | `0.4` | Controls the main image width on `left/right` and height on `top/bottom`. |
| `gap` | `string` | `'1rem'` | Spacing between preview tiles. |
| `imageFit` | `ImageFit` | `'cover'` | Object-fit mode for preview tiles and the dialog image. |
| `allowGridView` | `boolean` | `true` | Enables the all-images grid entrypoint and the dialog grid toggle. |
| `height` | `string \| null` | `null` | Fixes the preview height and divides the secondary grid rows evenly. |
| `width` | `string \| null` | `'100%'` | Controls the outer gallery width. |
| `imageRadius` | `string \| null` | `null` | Overrides the package border radius token. |

## Preview Layout Rules

- `rows * columns` defines the maximum capacity of the secondary preview grid.
- The grid is sparse: if fewer items are available than slots, only the existing items render.
- Items do not expand across empty slots just to fill the configured capacity.
- `mainImageIndex` removes that image from the secondary grid and renders it in the docked main-image area.

### Main Image Sizing

- `left` and `right`: the main image always matches the full height of the secondary grid, and `mainImageSize` controls its width.
- `top` and `bottom`: the main image always matches the full width of the secondary grid, and `mainImageSize` controls its height.
- If `mainImageSize` is a `number`, it is treated as a layout fraction.
- If `mainImageSize` is a `string`, it is used as a raw CSS size such as `18rem`, `35%`, or `min(28rem, 40vw)`.

### Grid View

- When `allowGridView` is `true`, overflow adds the “show all images” trigger on the last visible preview tile.
- The dialog also shows the “All images” toggle so users can switch from the carousel to the masonry grid.
- When `allowGridView` is `false`, the preview never shows the trigger and the dialog stays carousel-only.

## Events

| Event | Payload | Meaning |
| --- | --- | --- |
| `open` | `index: number` | Fired when a preview or grid item opens. |
| `close` | none | Fired when the dialog closes. |
| `change` | `index: number` | Fired when the active image changes inside the dialog. |

## Behavior Notes

- The fullscreen dialog still supports both the single-image carousel and the all-images masonry view.
- The component keeps SSR output free of browser-only dialog behavior until mounted.
- `vue` must be installed by the consuming app because it is a peer dependency.
