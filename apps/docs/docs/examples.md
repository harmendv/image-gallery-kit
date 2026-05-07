# Examples

These examples use the real package from the workspace, not a local source import. The goal is to show how the explicit grid and main-image props behave when you treat the gallery like a library.

## Plain Grid With Overflow

This keeps a simple `2 x 3` preview, shows six visible tiles, and still exposes the “show all” trigger when more images exist than the preview can hold.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="3" :image-count="9" />
</div>

<<< ./snippets/examples/plain-grid-overflow.txt{vue}

## Carousel-Only Preview

Turn off the grid entrypoint when you want the gallery to behave as preview plus carousel only.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="3" :image-count="9" :allow-grid-view="false" />
</div>

<<< ./snippets/examples/carousel-only.txt{vue}

## Left-Docked Main Image

Dock the main image to the left and let it take a fraction of the preview width.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="2" :main-image-index="0" main-image-position="left" :main-image-size="0.35" height="25rem" />
</div>

<<< ./snippets/examples/lead-image.txt{vue}

## Right-Docked Main Image

Swap the hero to the opposite side without changing the supporting grid.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="2" :main-image-index="2" main-image-position="right" :main-image-size="0.42" height="24rem" />
</div>

<<< ./snippets/examples/right-main-image.txt{vue}

## Top Banner Image (Fixed Aspect Ratio)

When the hero sits above the grid, set `mainImageAspectRatio` and unset `mainImageSize` to lock a fixed ratio.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="3" :main-image-index="1" main-image-position="top" :main-image-size="null" :height="null" main-image-aspect-ratio="1 / 1" />
</div>

<<< ./snippets/examples/top-main-image.txt{vue}

## Bottom Banner Image

Bottom-docked heroes use the same rule and work well for denser previews.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="3" :main-image-index="4" main-image-position="bottom" main-image-size="12rem" />
</div>

<<< ./snippets/examples/bottom-main-image.txt{vue}

## Wide Preview Tiles

Use a wide item ratio when the supporting grid should feel more cinematic than card-like.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="3" image-aspect-ratio="16 / 9" :height="null" />
</div>

<<< ./snippets/examples/wide-preview-tiles.txt{vue}

## Fixed-Height Grid

When `height` is set, rows divide the preview height evenly and the layout becomes more poster-like.

<div class="vp-raw">
  <GalleryShowcase :rows="2" :columns="3" height="22rem" image-aspect-ratio="1 / 1" />
</div>

<<< ./snippets/examples/fixed-height-grid.txt{vue}
