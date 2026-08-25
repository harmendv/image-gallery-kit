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
| `--ig-panel` | `rgba(246, 246, 247, 0.92)` | Dialog image stage. |
| `--ig-topbar-bg` | `rgba(255, 255, 255, 0.95)` | Dialog top bar fill. The bar floats over the image stage, so an alpha below `1` lets the content show through. Set it to `var(--ig-surface)` for an opaque bar. |
| `--ig-topbar-blur` | `12px` | Blur radius behind the top bar. Set `0px` to keep the translucency without the frosting. Browsers without `backdrop-filter` fall back to an opaque `--ig-surface` bar. |
| `--ig-topbar-height` | `4rem` | Height of the dialog top bar. Also reserved above the all-images grid and subtracted from the carousel image's maximum height, so changing it keeps both clear of the bar. |
| `--ig-border` | `rgba(60, 60, 67, 0.12)` | Dialog header rule and the empty-state outline. |
| `--ig-text` | `rgba(60, 60, 67, 0.96)` | Primary text and icons. |
| `--ig-muted` | `rgba(60, 60, 67, 0.68)` | Counter, captions, empty-state text. |
| `--ig-button` / `--ig-button-hover` | `rgba(244, 244, 245, 0.9)` / `rgba(235, 235, 237, 1)` | Dialog controls. |
| `--ig-ring` | `rgba(60, 60, 67, 0.2)` | Focus ring. |
| `--ig-tile-bg` | `#ffffff` | Preview tile surface, visible while images load and behind `--ig-image-fit: contain`. |
| `--ig-image-fit` | `cover` | Object-fit for every image, preview and dialog alike. Pair `contain` with `--ig-tile-bg`, which becomes visible around the image. |
| `--ig-tile-shadow` | `none` | Preview tile shadow. Use a `0 0 0 1px` inset-style spread for a hairline border without shifting layout. |
| `--ig-trigger-bg` / `--ig-trigger-bg-hover` | `rgba(255, 255, 255, 0.88)` / `#ffffff` | "Show all images" trigger. |
| `--ig-trigger-border` | `rgba(0, 0, 0, 0.08)` | Trigger border. |
| `--ig-trigger-text` | `rgba(60, 60, 67, 0.96)` | Trigger icon. |
| `--ig-trigger-shadow` | Tailwind `shadow-lg` | Trigger shadow. |
| `--ig-gap` | `1rem` | Spacing between preview tiles. |
| `--ig-grid-gap` | `1rem` | Spacing between tiles in the all-images overlay. Independent of `--ig-gap`, so the two grids can breathe differently. |
| `--ig-grid-columns` / `--ig-grid-columns-md` / `--ig-grid-columns-lg` | `2` / `4` / `5` | Column count of the all-images overlay below 768px, from 768px, and from 1280px. |
| `--ig-grid-columns-current` | derived | Read-only. The resolved count for the active breakpoint, which the component reads back to pack the columns. Override the three tokens above instead. |
| `--ig-radius` | `1.5rem` | Corner radius for tiles and the dialog image. |
| `--ig-tile-radius` | `max(0px, calc(var(--ig-radius) - 0.4rem))` | Corner radius for the all-images grid tiles. Custom properties inherit already-substituted, so this tracks whichever `--ig-radius` was in scope where it was declared — set it alongside `--ig-radius` whenever you override that. |
| `--ig-transition-duration` | `500ms` | Preview tile hover transition. |
| `--ig-hover-scale` | `1.03` | Preview tile hover zoom. |

## Reskin It Entirely

Nothing about the default look is baked in. Because every surface, shape and motion value reads from a token, redeclaring the full set on a wrapper element turns the gallery into a different component visually — without touching a single class name.

Here is the same gallery under an "editorial" theme: paper-warm surfaces, near-square corners, a hairline rule around every tile, an ink-black trigger and a shorter, deeper hover.

<div class="ig-editorial">
  <GalleryShowcase :image-count="7" :columns="3" :main-image-index="0" main-image-position="left" :main-image-size="0.45" />
</div>

```css
.ig-editorial {
  /* Dialog chrome */
  --ig-overlay: rgba(250, 247, 242, 0.98);
  --ig-surface: #faf7f2;
  --ig-panel: rgba(245, 240, 232, 0.92);
  --ig-border: rgba(28, 25, 23, 0.14);
  --ig-text: #1c1917;
  --ig-muted: rgba(87, 83, 78, 0.8);
  --ig-button: rgba(255, 255, 255, 0.9);
  --ig-button-hover: #efe9e0;
  --ig-ring: rgba(180, 83, 9, 0.55);

  /* Preview surface */
  --ig-tile-bg: #efe9e0;
  --ig-tile-shadow: 0 0 0 1px rgba(28, 25, 23, 0.14);

  /* Overflow trigger */
  --ig-trigger-bg: #1c1917;
  --ig-trigger-bg-hover: #292524;
  --ig-trigger-border: #1c1917;
  --ig-trigger-text: #faf7f2;
  --ig-trigger-shadow: none;

  /* Layout */
  --ig-gap: 0.5rem;
  --ig-grid-gap: 0.5rem;
  --ig-grid-columns-md: 3;

  /* Shape */
  --ig-radius: 0.25rem;
  --ig-tile-radius: 0.125rem;

  /* Motion */
  --ig-transition-duration: 200ms;
  --ig-hover-scale: 1.08;
}
```

A custom palette replaces the shipped one, dark values included, so declare the dark half yourself if your app has a dark mode. The switches are the same ones the default palette listens for:

```css
.dark .ig-editorial,
[data-theme='dark'] .ig-editorial {
  --ig-overlay: rgba(12, 10, 9, 0.98);
  --ig-surface: #1c1917;
  --ig-panel: rgba(28, 25, 23, 0.92);
  --ig-border: rgba(250, 247, 242, 0.16);
  --ig-text: #faf7f2;
  --ig-muted: rgba(214, 211, 209, 0.75);
  --ig-button: rgba(41, 37, 36, 0.9);
  --ig-button-hover: #44403c;
  --ig-ring: rgba(251, 191, 36, 0.55);

  --ig-tile-bg: #292524;
  --ig-tile-shadow: 0 0 0 1px rgba(250, 247, 242, 0.16);

  --ig-trigger-bg: #faf7f2;
  --ig-trigger-bg-hover: #ffffff;
  --ig-trigger-border: #faf7f2;
  --ig-trigger-text: #1c1917;
}
```

Two things worth knowing when you reskin:

- Set `--ig-tile-radius` explicitly whenever you set `--ig-radius` in raw CSS. Custom properties inherit already-substituted, so the default `calc()` resolves against whichever `--ig-radius` was in scope where the package declared it, not yours.
- Every value here is theme-only. The component has no `gap`, `imageFit` or `imageRadius` prop — presentation that nothing in the component reads back belongs in CSS, so a wrapper element is how you scope it to one gallery.

## Dark Mode

A neutral dark palette ships with the stylesheet. Three mechanisms select it, in this order of precedence:

| Precedence | Mechanism | Used by |
| --- | --- | --- |
| 1 | `colorScheme="light \| dark"` prop | An explicit per-instance override. |
| 2 | `.dark` class | Tailwind's `darkMode: 'class'` strategy, shadcn/ui, next-themes, VitePress. |
| 2 | `[data-theme="dark"]` attribute | DaisyUI, next-themes in attribute mode. |
| 3 | `prefers-color-scheme: dark` | The OS setting, applied automatically. |

```html
<html class="dark">
<!-- or -->
<html data-theme="dark">
```

`.light` and `[data-theme="light"]` force light back on even when the OS asks for dark.

### If your app toggles a class

Level 3 needs an opt-out whenever levels 1 and 2 are also in play, and the reason is worth spelling out. A class-based theme switch only ever *adds* `dark`; choosing light again just removes it. In CSS that is indistinguishable from a page with no theme system at all — so on a machine whose OS prefers dark, the gallery would stay dark on a page the user had just switched to light.

Tell the gallery that classes are the only authority by putting `data-ig-color-scheme` on the root element:

```html
<html data-ig-color-scheme="class">
```

The OS query is then ignored entirely and only `.dark` / `[data-theme="dark"]` move the palette. Do this in any app with its own light/dark toggle; the attribute value is never read, so use whatever is self-documenting.

### Per-instance override

`colorScheme` wins over everything, including a `dark` ancestor, and is the escape hatch when the gallery needs to disagree with the page — a permanently dark lightbox on a light site, say. It also covers the case where you would rather drive the palette from your own theme state than from a class:

```vue
<script setup>
import { useData } from 'vitepress'
const { isDark } = useData()
</script>

<template>
  <ImageGallery :images="images" :color-scheme="isDark ? 'dark' : 'light'" />
</template>
```

The class it emits lands on the gallery root *and* on the dialog, which is teleported to `<body>` and so sits outside any wrapper you styled.

Tokens are declared on ancestors only, never on the gallery element itself, so a switch anywhere up the tree reaches the gallery through inheritance. Putting one directly on the gallery themes a single instance:

```html
<div class="dark">
  <ImageGallery :images="images" />
</div>
```

## Reduced Motion

Under `prefers-reduced-motion: reduce` the hover transition and zoom collapse to no-ops, and the shared-element flight, grid entrance, and grid exit animations are skipped. State still updates exactly as it would with motion enabled.

<style>
/* Live styles for the "editorial" demo above; identical to the snippet. */
.ig-editorial {
  --ig-overlay: rgba(250, 247, 242, 0.98);
  --ig-surface: #faf7f2;
  --ig-panel: rgba(245, 240, 232, 0.92);
  --ig-border: rgba(28, 25, 23, 0.14);
  --ig-text: #1c1917;
  --ig-muted: rgba(87, 83, 78, 0.8);
  --ig-button: rgba(255, 255, 255, 0.9);
  --ig-button-hover: #efe9e0;
  --ig-ring: rgba(180, 83, 9, 0.55);

  --ig-tile-bg: #efe9e0;
  --ig-tile-shadow: 0 0 0 1px rgba(28, 25, 23, 0.14);

  --ig-trigger-bg: #1c1917;
  --ig-trigger-bg-hover: #292524;
  --ig-trigger-border: #1c1917;
  --ig-trigger-text: #faf7f2;
  --ig-trigger-shadow: none;

  --ig-gap: 0.5rem;
  --ig-grid-gap: 0.5rem;
  --ig-grid-columns-md: 3;

  --ig-radius: 0.25rem;
  --ig-tile-radius: 0.125rem;

  --ig-transition-duration: 200ms;
  --ig-hover-scale: 1.08;
}

.dark .ig-editorial,
[data-theme='dark'] .ig-editorial {
  --ig-overlay: rgba(12, 10, 9, 0.98);
  --ig-surface: #1c1917;
  --ig-panel: rgba(28, 25, 23, 0.92);
  --ig-border: rgba(250, 247, 242, 0.16);
  --ig-text: #faf7f2;
  --ig-muted: rgba(214, 211, 209, 0.75);
  --ig-button: rgba(41, 37, 36, 0.9);
  --ig-button-hover: #44403c;
  --ig-ring: rgba(251, 191, 36, 0.55);

  --ig-tile-bg: #292524;
  --ig-tile-shadow: 0 0 0 1px rgba(250, 247, 242, 0.16);

  --ig-trigger-bg: #faf7f2;
  --ig-trigger-bg-hover: #ffffff;
  --ig-trigger-border: #faf7f2;
  --ig-trigger-text: #1c1917;
}
</style>
