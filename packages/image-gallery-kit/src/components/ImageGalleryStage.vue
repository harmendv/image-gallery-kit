<script setup lang="ts">
import ImageGalleryNext from '@/components/ImageGalleryNext.vue';
import ImageGalleryPrevious from '@/components/ImageGalleryPrevious.vue';
import ImageGalleryStageFrame from '@/components/ImageGalleryStageFrame.vue';
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * The single-image view. The gesture and the turn are not in here -- they are
 * behaviour, and they stay in ImageGallery where the dialog's state lives. What
 * lives here is the arrangement: a stack holding the active frame with its two
 * neighbours stacked on the same centre.
 *
 * They share one centre rather than sitting side by side because the gesture
 * dissolves between them rather than sliding a strip, and they come after the
 * frame in DOM order so the image fading in is always the one on top, whichever
 * way the drag went.
 */
/*
 * withDefaults, not a bare optional: Vue casts a declared Boolean prop, so an
 * omitted `swipe` arrives as `false` rather than `undefined` -- and a default of
 * off would silently disable the gesture for everyone who never mentioned it.
 */
const props = withDefaults(
  defineProps<{
    /*
     * Whether a touch drag turns the page. Off leaves the arrows and the arrow
     * keys as the only way through, which is what a stage inside a horizontally
     * scrolling layout wants. A mouse never swipes either way -- see
     * onSwipeStart.
     */
    swipe?: boolean;
  }>(),
  { swipe: true }
);

const gallery = useDialogContext('ImageGalleryStage');
const dialog = gallery.dialog;
const stage = dialog.stage;

function onPointerDown(event: PointerEvent) {
  if (!props.swipe) {
    return;
  }

  stage.onSwipeStart(event);
}
</script>

<template>
  <!--
    The swipe surface is the whole stage, not just the image: on a phone the
    image is letterboxed inside it, and a gesture that only counted when it
    started on the pixels of the photo would miss half the thumb drags aimed at
    it.
  -->
  <div
    v-if="dialog.mode.value === 'single' && dialog.activeImage.value"
    class="image-gallery-stage"
    :data-ig-swiping="stage.isSwiping.value ? 'true' : 'false'"
    @pointerdown="onPointerDown"
    @click.capture="stage.swallowClick"
  >
    <!--
      Checked rather than defaulted, so that providing the slot and leaving it
      empty genuinely removes the arrow. A <slot> with fallback content cannot
      express "nothing": Vue renders the fallback whenever the slot yields no
      nodes, which would make an empty template indistinguishable from no
      template at all.
    -->
    <slot v-if="$slots.previous" name="previous" />
    <ImageGalleryPrevious v-else />

    <div class="image-gallery-stage-body">
      <div
        :ref="(element) => stage.setStack(element as HTMLElement | null)"
        class="image-gallery-stage-stack"
      >
        <!--
          One template, three roles. A radius or a shadow put on the frame
          therefore reaches the neighbours too, which is the whole reason the
          stage drives this rather than rendering three fixed elements.
        -->
        <slot name="frame" :image="dialog.activeImage.value" role="active">
          <ImageGalleryStageFrame :image="dialog.activeImage.value" role="active" />
        </slot>

        <slot
          v-if="dialog.previousImage.value"
          name="frame"
          :image="dialog.previousImage.value"
          role="previous"
        >
          <ImageGalleryStageFrame :image="dialog.previousImage.value" role="previous" />
        </slot>

        <slot v-if="dialog.nextImage.value" name="frame" :image="dialog.nextImage.value" role="next">
          <ImageGalleryStageFrame :image="dialog.nextImage.value" role="next" />
        </slot>
      </div>

      <div v-if="$slots.caption || dialog.activeImage.value.caption" class="image-gallery-caption">
        <slot
          name="caption"
          :image="dialog.activeImage.value"
          :index="dialog.index.value"
          :total="gallery.total.value"
        >
          {{ dialog.activeImage.value.caption }}
        </slot>
      </div>
    </div>

    <slot v-if="$slots.next" name="next" />
    <ImageGalleryNext v-else />
  </div>
</template>
