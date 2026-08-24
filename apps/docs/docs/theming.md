# Theming

Import the stylesheet once, then override any of the CSS custom properties below. Every visual surface is tokenised, so you rarely need to target the component's own class names.

```ts
import 'image-gallery-kit/style.css'
```

```css
/* Site-wide */
:root {
  --ig-radius: 0.75rem;
  --ig-tile-shadow: 0 0 0 1px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
  --ig-trigger-text: #0f766e;
}
```

## Tokens

| Token | Default | Controls |
| --- | --- | --- |
| `--ig-overlay` | `rgba(255, 255, 255, 0.98)` | Backdrop behind the dialog. |
| `--ig-surface` | `#ffffff` | Dialog shell. |
| `--ig-panel` | `rgba(255, 255, 255, 0.92)` | Dialog image stage. |
| `--ig-border` | `rgba(15, 23, 42, 0.08)` | Dialog header rule and the empty-state outline. |
| `--ig-text` | `rgba(15, 23, 42, 0.96)` | Primary text and icons. |
| `--ig-muted` | `rgba(71, 85, 105, 0.72)` | Counter, captions, empty-state text. |
| `--ig-button` / `--ig-button-hover` | `rgba(255, 255, 255, 0.9)` / `#f8fafc` | Dialog controls. |
| `--ig-ring` | `rgba(15, 23, 42, 0.2)` | Focus ring. |
| `--ig-tile-bg` | `#ffffff` | Preview tile surface, visible while images load and behind `imageFit="contain"`. |
| `--ig-tile-shadow` | `none` | Preview tile shadow. Use a `0 0 0 1px` inset-style spread for a hairline border without shifting layout. |
| `--ig-trigger-bg` / `--ig-trigger-bg-hover` | `rgba(255, 255, 255, 0.88)` / `#ffffff` | "Show all images" trigger. |
| `--ig-trigger-border` | `rgba(0, 0, 0, 0.08)` | Trigger border. |
| `--ig-trigger-text` | `#334155` | Trigger icon. |
| `--ig-trigger-shadow` | Tailwind `shadow-lg` | Trigger shadow. |
| `--ig-radius` | `1.5rem` | Corner radius for tiles and the dialog image. |
| `--ig-tile-radius` | `calc(var(--ig-radius) - 0.4rem)` | Corner radius for the all-images grid tiles. Custom properties inherit already-substituted, so this tracks whichever `--ig-radius` was in scope where it was declared. Override it alongside `--ig-radius` when theming a single gallery through raw CSS; the `imageRadius` prop derives the tile radius directly and needs no such pairing. |
| `--ig-transition-duration` | `500ms` | Preview tile hover transition. |
| `--ig-hover-scale` | `1.03` | Preview tile hover zoom. |

## Dark Mode

A dark palette ships with the stylesheet and applies automatically under `prefers-color-scheme: dark`. It also follows the conventional dark-mode switches, so if your app already toggles dark mode the gallery comes along with no extra wiring:

| Switch | Used by |
| --- | --- |
| `prefers-color-scheme: dark` | The OS setting, applied automatically. |
| `.dark` class | Tailwind's `darkMode: 'class'` strategy, shadcn/ui, next-themes, VitePress. |
| `[data-theme="dark"]` | DaisyUI, next-themes in attribute mode. |

```html
<html class="dark">
<!-- or -->
<html data-theme="dark">
```

`.light` and `[data-theme="light"]` force light back on even when the OS asks for dark.

Tokens are declared on ancestors only, never on the gallery element itself, so a switch anywhere up the tree reaches the gallery through inheritance. Putting one directly on the gallery themes a single instance:

```html
<div class="dark">
  <ImageGallery :images="images" />
</div>
```

## Reduced Motion

Under `prefers-reduced-motion: reduce` the hover transition and zoom collapse to no-ops, and the shared-element flight, grid entrance, and grid exit animations are skipped. State still updates exactly as it would with motion enabled.
