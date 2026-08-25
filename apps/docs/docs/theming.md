# Theming

The gallery splits styling along one line: **you style what you render, tokens style what the component renders.**

Your preview is your markup, so its appearance is classes — background, shadow, radius, hover, `object-fit`. There are no tokens for any of that, because there is an element in your template to put a class on.

The dialog is the other half. `ImageGallery` renders it and teleports it to `<body>`, so there is no element of yours anywhere in it. Tokens are the only channel, and that is what they are for.

```ts
import 'image-gallery-kit/style.css'
```

## Styling The Preview

Classes on the two components you render. `imageClass` reaches the `<img>` inside a tile, which is where `object-fit` and the hover transform belong:

Dark mode comes along with them: it is a `dark:` variant on the same class, using whatever dark-mode strategy your app already has. There is no second palette to declare.

```vue-html
<ImageGalleryImage
  :image="image"
  class="aspect-[4/5] rounded-xl bg-neutral-100 shadow-md
         dark:bg-neutral-800 dark:shadow-black/40"
  image-class="object-cover transition duration-500 group-hover:scale-105"
/>

<ImageGalleryOverflowTrigger
  v-slot="{ count }"
  class="absolute bottom-2 right-2 h-8 rounded-full bg-white/90 px-3 text-xs font-semibold
         shadow-md backdrop-blur dark:bg-neutral-900/90 dark:text-neutral-100"
>
  +{{ count }}
</ImageGalleryOverflowTrigger>
```

Toggle this page's theme and watch the tiles follow:

<LayoutShowcase
  root-class="grid grid-cols-3 gap-3"
  tile-class="aspect-[4/5] rounded-xl bg-neutral-100 shadow-md dark:bg-neutral-800 dark:shadow-black/40"
  image-class="transition duration-500 group-hover:scale-105"
  :count="6"
/>

The tile carries `group`, which is what lets `group-hover:` on the image react to a hover anywhere on the tile. Since the hover is yours, so is its reduced-motion behaviour — reach for `motion-safe:` when you add one:

```vue-html
image-class="transition duration-500 motion-safe:group-hover:scale-105"
```

## Tokens

Every token is named after the part it styles, so the prefix tells you where it lands:

| Prefix | Styles |
| --- | --- |
| `--ig-dialog-*` | The fullscreen dialog `ImageGallery` renders and teleports to `<body>`. |
| `--ig-dialog-grid-*` | The all-images grid inside that dialog. |
| `--ig-object-fit` | Every `<img>` the package renders. |

All of it is dialog, because the dialog is the only thing you cannot reach with a class.

### `ImageGallery` — the dialog

| Token | Default | Controls |
| --- | --- | --- |
| `--ig-dialog-overlay` | `rgba(255, 255, 255, 0.98)` | Backdrop behind the dialog. |
| `--ig-dialog-surface` | `#ffffff` | Dialog shell. |
| `--ig-dialog-panel` | `rgba(246, 246, 247, 0.92)` | Dialog image stage. |
| `--ig-dialog-border` | `rgba(60, 60, 67, 0.12)` | Dialog header rule. |
| `--ig-dialog-text` | `rgba(60, 60, 67, 0.96)` | Primary text and icons. |
| `--ig-dialog-muted` | `rgba(60, 60, 67, 0.68)` | Counter and captions. |
| `--ig-dialog-button` / `--ig-dialog-button-hover` | `rgba(244, 244, 245, 0.9)` / `rgba(235, 235, 237, 1)` | Dialog controls. |
| `--ig-dialog-ring` | `rgba(60, 60, 67, 0.2)` | Focus ring. |
| `--ig-dialog-radius` | `1.5rem` | Corner radius of the carousel image. |
| `--ig-dialog-topbar-bg` | `rgba(255, 255, 255, 0.95)` | Top bar fill. The bar floats over the image stage, so an alpha below `1` lets content show through. Set it to `var(--ig-dialog-surface)` for an opaque bar. |
| `--ig-dialog-topbar-blur` | `12px` | Blur behind the top bar. `0px` keeps the translucency without the frosting. Browsers without `backdrop-filter` fall back to an opaque `--ig-dialog-surface` bar. |
| `--ig-dialog-topbar-height` | `4rem` | Top bar height. Also reserved above the all-images grid and subtracted from the carousel image's maximum height, so changing it keeps both clear of the bar. |
| `--ig-dialog-swipe` | `1` below 768px, `0` from 768px | Whether the swipe gesture is armed. The same breakpoint hides the prev/next arrows, so exactly one of the two is live at any width — set it to `1` at all widths to keep swiping on desktop as well, or `0` to turn the gesture off and rely on the arrows and arrow keys. |
| `--ig-dialog-slide-gap` | `5rem` | Distance between the image on screen and the one waiting off it during a swipe. It only ever shows as travel: the pair stays exactly one image plus this gap apart for the whole turn, which is what keeps them from overlapping. Must clear the stage's own padding, or a sliver of the next image shows past the frame mid-swipe. |

### `ImageGallery` — the all-images grid

| Token | Default | Controls |
| --- | --- | --- |
| `--ig-dialog-grid-gap` | `1rem` | Spacing between grid tiles. Preview spacing is your own `gap-*` class, so the two are independent by construction. |
| `--ig-dialog-grid-columns` / `-md` / `-lg` | `2` / `4` / `5` | Column count below 768px, from 768px, and from 1280px. |
| `--ig-dialog-grid-tile-radius` | `max(0px, calc(var(--ig-dialog-radius) - 0.4rem))` | Corner radius of grid tiles. Custom properties inherit already-substituted, so this tracks whichever `--ig-dialog-radius` was in scope where it was declared — set it alongside `--ig-dialog-radius` whenever you override that. |
| `--ig-dialog-grid-columns-current` | derived | Read-only. The resolved count for the active breakpoint, which the component reads back to pack the columns. Override the three tokens above instead. |

### Every image

| Token | Default | Controls |
| --- | --- | --- |
| `--ig-object-fit` | `cover` | `object-fit` for every `<img>` the package renders. It exists for the dialog's images, which you cannot reach; for preview tiles prefer `image-class="object-contain"`, which wins over it. |

## Reskin It Entirely

Nothing about the default look is baked in. A reskin has two halves, and it is worth seeing them side by side: **classes** carry the preview, **tokens** carry the dialog.

Here is a "gazette" theme — warm paper, deep ink borders three pixels thick, chunky rounding, a lifted shadow, an ink-black trigger.

<LayoutShowcase
  theme-class="ig-gazette"
  root-class="flex gap-4"
  main-class="w-[45%] shrink-0 rounded-[1.75rem] bg-[#ece2d2] shadow-[0_0_0_3px_#262019,0_14px_28px_-10px_rgba(38,32,26,0.55)] dark:bg-[#2c241c] dark:shadow-[0_0_0_3px_#f7f1e6,0_14px_28px_-10px_rgba(0,0,0,0.8)]"
  grid-class="grid min-w-0 flex-1 grid-cols-3 gap-4"
  tile-class="aspect-[4/5] rounded-[1.25rem] bg-[#ece2d2] shadow-[0_0_0_3px_#262019,0_14px_28px_-10px_rgba(38,32,26,0.55)] dark:bg-[#2c241c] dark:shadow-[0_0_0_3px_#f7f1e6,0_14px_28px_-10px_rgba(0,0,0,0.8)]"
  image-class="transition duration-200 group-hover:scale-[1.09]"
  :count="7"
/>

Open it — the dialog, its frosted top bar, the carousel chrome and the all-images grid all come from the token half.

The preview half is classes on the components you render. The 3px rule and the lift are one `shadow-[...]`, because a spread shadow costs no layout and never shifts a tile:

```vue-html
<ImageGalleryImage
  :image="image"
  class="aspect-[4/5] rounded-[1.25rem] bg-[#ece2d2]
         shadow-[0_0_0_3px_#262019,0_14px_28px_-10px_rgba(38,32,26,0.55)]
         dark:bg-[#2c241c]
         dark:shadow-[0_0_0_3px_#f7f1e6,0_14px_28px_-10px_rgba(0,0,0,0.8)]"
  image-class="transition duration-200 group-hover:scale-[1.09]"
/>

<ImageGalleryOverflowTrigger
  v-slot="{ count }"
  class="absolute bottom-2 right-2 h-8 rounded-full bg-[#262019] px-3 text-xs
         font-semibold text-[#f7f1e6] shadow-[0_10px_20px_-8px_rgba(38,32,26,0.7)]
         hover:bg-[#3d3428]
         dark:bg-[#f7f1e6] dark:text-[#191410] dark:hover:bg-white"
>
  +{{ count }}
</ImageGalleryOverflowTrigger>
```

The ink rule inverts to paper in dark, which is the whole trick: one class, two variants, no parallel palette to keep in sync.

The dialog half is tokens on a wrapper:

```css
.ig-gazette {
  --ig-dialog-overlay: rgba(250, 245, 235, 0.98);
  --ig-dialog-surface: #f7f1e6;
  --ig-dialog-panel: rgba(240, 232, 218, 0.92);
  --ig-dialog-border: rgba(38, 32, 26, 0.2);
  --ig-dialog-text: #262019;
  --ig-dialog-muted: rgba(94, 82, 68, 0.85);
  --ig-dialog-button: #ece2d2;
  --ig-dialog-button-hover: #ded1bc;
  --ig-dialog-ring: rgba(180, 83, 9, 0.6);
  --ig-dialog-topbar-bg: rgba(247, 241, 230, 0.95);

  --ig-dialog-grid-gap: 1.25rem;
  --ig-dialog-grid-columns-md: 3;

  --ig-dialog-radius: 1.75rem;
  --ig-dialog-grid-tile-radius: 1.25rem;
}
```

A custom palette replaces the shipped one, dark values included, so declare the dark half yourself if your app has a dark mode. The switches are the same ones the default palette listens for:

```css
.dark .ig-gazette,
[data-theme='dark'] .ig-gazette {
  --ig-dialog-overlay: rgba(22, 18, 14, 0.98);
  --ig-dialog-surface: #191410;
  --ig-dialog-panel: rgba(28, 23, 18, 0.92);
  --ig-dialog-border: rgba(247, 241, 230, 0.22);
  --ig-dialog-text: #f7f1e6;
  --ig-dialog-muted: rgba(214, 202, 184, 0.8);
  --ig-dialog-button: #2c241c;
  --ig-dialog-button-hover: #3d3428;
  --ig-dialog-ring: rgba(251, 191, 36, 0.6);
  --ig-dialog-topbar-bg: rgba(25, 20, 16, 0.95);
}
```

The preview half needs no equivalent block: its dark values are the `dark:` variants already sitting on the classes above.

Two things worth knowing when you reskin:

- Set `--ig-dialog-grid-tile-radius` explicitly whenever you set `--ig-dialog-radius` in raw CSS. Custom properties inherit already-substituted, so the default `calc()` resolves against whichever `--ig-dialog-radius` was in scope where the package declared it, not yours.
- Tokens are theme-only; none of them are props. A wrapper element is how you scope a palette to one gallery, exactly as the demo above does.

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

Under `prefers-reduced-motion: reduce` the shared-element flight, the grid entrance and the grid exit animations are all skipped. State still updates exactly as it would with motion enabled.

Tile hover is the exception, and deliberately so: it is a class you wrote, so the package has nothing to disable. Guard it yourself with `motion-safe:`, which is one word and keeps the decision where the animation is:

```vue-html
image-class="transition duration-500 motion-safe:group-hover:scale-105"
```

<style>
/* Live styles for the gazette demo above; identical to the snippet. */
.ig-gazette {
  --ig-dialog-overlay: rgba(250, 245, 235, 0.98);
  --ig-dialog-surface: #f7f1e6;
  --ig-dialog-panel: rgba(240, 232, 218, 0.92);
  --ig-dialog-border: rgba(38, 32, 26, 0.2);
  --ig-dialog-text: #262019;
  --ig-dialog-muted: rgba(94, 82, 68, 0.85);
  --ig-dialog-button: #ece2d2;
  --ig-dialog-button-hover: #ded1bc;
  --ig-dialog-ring: rgba(180, 83, 9, 0.6);
  --ig-dialog-topbar-bg: rgba(247, 241, 230, 0.95);

  --ig-dialog-grid-gap: 1.25rem;
  --ig-dialog-grid-columns-md: 3;

  --ig-dialog-radius: 1.75rem;
  --ig-dialog-grid-tile-radius: 1.25rem;
}

.dark .ig-gazette,
[data-theme='dark'] .ig-gazette {
  --ig-dialog-overlay: rgba(22, 18, 14, 0.98);
  --ig-dialog-surface: #191410;
  --ig-dialog-panel: rgba(28, 23, 18, 0.92);
  --ig-dialog-border: rgba(247, 241, 230, 0.22);
  --ig-dialog-text: #f7f1e6;
  --ig-dialog-muted: rgba(214, 202, 184, 0.8);
  --ig-dialog-button: #2c241c;
  --ig-dialog-button-hover: #3d3428;
  --ig-dialog-ring: rgba(251, 191, 36, 0.6);
  --ig-dialog-topbar-bg: rgba(25, 20, 16, 0.95);
}
</style>
