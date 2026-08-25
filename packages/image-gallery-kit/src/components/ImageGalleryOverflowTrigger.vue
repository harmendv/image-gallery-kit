<script setup lang="ts">
import { inject } from 'vue';
import { GALLERY_CONTEXT } from '@/composables/useGalleryContext';

const injected = inject(GALLERY_CONTEXT, null);

if (!injected) {
  throw new Error(
    '[image-gallery-kit] <ImageGalleryOverflowTrigger> must be rendered inside the default slot of <ImageGallery>.'
  );
}

// Narrowed alias: a bare `throw` does not narrow the injected value for the template.
const gallery = injected;

/*
 * The count is derived, not passed: `images` knows the collection and the
 * registry knows how many tiles the consumer drew, so the difference is the
 * number this trigger stands for. That keeps it correct when the preview subset
 * changes at a breakpoint without the consumer restating anything.
 */
function onClick() {
  gallery.openGrid(Math.max(0, gallery.lastPreviewedIndex.value));
}
</script>

<template>
  <!--
    Unstyled apart from centring its content. Appearance is a class you put on
    it, the same as every other element you render.
  -->
  <button
    v-if="gallery.allowGridView.value && gallery.overflowCount.value > 0"
    type="button"
    class="image-gallery-overflow-trigger inline-flex items-center justify-center"
    :aria-label="gallery.labels.value.showAllImages(gallery.total.value)"
    @click.stop="onClick"
  >
    <slot :count="gallery.overflowCount.value">
      <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
        <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
        <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
        <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
      </svg>
    </slot>
  </button>
</template>
