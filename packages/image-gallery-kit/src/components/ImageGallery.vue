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
import ImageGalleryCloseButton from '@/components/ImageGalleryCloseButton.vue';
import ImageGalleryCounter from '@/components/ImageGalleryCounter.vue';
import ImageGalleryGrid from '@/components/ImageGalleryGrid.vue';
import ImageGalleryGridToggle from '@/components/ImageGalleryGridToggle.vue';
import ImageGalleryOverlay from '@/components/ImageGalleryOverlay.vue';
import ImageGalleryStage from '@/components/ImageGalleryStage.vue';
import ImageGalleryTopbar from '@/components/ImageGalleryTopbar.vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import { useDialogFocus } from '@/composables/useDialogFocus';
import { useSharedImageTransition } from '@/composables/useSharedImageTransition';
import { useStageSwipe } from '@/composables/useStageSwipe';
import { parseAspectRatio } from '@/utils/aspectRatio';
import type { GalleryImage, GalleryLabels } from '@/types';

type DialogMode = 'single' | 'bento';

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
    /*
     * Whether the carousel wraps at the ends. Off, the last image is the last
     * image: the next arrow disables, the swipe rubber-bands instead of
     * revealing a neighbour, and ArrowRight does nothing. Every route forward
     * asks the same two computeds (canGoNext / canGoPrevious), so no route can
     * disagree with the arrows about where the ends are.
     */
    loop?: boolean;
    labels?: Partial<GalleryLabels>;
  }>(),
  {
    open: null,
    index: null,
    imageAspectRatio: '4 / 5',
    allowGridView: true,
    loop: true,
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
const carouselFrameRef = ref<HTMLElement | null>(null);
const carouselStackRef = ref<HTMLElement | null>(null);
const isBentoEntering = ref(false);

const { animateBetween, animateBentoEntrance, animateBentoExit, measureTransitionRadius } =
  useSharedImageTransition();

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
const imageAspectRatioNumber = computed(() => parseAspectRatio(props.imageAspectRatio) ?? 1);

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

const focus = useDialogFocus();

const bento = useBentoGrid({
  images: () => props.images,
  total: totalImages,
  ratioOf: getImageRatioNumber,
  clampIndex
});

/*
 * Also the hook for anything else a resize can invalidate: a control a media
 * query retires at some width leaves a cached focusable set holding a button
 * that is not rendered any longer.
 */
function onResize() {
  focus.invalidateFocusables();
  bento.syncColumnCount();
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

/*
 * Box and corners are measured together, and eagerly, for the same reason: the
 * mode swap a click triggers detaches the element the flight starts from before
 * animateBetween gets to look at it, and a detached element has neither a box
 * nor a resolved style left to read. Measured here it is still on screen, which
 * is the only moment either value is true.
 */
function measureFrame(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') {
    return { rect: null, radius: null };
  }

  const rect = element.getBoundingClientRect();

  return {
    rect: new DOMRect(rect.x, rect.y, rect.width, rect.height),
    radius: measureTransitionRadius(element)
  };
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
  const from = measureFrame(fromFrame);

  const nextIndex = setCurrentIndex(index);
  dialogMode.value = 'single';
  setDialogOpen(true);
  emit('open', nextIndex);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect: from.rect, fromRadius: from.radius }
    );
  }
}

async function openBentoFromPreview(index: number) {
  const targetIndex = Math.min(index, totalImages.value - 1);
  const fromFrame = getPreviewFrame(targetIndex);
  const from = measureFrame(fromFrame);

  const nextIndex = setCurrentIndex(Math.max(0, targetIndex));
  isBentoEntering.value = true;
  dialogMode.value = 'bento';
  setDialogOpen(true);
  emit('open', nextIndex);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => bento.revealFrame(currentIndex.value),
      { fromRect: from.rect, fromRadius: from.radius }
    );
    await animateBentoEntrance(() => bento.gridRef.value);
    isBentoEntering.value = false;
    bento.focusTile(currentIndex.value);
  } else {
    isBentoEntering.value = false;
  }
}

function closeDialog() {
  setDialogOpen(false);
  dialogMode.value = 'single';
  emit('close');
}

/*
 * The one place the ends exist. With `loop` on there are none, so both answers
 * are a plain "is there more than one image"; with it off they are the edges of
 * the collection. The arrows disable off these, the keys and swipe commit ask
 * them, and the neighbour computeds below return null off them -- which is what
 * keeps a disabled arrow, a dead key and an empty slide all agreeing.
 */
const canGoPrevious = computed(() => totalImages.value > 1 && (props.loop || currentIndex.value > 0));
const canGoNext = computed(
  () => totalImages.value > 1 && (props.loop || currentIndex.value < totalImages.value - 1)
);

/* The index one step away, wrapping at the ends -- shared by the arrows and the
 * parked neighbour slides so the two can never disagree about what comes next. */
function wrappedIndex(delta: number) {
  return (currentIndex.value + delta + totalImages.value) % totalImages.value;
}

function goNext() {
  if (!canGoNext.value) {
    return;
  }

  setCurrentIndex(wrappedIndex(1), { emitChange: true });
}

function goPrevious() {
  if (!canGoPrevious.value) {
    return;
  }

  setCurrentIndex(wrappedIndex(-1), { emitChange: true });
}

const canSwipe = computed(() => dialogMode.value === 'single' && totalImages.value > 1);

/*
 * The incoming image has to already be decoded when the fade starts, so both
 * neighbours stay mounted rather than appearing on pointerdown -- otherwise the
 * reader dissolves into an empty box while the browser starts the request. At
 * rest they cost nothing but the decode: they are stacked exactly under the
 * frame at opacity 0. On a pointer-less desktop the same two decodes are what
 * makes an arrow click land on a painted image.
 *
 * Both follow the arrows exactly -- wrapping when `loop` wraps, and null past
 * an end when it does not, so a stage at the last image parks no slide it
 * would never be allowed to reveal.
 */
const previousImage = computed(() =>
  canSwipe.value && canGoPrevious.value ? (props.images[wrappedIndex(-1)] ?? null) : null
);
const nextImage = computed(() =>
  canSwipe.value && canGoNext.value ? (props.images[wrappedIndex(1)] ?? null) : null
);

const swipe = useStageSwipe({
  enabled: canSwipe,
  hasPrevious: computed(() => previousImage.value !== null),
  hasNext: computed(() => nextImage.value !== null),
  goPrevious,
  goNext
});

async function toggleDialogMode() {
  if (!dialogIsVisible.value || totalImages.value <= 1) {
    return;
  }

  if (dialogMode.value === 'single') {
    const fromFrame = carouselFrameRef.value;
    const from = measureFrame(fromFrame);

    isBentoEntering.value = true;
    dialogMode.value = 'bento';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => bento.revealFrame(currentIndex.value),
        { fromRect: from.rect, fromRadius: from.radius }
      );
      await animateBentoEntrance(() => bento.gridRef.value);
      isBentoEntering.value = false;
      bento.focusTile(currentIndex.value);
    } else {
      isBentoEntering.value = false;
    }
  } else {
    const fromFrame = bento.revealFrame(currentIndex.value);
    const from = measureFrame(fromFrame);

    if (isMounted.value) {
      void animateBentoExit(() => bento.gridRef.value, { activeIndex: currentIndex.value });
    }

    dialogMode.value = 'single';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => carouselFrameRef.value,
        { fromRect: from.rect, fromRadius: from.radius }
      );
      // The tile focus rode on is gone with the grid; same reasoning as
      // bento.focusTile, landing back where the dialog starts.
      focus.focusInitialElement();
    }
  }
}

async function selectBentoImage(index: number) {
  const fromFrame = bento.frameAt(index);
  const from = measureFrame(fromFrame);

  if (isMounted.value) {
    void animateBentoExit(() => bento.gridRef.value, { activeIndex: index });
  }

  setCurrentIndex(index, { emitChange: true });
  dialogMode.value = 'single';

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect: from.rect, fromRadius: from.radius }
    );
    // The selected tile unmounted with the grid, taking focus with it.
    focus.focusInitialElement();
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!dialogIsVisible.value) {
    return;
  }

  if (event.key === 'Tab') {
    focus.trapFocus(event);
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
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
  }
});

watch([dialogMode, dialogIsVisible], async () => {
  focus.invalidateFocusables();
  // Leaving single mode (or closing) mid-drag would otherwise keep the offset,
  // and the stage would come back nudged sideways.
  swipe.reset();

  if (!dialogIsVisible.value || dialogMode.value !== 'bento') {
    return;
  }

  // Ahead of the entrance animation, which resolves its target only after a
  // further requestAnimationFrame -- so the repack this may trigger settles
  // while the tiles are still held hidden by isBentoEntering.
  await nextTick();
  bento.syncColumnCount();
});

watch(
  () => props.images,
  () => {
    bento.handleImagesChange();
    focus.invalidateFocusables();

    if (!isIndexControlled.value && internalIndex.value > props.images.length - 1) {
      internalIndex.value = Math.max(0, props.images.length - 1);
    }

    if (!props.images.length) {
      closeDialog();
    }
  },
  /*
   * One level deep, because `push` and `splice` are mutations of the array the
   * consumer already handed over -- the getter never re-runs for them, so a
   * plain watch would skip this cleanup and leave frame refs and the focusable
   * cache pointing at tiles of a collection that no longer exists. Depth 1
   * tracks the slots without touching the images inside them: editing an
   * image's caption is not a collection change.
   */
  { deep: 1 }
);

watch(dialogIsVisible, async (open) => {
  if (typeof document === 'undefined') {
    return;
  }

  if (open) {
    focus.onDialogOpen();
    await nextTick();
    focus.focusInitialElement();
    return;
  }

  focus.onDialogClose();
});
/*
 * Assembled last, so every ref and handler it publishes already exists. Where
 * provide() runs inside setup makes no difference to a child: inject() runs
 * when the child is created, which is during this component's render.
 */
provide(GALLERY_CONTEXT, {
  registerPreview(image, frame) {
    if (previewRegistry.value.get(image) === frame) {
      return;
    }

    previewRegistry.value = new Map(previewRegistry.value).set(image, frame);

    /*
     * NODE_ENV, not import.meta.env.DEV: Vite inlines the latter when *this
     * package* is built, so the warning would be stripped from the published
     * bundle and no consumer would ever see it. process.env.NODE_ENV survives
     * the library build for the consumer's own bundler to resolve; the typeof
     * guard keeps the bare-browser UMD path from throwing on it.
     */
    if (
      typeof process !== 'undefined' &&
      process.env.NODE_ENV !== 'production' &&
      resolveImageIndex(image) < 0
    ) {
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
  lastPreviewedIndex: composedLastPreviewedIndex,
  dialog: {
    mode: dialogMode,
    activeImage,
    previousImage,
    nextImage,
    index: currentIndex,
    counterLabel,
    close: closeDialog,
    toggleMode: toggleDialogMode,
    next: goNext,
    previous: goPrevious,
    canGoNext,
    canGoPrevious,
    registerCloseButton: focus.registerCloseButton,
    registerRoot: focus.registerRoot,
    stage: {
      isSwiping: swipe.isSwiping,
      onSwipeStart: swipe.onSwipeStart,
      swallowClick: swipe.swallowClick,
      frameTransform: swipe.frameTransform,
      frameOpacity: swipe.frameOpacity,
      slideTransform: swipe.slideTransform,
      slideOpacity: swipe.slideOpacity,
      registerFrame(element) {
        carouselFrameRef.value = element.value;

        watch(element, (next) => {
          carouselFrameRef.value = next;
        });
      },
      setStack(element) {
        carouselStackRef.value = element;
      }
    },
    grid: {
      columns: bento.columns,
      isEntering: isBentoEntering,
      focusIndex: bento.focusIndex,
      moveFocus: bento.moveFocus,
      setGrid: bento.setGrid,
      registerTile: bento.registerTile,
      unregisterTile: bento.unregisterTile,
      select: selectBentoImage,
      setUniform: bento.setUniform
    },
    aspectRatio: getImageAspectRatio,
    imageKey: getImageKey,
    dialogImageLoading: getDialogImageLoading,
    previewImageSrc: getPreviewImageSrc,
    previewImageLoading: getPreviewImageLoading
  }
});
</script>

<template>
  <section class="image-gallery-theme w-full">
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
      <!--
        The default content *is* the composition, so there is one dialog
        implementation rather than a built-in one plus a slot that shadows it.
        Override the slot and you rebuild it from the same parts, with the same
        behaviour still attached -- the overlay traps focus, the stage swipes,
        the grid flies -- because each part registers what it provides instead of
        being handed it.
      -->
      <slot
        v-if="dialogIsVisible && activeImage"
        name="dialog"
        :image="activeImage"
        :index="currentIndex"
        :total="totalImages"
        :mode="dialogMode"
        :close="closeDialog"
        :toggle-mode="toggleDialogMode"
      >
        <ImageGalleryOverlay>
          <template #topbar>
            <ImageGalleryTopbar>
              <template #start>
                <ImageGalleryGridToggle />

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
              </template>

              <template #center>
                <ImageGalleryCounter />
              </template>

              <template #end>
                <ImageGalleryCloseButton />
              </template>
            </ImageGalleryTopbar>
          </template>

          <ImageGalleryStage>
            <template v-if="hasDialogCaptionSlot" #caption="captionProps">
              <slot name="dialog-caption" v-bind="captionProps" />
            </template>
          </ImageGalleryStage>

          <ImageGalleryGrid />
        </ImageGalleryOverlay>
      </slot>
    </Teleport>
  </section>
</template>
