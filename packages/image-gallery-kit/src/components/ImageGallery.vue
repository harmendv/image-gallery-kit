<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  shallowRef,
  useSlots,
  watch
} from 'vue';
import type { Ref } from 'vue';
import { GALLERY_CONTEXT } from '@/composables/useGalleryContext';
import { useSharedImageTransition } from '@/composables/useSharedImageTransition';
import type { GalleryColorScheme, GalleryImage, GalleryLabels } from '@/types';

type DialogMode = 'single' | 'bento';
type PreviewEntry = {
  image: GalleryImage;
  actualIndex: number;
};

const props = withDefaults(
  defineProps<{
    images: GalleryImage[];
    open?: boolean | null;
    index?: number | null;
    /*
     * Only the dialog reads this now. The grid packs columns shortest-first and
     * needs a height for every tile to do it, so an image without intrinsic
     * `width`/`height` borrows this ratio. Preview tiles are sized by the
     * classes on them and never consult it.
     */
    imageAspectRatio?: number | string;
    allowGridView?: boolean;
    colorScheme?: GalleryColorScheme;
    labels?: Partial<GalleryLabels>;
  }>(),
  {
    open: null,
    index: null,
    imageAspectRatio: '4 / 5',
    allowGridView: true,
    colorScheme: 'auto',
    labels: undefined
  }
);

const emit = defineEmits<{
  (event: 'open', index: number): void;
  (event: 'close'): void;
  (event: 'change', index: number): void;
  (event: 'update:open', value: boolean): void;
  (event: 'update:index', value: number): void;
}>();

const slots = useSlots();
const isMounted = ref(false);
const internalOpen = ref(props.open ?? false);
const internalIndex = ref(props.index ?? 0);
const dialogMode = ref<DialogMode>('single');
const bentoFrameRefs = ref<(HTMLDivElement | null)[]>([]);
const carouselFrameRef = ref<HTMLDivElement | null>(null);
const bentoGridRef = ref<HTMLDivElement | null>(null);
const dialogRef = ref<HTMLDivElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const isBentoEntering = ref(false);
const lastFocusedElement = ref<HTMLElement | null>(null);
const previousBodyOverflow = ref<string | null>(null);
const previousBodyPaddingRight = ref<string | null>(null);
const focusableCache = ref<{ root: HTMLElement; elements: HTMLElement[] } | null>(null);
const gridColumnCount = ref(1);

const { animateBetween, animateBentoEntrance, animateBentoExit } = useSharedImageTransition();

const DEFAULT_LABELS: GalleryLabels = {
  counter: (current, total) => `${current} of ${total}`,
  dialog: (counter) => `Image dialog. ${counter}`,
  openImage: (index) => `Open image ${index}`,
  openImageFromGrid: (index) => `Open image ${index} from grid`,
  showAllImages: (total) => `Show all ${total} images`,
  allImages: 'All images',
  toggleGrid: 'Toggle image grid',
  close: 'Close dialog',
  previous: 'Previous image',
  next: 'Next image'
};

const resolvedLabels = computed<GalleryLabels>(() => {
  const overrides = Object.fromEntries(
    Object.entries(props.labels ?? {}).filter(([, value]) => value !== undefined)
  );

  return { ...DEFAULT_LABELS, ...overrides };
});

const isOpenControlled = computed(() => props.open !== null);
const isIndexControlled = computed(() => props.index !== null);
const totalImages = computed(() => props.images.length);
const imageAspectRatioValue = computed(() => {
  if (typeof props.imageAspectRatio === 'number') {
    return `${props.imageAspectRatio}`;
  }

  return props.imageAspectRatio;
});
const imageAspectRatioNumber = computed(() => {
  if (typeof props.imageAspectRatio === 'number') {
    return props.imageAspectRatio > 0 ? props.imageAspectRatio : 1;
  }

  const normalized = props.imageAspectRatio.replace(/\s+/g, '');
  if (!normalized.includes('/')) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  }

  const [width, height] = normalized.split('/').map(Number);
  if (!width || !height) {
    return 1;
  }

  return width / height;
});
const masonryTileRadius = 'var(--ig-dialog-grid-tile-radius)';
/*
 * `auto` deliberately emits nothing: the stylesheet's cascade of OS query and
 * `dark`/`data-theme` switches only works while the gallery declares no palette
 * of its own. The explicit values are the opt-out for a host whose theme toggle
 * CSS cannot be seen from here -- see the theming contract in style.css. The
 * class goes on the dialog too, which is teleported to <body> and so escapes
 * any wrapper the host styled.
 */
const colorSchemeClass = computed(() =>
  props.colorScheme === 'light' ? 'ig-scheme-light' : props.colorScheme === 'dark' ? 'ig-scheme-dark' : null
);

function clampIndex(index: number) {
  if (!totalImages.value) {
    return 0;
  }

  return Math.min(Math.max(0, Math.floor(index)), totalImages.value - 1);
}

const currentIndex = computed(() => {
  const value = isIndexControlled.value ? (props.index ?? 0) : internalIndex.value;
  return clampIndex(value);
});
const isDialogOpen = computed(() => (isOpenControlled.value ? !!props.open : internalOpen.value));
const activeImage = computed(() => props.images[currentIndex.value] ?? null);
const dialogIsVisible = computed(() => isDialogOpen.value && activeImage.value !== null);
const counterLabel = computed(() => resolvedLabels.value.counter(currentIndex.value + 1, totalImages.value));
const hasDialogToolbarSlot = computed(() => Boolean(slots['dialog-toolbar']));
const hasDialogCaptionSlot = computed(() => Boolean(slots['dialog-caption']));

function getImageAspectRatio(image: GalleryImage | null, fallback: string = imageAspectRatioValue.value) {
  if (!image?.width || !image?.height) {
    return fallback;
  }

  return `${image.width} / ${image.height}`;
}

function getImageRatioNumber(image: GalleryImage) {
  if (image.width && image.height) {
    return image.width / image.height;
  }

  return imageAspectRatioNumber.value;
}

/*
 * The grid packs into explicit columns rather than riding CSS `column-count`.
 * Multi-column balances by splitting the flow into equal-height runs, so the
 * first fifth of a collection lands in column one -- a thousand images put
 * images 1-200 in a single column, which reads as sorted-by-column rather than
 * as a gallery. It also has to lay out every item to find that balance, which
 * rules out the per-tile containment that keeps a large grid cheap.
 *
 * Greedy shortest-column packing interleaves the sequence across columns and
 * needs no measurement: heights are compared in units of column width, so the
 * ratio alone orders them. Images without intrinsic dimensions fall back to the
 * gallery's configured ratio, which makes them uniform, which packs trivially.
 */
const bentoColumns = computed(() => {
  const count = Math.max(1, gridColumnCount.value);
  const columns = Array.from({ length: count }, () => ({ entries: [] as PreviewEntry[], height: 0 }));

  props.images.forEach((image, index) => {
    const shortest = columns.reduce(
      (best, column) => (column.height < best.height ? column : best),
      columns[0]
    );

    shortest.entries.push({ image, actualIndex: index });
    shortest.height += 1 / getImageRatioNumber(image);
  });

  return columns;
});

/*
 * The effective column count lives in CSS so themes keep overriding the density
 * tokens and the breakpoints keep working, but the packing above needs it as a
 * number. A single resolved custom property is the handoff: the media queries
 * assign it, this reads it back. Bento mode is only ever reached by a click, so
 * this never has to produce a value during SSR.
 */
function syncGridColumnCount() {
  const container = bentoGridRef.value;

  if (!container || typeof window === 'undefined') {
    return;
  }

  const parsed = Number.parseInt(
    getComputedStyle(container).getPropertyValue('--ig-dialog-grid-columns-current'),
    10
  );

  gridColumnCount.value = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/*
 * Keyed by image rather than by index: a child knows which image it draws, and
 * its index is derived. Keying on index instead would break the moment the
 * consumer reordered or filtered their preview subset, because two tiles would
 * briefly claim the same slot mid-update.
 *
 * shallowRef, not ref, and the distinction is load-bearing. `ref` would make
 * the Map deeply reactive, and iterating a reactive collection yields *proxies*
 * of its keys -- so copying it to publish a change would silently swap every
 * raw image key for a proxy, and the unregister on unmount would then look up
 * the raw object and miss. Registrations would accumulate and the overflow
 * count would never come back down. shallowRef leaves the keys alone and makes
 * the reassignment itself the reactive signal.
 */
const previewRegistry = shallowRef(new Map<GalleryImage, Ref<HTMLElement | null>>());

/*
 * Read by ImageGalleryOverflowTrigger, never by this component's own render.
 * That distinction is load-bearing: children register during setup, which runs
 * inside this component's render pass, so a render that depended on the count
 * would invalidate itself the moment a child registered and loop forever. The
 * trigger is a separate component rendering after the tiles, so it sees the
 * settled count -- on the server too, which is what keeps the SSR markup right.
 *
 * Nothing is lost by keeping it out of the slot props: the consumer chose which
 * tiles to render, so they already know how many there are.
 */
const registeredIndices = computed(() => {
  const indices: number[] = [];

  previewRegistry.value.forEach((_frame, image) => {
    const index = resolveImageIndex(image);

    if (index >= 0) {
      indices.push(index);
    }
  });

  return indices;
});

const composedOverflowCount = computed(() =>
  Math.max(0, totalImages.value - new Set(registeredIndices.value).size)
);

const composedLastPreviewedIndex = computed(() =>
  registeredIndices.value.length ? Math.max(...registeredIndices.value) : 0
);

/*
 * Identity first, then id, then src. A consumer whose `images` come from a
 * computed `.map()` hands children a fresh object every recompute, so identity
 * alone would resolve to -1 and every tile would lose its place in the
 * collection -- silently, showing up only as a transition that flies from
 * nowhere.
 */
function resolveImageIndex(image: GalleryImage) {
  const direct = props.images.indexOf(image);

  if (direct >= 0) {
    return direct;
  }

  if (image.id !== undefined) {
    const byId = props.images.findIndex((candidate) => candidate.id === image.id);

    if (byId >= 0) {
      return byId;
    }
  }

  return props.images.findIndex((candidate) => candidate.src === image.src);
}

provide(GALLERY_CONTEXT, {
  registerPreview(image, frame) {
    if (previewRegistry.value.get(image) === frame) {
      return;
    }

    previewRegistry.value = new Map(previewRegistry.value).set(image, frame);

    if (resolveImageIndex(image) < 0 && import.meta.env?.DEV) {
      console.warn(
        '[image-gallery-kit] <ImageGalleryImage> was given an image that is not in the `images` prop. ' +
          'Opening it will not work; match by object identity, `id`, or `src`.',
        image
      );
    }
  },
  unregisterPreview(image) {
    const next = new Map(previewRegistry.value);

    if (next.delete(image)) {
      previewRegistry.value = next;
    }
  },
  resolveIndex: resolveImageIndex,
  openImage: openSingle,
  openGrid: openBentoFromPreview,
  labels: resolvedLabels,
  overflowCount: composedOverflowCount,
  total: totalImages,
  allowGridView: computed(() => props.allowGridView),
  lastPreviewedIndex: composedLastPreviewedIndex
});

/*
 * Resolved at click time, not at registration time: a tile's element can be
 * replaced by a keyed update or a v-if between mounting and being clicked, and
 * animateBetween measures whatever this returns.
 */
function getPreviewFrame(index: number) {
  for (const [image, frame] of previewRegistry.value) {
    if (resolveImageIndex(image) === index) {
      return frame.value ?? null;
    }
  }

  return null;
}

function getImageKey(image: GalleryImage, index: number) {
  return image.id ?? `${image.src}-${index}`;
}

function getPreviewImageSrc(image: GalleryImage) {
  return image.thumbnailSrc ?? image.src;
}

function getPreviewImageLoading(image: GalleryImage) {
  return image.loading ?? 'lazy';
}

function getDialogImageLoading(image: GalleryImage) {
  return image.loading ?? 'eager';
}

function setBentoFrameRef(index: number, element: HTMLDivElement | null) {
  bentoFrameRefs.value[index] = element;
}

/*
 * The grid is scrollable and opens wherever the active image happens to sit, so
 * for anything past the first screenful the tile the transition targets is
 * below the fold. animateBetween would then measure an off-screen rect and fly
 * the image out of view instead of into place. Scrolling lives here, in the
 * getter, because animateBetween reads the rect immediately after resolving it
 * -- revealing any earlier would be undone by the grid's own initial layout.
 * `instant` is explicit: a host page with scroll-behavior: smooth would
 * otherwise move the tile asynchronously, after the rect has been read.
 */
function revealBentoFrame(index: number) {
  const frame = bentoFrameRefs.value[index] ?? null;

  frame?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'instant' });

  return frame;
}

function getElementRect(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return new DOMRect(rect.x, rect.y, rect.width, rect.height);
}

function setDialogOpen(nextOpen: boolean) {
  if (!isOpenControlled.value) {
    internalOpen.value = nextOpen;
  }

  emit('update:open', nextOpen);
}

function setCurrentIndex(nextIndex: number, options: { emitChange?: boolean } = {}) {
  if (!totalImages.value) {
    return 0;
  }

  const normalizedIndex = clampIndex(nextIndex);

  if (!isIndexControlled.value) {
    internalIndex.value = normalizedIndex;
  }

  emit('update:index', normalizedIndex);

  if (options.emitChange) {
    emit('change', normalizedIndex);
  }

  return normalizedIndex;
}

async function openSingle(index: number) {
  if (!props.images[index]) {
    return;
  }

  const fromFrame = getPreviewFrame(index);
  const fromRect = getElementRect(fromFrame);

  const nextIndex = setCurrentIndex(index);
  dialogMode.value = 'single';
  setDialogOpen(true);
  emit('open', nextIndex);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect }
    );
  }
}

async function openBentoFromPreview(index: number) {
  const targetIndex = Math.min(index, totalImages.value - 1);
  const fromFrame = getPreviewFrame(targetIndex);
  const fromRect = getElementRect(fromFrame);

  const nextIndex = setCurrentIndex(Math.max(0, targetIndex));
  isBentoEntering.value = true;
  dialogMode.value = 'bento';
  setDialogOpen(true);
  emit('open', nextIndex);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => revealBentoFrame(currentIndex.value),
      { fromRect }
    );
    await animateBentoEntrance(() => bentoGridRef.value);
    isBentoEntering.value = false;
  } else {
    isBentoEntering.value = false;
  }
}

function closeDialog() {
  setDialogOpen(false);
  dialogMode.value = 'single';
  emit('close');
}

function goNext() {
  if (!totalImages.value) {
    return;
  }

  setCurrentIndex((currentIndex.value + 1) % totalImages.value, { emitChange: true });
}

function goPrevious() {
  if (!totalImages.value) {
    return;
  }

  setCurrentIndex((currentIndex.value - 1 + totalImages.value) % totalImages.value, { emitChange: true });
}

async function toggleDialogMode() {
  if (!dialogIsVisible.value || totalImages.value <= 1) {
    return;
  }

  if (dialogMode.value === 'single') {
    const fromFrame = carouselFrameRef.value;
    const fromRect = getElementRect(fromFrame);

    isBentoEntering.value = true;
    dialogMode.value = 'bento';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => revealBentoFrame(currentIndex.value),
        { fromRect }
      );
      await animateBentoEntrance(() => bentoGridRef.value);
      isBentoEntering.value = false;
    } else {
      isBentoEntering.value = false;
    }
  } else {
    const fromFrame = revealBentoFrame(currentIndex.value);
    const fromRect = getElementRect(fromFrame);

    if (isMounted.value) {
      void animateBentoExit(() => bentoGridRef.value, { activeIndex: currentIndex.value });
    }

    dialogMode.value = 'single';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => carouselFrameRef.value,
        { fromRect }
      );
    }
  }
}

async function selectBentoImage(index: number) {
  const fromFrame = bentoFrameRefs.value[index] ?? null;
  const fromRect = getElementRect(fromFrame);

  if (isMounted.value) {
    void animateBentoExit(() => bentoGridRef.value, { activeIndex: index });
  }

  setCurrentIndex(index, { emitChange: true });
  dialogMode.value = 'single';

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect }
    );
  }
}

/*
 * Every grid tile is a button, so the focusable set is the size of the
 * collection. Recomputing it per keystroke means walking a few thousand nodes
 * on each Tab; the set only changes when the dialog opens, swaps mode, or the
 * collection itself changes, so cache it and invalidate on exactly those.
 */
function getFocusableElements() {
  if (!dialogRef.value) {
    return [];
  }

  // Keyed on the element itself, not just invalidated on the events that should
  // change it: Vue rebuilds the dialog subtree on an images change, and a cache
  // that only tracked time would keep handing back detached nodes to focus.
  if (focusableCache.value?.root === dialogRef.value) {
    return focusableCache.value.elements;
  }

  const elements = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');

  focusableCache.value = { root: dialogRef.value, elements };

  return elements;
}

function focusInitialDialogElement() {
  const focusTarget = closeButtonRef.value ?? getFocusableElements()[0] ?? dialogRef.value;
  focusTarget?.focus();
}

function trapFocus(event: KeyboardEvent) {
  const focusableElements = getFocusableElements();

  if (!focusableElements.length) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (!firstElement || !lastElement) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }

  const activeElement = document.activeElement as HTMLElement | null;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function lockBodyScroll() {
  if (typeof document === 'undefined' || previousBodyOverflow.value !== null) {
    return;
  }

  previousBodyOverflow.value = document.body.style.overflow;
  previousBodyPaddingRight.value = document.body.style.paddingRight;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  document.body.style.overflow = 'hidden';

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || previousBodyOverflow.value === null) {
    return;
  }

  document.body.style.overflow = previousBodyOverflow.value;
  document.body.style.paddingRight = previousBodyPaddingRight.value ?? '';
  previousBodyOverflow.value = null;
  previousBodyPaddingRight.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (!dialogIsVisible.value) {
    return;
  }

  if (event.key === 'Tab') {
    trapFocus(event);
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeDialog();
    return;
  }

  if (dialogMode.value === 'single' && event.key === 'ArrowRight') {
    event.preventDefault();
    goNext();
    return;
  }

  if (dialogMode.value === 'single' && event.key === 'ArrowLeft') {
    event.preventDefault();
    goPrevious();
  }
}

onMounted(() => {
  isMounted.value = true;
  window.addEventListener('keydown', onKeydown);
  // No mode guard needed: the sync is a no-op whenever the grid is not mounted.
  window.addEventListener('resize', syncGridColumnCount);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', syncGridColumnCount);
  }

  unlockBodyScroll();
});

watch([dialogMode, dialogIsVisible], async () => {
  focusableCache.value = null;

  if (!dialogIsVisible.value || dialogMode.value !== 'bento') {
    return;
  }

  // Ahead of the entrance animation, which resolves its target only after a
  // further requestAnimationFrame -- so the repack this may trigger settles
  // while the tiles are still held hidden by isBentoEntering.
  await nextTick();
  syncGridColumnCount();
});

watch(
  () => props.images,
  () => {
    bentoFrameRefs.value = [];
    focusableCache.value = null;

    if (!isIndexControlled.value && internalIndex.value > props.images.length - 1) {
      internalIndex.value = Math.max(0, props.images.length - 1);
    }

    if (!props.images.length) {
      closeDialog();
    }
  }
);

watch(dialogIsVisible, async (open) => {
  if (typeof document === 'undefined') {
    return;
  }

  if (open) {
    lastFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    await nextTick();
    focusInitialDialogElement();
    return;
  }

  unlockBodyScroll();
  lastFocusedElement.value?.focus();
  lastFocusedElement.value = null;
});
</script>

<template>
  <section class="image-gallery-theme w-full" :class="colorSchemeClass">
    <!--
      The preview is entirely the consumer's markup. Nothing is emitted around
      it -- no wrapper grid, no sizing -- so their own element is the layout
      root and their classes are the only thing deciding arrangement. Slot props
      carry what only the gallery can know: the collection, how much of it the
      preview covers, and the two ways into the dialog.
    -->
    <slot :images="props.images" :total="totalImages" :open="openSingle" :open-grid="openBentoFromPreview" />

    <!--
      Teleported to body: a fixed overlay is positioned against the nearest
      ancestor with a transform/filter/containment, so rendering in place lets a
      styled host wrapper clip the "fullscreen" dialog. Disabled until mounted so
      SSR output (and its hydration) stays in place.
    -->
    <Teleport to="body" :disabled="!isMounted">
      <div
        v-if="dialogIsVisible && activeImage"
        ref="dialogRef"
        class="fixed inset-0 z-50 bg-[var(--ig-dialog-overlay)]"
        :class="colorSchemeClass"
        role="dialog"
        aria-modal="true"
        :aria-label="resolvedLabels.dialog(counterLabel)"
        tabindex="-1"
      >
        <div class="relative z-10 h-screen w-screen overflow-hidden bg-[var(--ig-dialog-surface)]">
          <!--
            The bar floats over a full-bleed stage rather than sitting above it
            in the flow. A translucent bar stacked on the opaque shell would
            blur nothing but flat paint; overlapping the stage is what makes the
            fill read as glass, and is why the stage below is `inset-0` and the
            grid scrolls its tiles underneath.
          -->
          <div
            class="image-gallery-topbar absolute inset-x-0 top-0 z-20 grid h-[var(--ig-dialog-topbar-height,4rem)] grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--ig-dialog-border)] px-4 text-[var(--ig-dialog-text)] sm:px-6"
          >
            <div class="flex min-w-0 items-center gap-3">
              <button
                v-if="dialogMode === 'single' && props.allowGridView && totalImages > 1"
                type="button"
                :aria-label="resolvedLabels.toggleGrid"
                class="inline-flex items-center gap-2 rounded-full bg-[var(--ig-dialog-button)] px-3 py-2 text-sm font-medium text-[var(--ig-dialog-text)] transition hover:bg-[var(--ig-dialog-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]"
                @click="toggleDialogMode"
              >
                <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="1.7">
                  <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                  <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                  <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                  <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
                </svg>
                <span>{{ resolvedLabels.allImages }}</span>
              </button>

              <slot
                v-if="hasDialogToolbarSlot"
                name="dialog-toolbar"
                :image="activeImage"
                :index="currentIndex"
                :total="totalImages"
                :mode="dialogMode"
                :close="closeDialog"
                :toggleMode="toggleDialogMode"
              />
            </div>

            <div
              v-if="dialogMode === 'single'"
              class="text-center text-[11px] font-medium tracking-[0.18em] text-[var(--ig-dialog-muted)] uppercase"
            >
              {{ counterLabel }}
            </div>
            <div v-else />

            <div class="flex justify-end">
              <button
                ref="closeButtonRef"
                type="button"
                class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ig-dialog-button)] text-[var(--ig-dialog-text)] transition hover:bg-[var(--ig-dialog-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]"
                :aria-label="resolvedLabels.close"
                @click="closeDialog"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          <div class="absolute inset-0 overflow-hidden bg-[var(--ig-dialog-panel)]">
            <div v-if="dialogMode === 'single'" class="flex h-full items-center justify-center">
              <button
                type="button"
                class="absolute left-4 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ig-dialog-button)] text-[var(--ig-dialog-text)] transition hover:bg-[var(--ig-dialog-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]"
                :aria-label="resolvedLabels.previous"
                @click="goPrevious"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                  <path d="m14.5 5.5-6 6 6 6" />
                </svg>
              </button>

              <div class="flex h-full w-full flex-col items-center justify-center px-10 py-6 sm:px-20">
                <div
                  ref="carouselFrameRef"
                  class="relative overflow-hidden rounded-[var(--ig-dialog-radius)]"
                  :style="{
                    aspectRatio: getImageAspectRatio(activeImage, '4 / 5'),
                    width: 'min(100%, 56rem)',
                    maxHeight: 'calc(100vh - (2 * var(--ig-dialog-topbar-height, 4rem)) - 4rem)'
                  }"
                >
                  <img
                    :key="getImageKey(activeImage, currentIndex)"
                    :src="activeImage.src"
                    :alt="activeImage.alt"
                    :srcset="activeImage.srcset"
                    :sizes="activeImage.sizes"
                    :decoding="activeImage.decoding"
                    :loading="getDialogImageLoading(activeImage)"
                    class="image-gallery-image absolute inset-0 block h-full w-full rounded-[var(--ig-dialog-radius)]"
                  />
                </div>

                <div
                  v-if="hasDialogCaptionSlot || activeImage.caption"
                  class="mt-4 w-full max-w-3xl text-center text-sm leading-6 text-[var(--ig-dialog-muted)]"
                >
                  <slot name="dialog-caption" :image="activeImage" :index="currentIndex" :total="totalImages">
                    {{ activeImage.caption }}
                  </slot>
                </div>
              </div>

              <button
                type="button"
                class="absolute right-4 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ig-dialog-button)] text-[var(--ig-dialog-text)] transition hover:bg-[var(--ig-dialog-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]"
                :aria-label="resolvedLabels.next"
                @click="goNext"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                  <path d="m9.5 5.5 6 6-6 6" />
                </svg>
              </button>
            </div>

            <div
              v-else
              class="h-full overflow-y-auto px-4 pb-4 sm:px-6 sm:pb-5"
              :style="{ paddingTop: 'calc(var(--ig-dialog-topbar-height, 4rem) + 1rem)' }"
            >
              <div ref="bentoGridRef" class="image-gallery-masonry">
                <div
                  v-for="(column, columnIndex) in bentoColumns"
                  :key="columnIndex"
                  class="image-gallery-masonry-column"
                >
                  <button
                    v-for="entry in column.entries"
                    :key="getImageKey(entry.image, entry.actualIndex)"
                    type="button"
                    data-bento-item="true"
                    :data-bento-index="entry.actualIndex"
                    :data-bento-active="entry.actualIndex === currentIndex ? 'true' : 'false'"
                    :class="[
                      'image-gallery-masonry-tile group relative block w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]',
                      isBentoEntering && entry.actualIndex !== currentIndex
                        ? 'opacity-0 translate-y-5 scale-[0.98]'
                        : ''
                    ]"
                    :style="{
                      borderRadius: masonryTileRadius,
                      aspectRatio: getImageAspectRatio(entry.image)
                    }"
                    :aria-label="resolvedLabels.openImageFromGrid(entry.actualIndex + 1)"
                    @click="selectBentoImage(entry.actualIndex)"
                  >
                    <div
                      :ref="
                        (element) => setBentoFrameRef(entry.actualIndex, element as HTMLDivElement | null)
                      "
                      class="relative w-full overflow-hidden"
                      :style="{
                        aspectRatio: getImageAspectRatio(entry.image),
                        borderRadius: masonryTileRadius
                      }"
                    >
                      <img
                        :src="getPreviewImageSrc(entry.image)"
                        :alt="entry.image.alt"
                        :srcset="entry.image.srcset"
                        :sizes="entry.image.sizes"
                        :decoding="entry.image.decoding"
                        :loading="getPreviewImageLoading(entry.image)"
                        class="image-gallery-image absolute inset-0 block h-full w-full transition duration-300 group-hover:scale-[1.02]"
                      />
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </section>
</template>
