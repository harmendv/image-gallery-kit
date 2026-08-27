<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useDialogContext } from '@/composables/useGalleryContext';

/*
 * The dialog's root. Nothing about it is decorative: `role`, `aria-modal` and
 * the label are what make it a dialog to a screen reader, and the element it
 * registers is what the focus trap, the Tab cycle and the initial-focus lookup
 * all key on. Recompose the dialog without this and you get a styled div that
 * traps nothing -- so it registers itself rather than being handed a ref.
 */
const gallery = useDialogContext('ImageGalleryOverlay');
const root = ref<HTMLElement | null>(null);

gallery.dialog.registerRoot(root);

/*
 * The bar's height is the one measurement two siblings need and neither owns:
 * the stage caps its frame to leave room for it at either end, and the grid
 * scrolls its tiles underneath it, so both have to clear whatever height it
 * actually has, whatever class you gave it.
 *
 * So the bar is observed rather than configured: give it `h-20` and the stage and
 * the grid both follow, with nothing to keep in step by hand. The variable below
 * is internal plumbing, not a knob. The CSS carries a 4rem fallback, so the first
 * frame is right for the default bar and only a resized one waits for the
 * observer.
 *
 * Note what the variable must NOT feed: the bar's own height. Have the bar size
 * itself from the value measured off the bar and each write re-triggers the
 * observation that produced it -- a loop with no fixed point. The bar states its
 * own height in CSS; only its two siblings read this.
 */
const shell = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;

onMounted(() => {
  const bar = shell.value?.querySelector<HTMLElement>('.image-gallery-topbar');

  /*
   * A dialog composed without a bar has nothing to clear, so it publishes zero
   * rather than leaving the CSS fallback to reserve room for a bar that is not
   * there -- which is what lets a chromeless, full-bleed overlay work without
   * unpicking the padding by hand.
   */
  if (!bar) {
    shell.value?.style.setProperty('--ig-internal-topbar-height', '0px');
    return;
  }

  if (typeof ResizeObserver === 'undefined') {
    return;
  }

  let published = '';

  const publish = () => {
    const height = `${bar.offsetHeight}px`;

    // Belt to the braces above: a write that changes nothing cannot start a
    // cascade of further observations.
    if (height === published) {
      return;
    }

    published = height;
    shell.value?.style.setProperty('--ig-internal-topbar-height', height);
  };

  publish();
  observer = new ResizeObserver(publish);
  observer.observe(bar);
});

onBeforeUnmount(() => {
  observer?.disconnect();
  observer = null;
  root.value = null;
});
</script>

<template>
  <!--
    tabindex="-1" rather than 0: the overlay must be focusable programmatically,
    because focus has to land somewhere when the dialog opens and when a trap
    cycle finds nothing else, but it must never become a Tab stop of its own.
  -->
  <div
    ref="root"
    class="image-gallery-overlay"
    role="dialog"
    aria-modal="true"
    :aria-label="gallery.labels.value.dialog(gallery.dialog.counterLabel.value)"
    tabindex="-1"
  >
    <div ref="shell" class="image-gallery-shell">
      <!--
        The bar is a sibling of the panel, not a child of it, and floats over the
        stage on its own stacking level. That is what lets a translucent bar read
        as glass: stacked on the opaque shell it would blur nothing but flat
        paint. It is also why the panel below is inset-0 rather than starting
        beneath the bar, and why the grid scrolls its tiles underneath it.
      -->
      <slot name="topbar" />

      <div class="image-gallery-panel">
        <slot />
      </div>
    </div>
  </div>
</template>
