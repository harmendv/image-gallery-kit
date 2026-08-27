<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, toRef, watch } from 'vue';
import ImageGalleryStageImage from '@/components/ImageGalleryStageImage.vue';
import { STAGE_FRAME, useDialogContext } from '@/composables/useGalleryContext';
import type { GalleryImage } from '@/types';

/*
 * One image-sized box on the stage. Three of them exist at a time and they are
 * the same component in three roles: the active frame, and the two neighbours
 * parked off either side. That is deliberate -- the stage invokes one `frame`
 * template three times, so a radius or a shadow you put on it applies to all
 * three, which five separate declarations never reliably did.
 *
 * `role` decides behaviour, not appearance. The active frame is the element the
 * shared-element flight measures and registers itself; a neighbour carries the
 * turn's transform instead, and is hidden from assistive technology because it
 * is a duplicate of something already on screen.
 *
 * The image's own ratio goes out as a custom property rather than as an inline
 * `aspect-ratio`, because an inline value would beat any class and the frame's
 * shape is a thing worth pinning: a cinema layout wants one constant box with
 * `object-contain` letterboxing inside it, not a box that changes shape with
 * every image. `class="aspect-video"` wins over the CSS that reads this.
 */
const props = defineProps<{
  image: GalleryImage;
  role: 'active' | 'previous' | 'next';
}>();

const gallery = useDialogContext('ImageGalleryStageFrame');
const dialog = gallery.dialog;
const stage = dialog.stage;

const frame = ref<HTMLElement | null>(null);
const isActive = computed(() => props.role === 'active');

/*
 * Only the active frame registers. It alone is in flow, so it alone sizes the
 * stack -- and it is what the flight flies into and out of.
 */
if (isActive.value) {
  stage.registerFrame(frame);
  onBeforeUnmount(() => {
    stage.registerFrame(ref(null));
  });
}

provide(STAGE_FRAME, { image: toRef(props, 'image'), role: toRef(props, 'role') });

/*
 * The stage caps a frame's height to clear the bar. A capped height alone loses
 * the shape: `width` is definite, so the browser derives the height from
 * `aspect-ratio`, clamps it, and never narrows the width to match -- so a frame
 * taller than the cap quietly renders at the cap's own ratio instead of its
 * own, and `object-contain` letterboxes the picture inside it.
 *
 * Capping the width as well needs the ratio as a number, and CSS cannot read
 * one back off `aspect-ratio`. So it is measured here and handed to the
 * stylesheet. Measured rather than derived from `image`, because the ratio that
 * actually applies may be a class of the consumer's -- `aspect-video` for a
 * cinema stage -- and that one has to be respected, not second-guessed.
 */
function readRatio(element: HTMLElement) {
  const declared = getComputedStyle(element).aspectRatio;

  if (!declared || declared === 'auto') {
    return null;
  }

  // Either `<w> / <h>` or a bare number, depending on how it was written.
  const [width, height = '1'] = declared.split('/').map((part) => Number.parseFloat(part));
  const ratio = width / Number.parseFloat(String(height));

  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}

function fitToCap() {
  const element = frame.value;

  if (!element) {
    return;
  }

  const ratio = readRatio(element);

  if (ratio === null) {
    element.style.removeProperty('--ig-internal-frame-fit-width');
    return;
  }

  // The cap stays a CSS expression so it keeps tracking the bar and the
  // viewport on its own; only the number CSS cannot supply comes from here.
  element.style.setProperty('--ig-internal-frame-fit-width', `calc(var(--ig-internal-stage-cap) * ${ratio})`);
}

onMounted(() => {
  fitToCap();
  // A responsive `md:aspect-video` changes which ratio applies at a breakpoint.
  window.addEventListener('resize', fitToCap, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', fitToCap);
});

// A neighbour is reused across turns rather than remounted, so its ratio moves.
watch(() => props.image, fitToCap, { flush: 'post' });

const transform = computed(() =>
  isActive.value ? stage.frameTransform() : stage.slideTransform(props.role as 'previous' | 'next')
);

const opacity = computed(() =>
  isActive.value ? stage.frameOpacity() : stage.slideOpacity(props.role as 'previous' | 'next')
);
</script>

<template>
  <div
    ref="frame"
    :class="isActive ? 'image-gallery-stage-frame' : 'image-gallery-stage-slide'"
    :data-ig-slide="isActive ? undefined : props.role"
    :aria-hidden="isActive ? undefined : 'true'"
    :style="{
      '--ig-internal-frame-ratio': dialog.aspectRatio(props.image, '4 / 5'),
      transform,
      opacity
    }"
  >
    <slot>
      <ImageGalleryStageImage />
    </slot>
  </div>
</template>
