# Examples

These examples use the real package from the workspace, not a local source import. The goal is to show how the prop combinations behave when you treat the gallery like a library.

## Balanced Preview

Four images with the default editorial ratio is the baseline non-featured package experience.

<div class="vp-raw">
  <GalleryShowcase :preview-count="4" preview-aspect-ratio="4 / 5" preview-height="26rem" />
</div>

<<< ./snippets/examples/balanced-preview.txt{vue}

## Lead With One Main Image

Adding `mainImageIndex` changes the preview into a hero-plus-supporting-images composition.

<div class="vp-raw">
  <GalleryShowcase :preview-count="7" :main-image-index="0" preview-height="25rem" />
</div>

<<< ./snippets/examples/lead-image.txt{vue}

## Dense Square Grid

A square ratio with six visible items gives you a denser preview while staying inside the supported non-featured layout set.

<div class="vp-raw">
  <GalleryShowcase :preview-count="6" preview-aspect-ratio="1 / 1" preview-height="22rem" />
</div>

<<< ./snippets/examples/normalized-counts.txt{vue}

## Landscape Previews

A wide aspect ratio gives the package more of a narrative strip while keeping the full-screen dialog intact.

<div class="vp-raw">
  <GalleryShowcase :preview-count="3" preview-aspect-ratio="16 / 9" preview-height="20rem" />
</div>

<<< ./snippets/examples/landscape-previews.txt{vue}

## Width, Height, And Radius

Use presentational props when the gallery needs to match a surrounding content system without rewriting component styles.

<div class="vp-raw">
  <GalleryShowcase :preview-count="4" preview-aspect-ratio="3 / 4" preview-height="18rem" width="92%" image-radius="2rem" />
</div>

<<< ./snippets/examples/styling-props.txt{vue}
