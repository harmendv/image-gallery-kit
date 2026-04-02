# API

`image-gallery-kit` exposes a single main component, a plugin default export, one image type, and a stylesheet entry.

## Imports

```ts
import ImageGalleryPlugin, { ImageGallery, type GalleryImage } from 'image-gallery-kit'
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

## Props

| Prop | Type | Default | Notes |
| --- | --- | --- | --- |
| `images` | `GalleryImage[]` | required | Source data for preview, dialog, and bento modes. |
| `previewCount` | `number` | `4` | Normalized to the nearest supported preview layout. |
| `previewAspectRatio` | `number \| string` | `'1 / 1'` | Accepts numeric ratios or CSS aspect-ratio strings. |
| `mainImageIndex` | `number \| null` | `null` | Turns the preview into a featured layout when valid. |
| `previewHeight` | `string \| null` | `null` | Locks preview height for more editorial compositions. |
| `width` | `string \| null` | `'100%'` | Controls the outer gallery width. |
| `imageRadius` | `string \| null` | `null` | Overrides the package border radius token. |

## Preview Layout Rules

`previewCount` is constrained to `1` through `9`, and then normalized down to the nearest supported layout for the current mode.

### Without a valid `mainImageIndex`

This is the standard grid preview mode. Supported final preview counts are:

| Requested mode | Supported final counts |
| --- | --- |
| No main image | `1`, `2`, `3`, `4`, `6`, `8`, `9` |

Normalization examples:

- `5` becomes `4`
- `7` becomes `6`
- `8` stays `8`
- `9` stays `9`

### With a valid `mainImageIndex`

This enables featured mode, where one image leads the layout and the remaining visible images sit beside it. Supported final preview counts are:

| Requested mode | Supported final counts |
| --- | --- |
| Valid main image | `1`, `3`, `5`, `7`, `9` |

Normalization examples:

- `2` becomes `1`
- `4` becomes `3`
- `6` becomes `5`
- `8` becomes `7`

### Important combinations

- `mainImageIndex` only affects layout when it is within the bounds of `images`.
- If `mainImageIndex` is `null`, `undefined`, negative, or greater than the last image index, the component falls back to the non-featured rules.
- Featured mode only appears when the normalized preview count is greater than `1`. A valid `mainImageIndex` with a final count of `1` still renders as a single visible item.
- If `images.length` is smaller than the normalized preview count, the component just renders the available images.
- Overflow only appears when `images.length` is greater than the visible preview count; in that case the final visible tile gets the “show all” trigger.
- The default prop combination is `previewCount=4` and `mainImageIndex=null`, so the default rendered non-featured preview is already a supported four-item layout.

## Events

| Event | Payload | Meaning |
| --- | --- | --- |
| `open` | `index: number` | Fired when a preview or grid item opens. |
| `close` | none | Fired when the dialog closes. |
| `change` | `index: number` | Fired when the active image changes inside the dialog. |

## Behavior Notes

- Overflow turns the last visible tile into a “show all images” trigger.
- The dialog has two modes: a single-image carousel view and a full bento grid view.
- The component keeps SSR output free of browser-only dialog behavior until mounted.
- `vue` must be installed by the consuming app because it is a peer dependency.
