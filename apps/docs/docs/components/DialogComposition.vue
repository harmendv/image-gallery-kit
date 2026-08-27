<script setup lang="ts">
import {
  ImageGalleryCloseButton,
  ImageGalleryCounter,
  ImageGalleryGrid,
  ImageGalleryGridImage,
  ImageGalleryGridTile,
  ImageGalleryGridToggle,
  ImageGalleryOverlay,
  ImageGalleryStage,
  ImageGalleryStageFrame,
  ImageGalleryStageImage,
  ImageGalleryTopbar
} from 'image-gallery-kit';

/*
 * Every dialog composition the docs demonstrate, in one place. Each example on
 * the Examples page renders this inside the `dialog` slot, so the live demo and
 * the source printed beside it cannot drift apart -- change one, change the
 * other.
 *
 * Rendering the parts from a child component works because Vue resolves
 * provide/inject along the mounted tree rather than the lexical one: slot
 * content mounts inside ImageGallery, so `useDialogContext` finds it.
 */
export type DialogVariant =
  | 'chromeless'
  | 'cinema'
  | 'contact-sheet'
  | 'uniform'
  | 'bottom-bar'
  | 'branded'
  | 'arrows-only'
  | 'swipe-only'
  | 'captions'
  | 'product'
  | 'essay'
  | 'listing'
  | 'lookbook'
  | 'minimal';

const props = defineProps<{ variant: DialogVariant }>();
</script>

<template>
  <!-- Chromeless: no bar, so the stage reserves no room for one. -->
  <ImageGalleryOverlay v-if="props.variant === 'chromeless'" class="bg-white/98 dark:bg-black/98">
    <ImageGalleryCloseButton class="absolute right-4 top-4 z-30 bg-black/50 text-white hover:bg-black/70" />
    <ImageGalleryStage />
    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <!-- Cinema: one pinned shape for all three roles, so nothing resizes mid-turn. -->
  <ImageGalleryOverlay v-else-if="props.variant === 'cinema'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #center><ImageGalleryCounter /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage>
      <template #frame="{ image, role }">
        <ImageGalleryStageFrame :image="image" :role="role" class="aspect-video rounded-none">
          <ImageGalleryStageImage class="object-contain" />
        </ImageGalleryStageFrame>
      </template>
    </ImageGalleryStage>

    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <!-- Contact sheet: your column classes are read back out of the resolved tracks. -->
  <ImageGalleryOverlay v-else-if="props.variant === 'contact-sheet'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #start><ImageGalleryGridToggle /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage />

    <ImageGalleryGrid class="grid-cols-4 gap-1 md:grid-cols-6 2xl:grid-cols-10">
      <template #tile="{ image, index }">
        <ImageGalleryGridTile :image="image" :index="index" class="rounded-none">
          <template #image><ImageGalleryGridImage class="object-cover" /></template>
        </ImageGalleryGridTile>
      </template>
    </ImageGalleryGrid>
  </ImageGalleryOverlay>

  <!--
    Uniform grid: one shape for every tile. The tile owns the shape -- an
    `aspect-*` class on it beats the image's own ratio, the frame follows the
    tile, and `object-cover` crops to fill. Equal heights make the bento
    packing fill every column in lockstep, so the rows align like a plain grid.
  -->
  <ImageGalleryOverlay v-else-if="props.variant === 'uniform'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #start><ImageGalleryGridToggle /></template>
        <template #center><ImageGalleryCounter /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage />

    <ImageGalleryGrid uniform class="grid-cols-3 gap-2 md:grid-cols-5">
      <template #tile="{ image, index }">
        <ImageGalleryGridTile :image="image" :index="index" class="aspect-square rounded-lg">
          <template #image><ImageGalleryGridImage class="object-cover" /></template>
        </ImageGalleryGridTile>
      </template>
    </ImageGalleryGrid>
  </ImageGalleryOverlay>

  <!-- Bottom bar: the bar is positioned by a class, and its height is measured wherever it sits. -->
  <ImageGalleryOverlay v-else-if="props.variant === 'bottom-bar'">
    <template #topbar>
      <ImageGalleryTopbar class="inset-x-0 bottom-0 top-auto border-b-0 border-t">
        <template #start><ImageGalleryGridToggle /></template>
        <template #center><ImageGalleryCounter /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage />
    <ImageGalleryGrid class="pt-4" />
  </ImageGalleryOverlay>

  <!-- Branded: your own markup alongside the parts, in the topbar's three columns. -->
  <ImageGalleryOverlay v-else-if="props.variant === 'branded'">
    <template #topbar>
      <ImageGalleryTopbar class="h-20">
        <template #start>
          <span class="text-base font-semibold tracking-tight">Acme</span>
          <ImageGalleryGridToggle class="ml-2" />
        </template>

        <template #center><ImageGalleryCounter class="normal-case tracking-normal" /></template>

        <template #end>
          <a href="#branded-bar" class="image-gallery-control image-gallery-control-pill no-underline">
            Download
          </a>
          <ImageGalleryCloseButton class="ml-2" />
        </template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage />
    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <ImageGalleryOverlay v-else-if="props.variant === 'arrows-only'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #center><ImageGalleryCounter /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage :swipe="false" />
    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <ImageGalleryOverlay v-else-if="props.variant === 'swipe-only'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage>
      <template #previous />
      <template #next />
    </ImageGalleryStage>

    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <!--
    Product page: a buyer wants the detail shot and a way to reach every other
    angle without leaving. So the caption carries the shot's description and the
    grid is dense enough to scan in one screen.
  -->
  <ImageGalleryOverlay v-else-if="props.variant === 'product'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #start><ImageGalleryGridToggle /></template>
        <template #center><ImageGalleryCounter /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage>
      <template #caption="{ image, index, total }">
        <p class="text-sm font-medium">{{ image.alt }}</p>
        <p class="text-xs opacity-60">View {{ index + 1 }} of {{ total }}</p>
      </template>
    </ImageGalleryStage>

    <ImageGalleryGrid class="grid-cols-4 gap-1.5 md:grid-cols-8">
      <template #tile="{ image, index }">
        <ImageGalleryGridTile :image="image" :index="index" class="rounded-md">
          <template #image><ImageGalleryGridImage class="object-cover" /></template>
        </ImageGalleryGridTile>
      </template>
    </ImageGalleryGrid>
  </ImageGalleryOverlay>

  <!--
    Photo essay: the picture is the argument, so the text sits under it rather
    than over it and nothing crops. The frame is deliberately *not* pinned to a
    ratio -- this collection mixes portrait and landscape, and one fixed shape
    would letterbox whichever orientation it did not match, forcing the flight
    to cross that gap on the way in. Each frame takes its own image's ratio, so
    `object-contain` fills it exactly and the flight has no letterbox to cross.
  -->
  <ImageGalleryOverlay v-else-if="props.variant === 'essay'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #start><ImageGalleryGridToggle /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage>
      <template #frame="{ image, role }">
        <ImageGalleryStageFrame :image="image" :role="role" class="rounded-none">
          <ImageGalleryStageImage class="object-contain" />
        </ImageGalleryStageFrame>
      </template>

      <template #caption="{ image, index, total }">
        <p class="mx-auto max-w-prose text-balance text-base leading-relaxed">
          {{ image.alt }}
        </p>
        <p class="mt-1 text-xs uppercase tracking-widest opacity-50">Plate {{ index + 1 }} — {{ total }}</p>
      </template>
    </ImageGalleryStage>

    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <!--
    Listing: the bar carries the brand and the one action a viewer came for,
    beside the parts. `h-20` is the only sizing needed -- the stage and the grid
    both follow whatever height the bar ends up with.
  -->
  <ImageGalleryOverlay v-else-if="props.variant === 'listing'">
    <template #topbar>
      <ImageGalleryTopbar class="h-20">
        <template #start>
          <span class="text-base font-semibold tracking-tight">Northgate</span>
          <ImageGalleryGridToggle class="ml-2" />
        </template>

        <template #center><ImageGalleryCounter /></template>

        <template #end>
          <a
            href="#responsive-arrangement"
            class="image-gallery-control image-gallery-control-pill no-underline"
          >
            Book a viewing
          </a>
          <ImageGalleryCloseButton class="ml-2" />
        </template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage />
    <ImageGalleryGrid class="grid-cols-2 gap-3 md:grid-cols-4" />
  </ImageGalleryOverlay>

  <!--
    Lookbook: nothing but the picture. The counter floats rather than sitting in
    a bar, so the stage keeps the full height a bar would have taken.
  -->
  <ImageGalleryOverlay v-else-if="props.variant === 'lookbook'" class="bg-white/98 dark:bg-black/98">
    <ImageGalleryCloseButton class="absolute right-4 top-4 z-30 bg-black/50 text-white hover:bg-black/70" />
    <ImageGalleryCounter
      class="absolute inset-x-0 bottom-5 z-30 justify-center bg-transparent text-xs tracking-widest"
    />
    <ImageGalleryStage />
    <ImageGalleryGrid />
  </ImageGalleryOverlay>

  <!--
    Minimal: a carousel with no second view, so the bar carries only a reading
    and a way out, and no ImageGalleryGrid is composed at all.
  -->
  <ImageGalleryOverlay v-else-if="props.variant === 'minimal'">
    <template #topbar>
      <ImageGalleryTopbar>
        <template #center><ImageGalleryCounter /></template>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage />
  </ImageGalleryOverlay>

  <!-- Captions under the image. -->
  <ImageGalleryOverlay v-else>
    <template #topbar>
      <ImageGalleryTopbar>
        <template #end><ImageGalleryCloseButton /></template>
      </ImageGalleryTopbar>
    </template>

    <ImageGalleryStage>
      <template #caption="{ image, index, total }">
        <p class="text-sm font-medium">{{ image.alt }}</p>
        <p class="text-xs opacity-60">{{ index + 1 }} / {{ total }} · {{ image.width }}×{{ image.height }}</p>
      </template>
    </ImageGalleryStage>

    <ImageGalleryGrid />
  </ImageGalleryOverlay>
</template>
