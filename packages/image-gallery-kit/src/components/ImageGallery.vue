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
const carouselStackRef = ref<HTMLDivElement | null>(null);
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
/*
 * Also the hook for anything else a resize can invalidate: the arrows appear and
 * disappear across the swipe breakpoint, and a cached focusable set from the
 * other side of it would hold a button that is no longer rendered.
 */
function onResize() {
  focusableCache.value = null;
  syncGridColumnCount();
}

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

/*
 * The dialog is a phone-first surface whose only ways forward were an arrow key
 * and a 40px button, so the one gesture every reader actually tries -- dragging
 * the image sideways -- did nothing at all. Pointer events cover touch, pen and
 * mouse in a single path.
 *
 * Deliberately *not* setPointerCapture: capturing retargets the trailing
 * `click` to the capturing element, which would stop any control on the stage
 * from firing. Window listeners give the same "keep tracking after the finger
 * leaves the element" guarantee without touching event targeting, and a drag
 * swallows its own trailing click instead (see swallowSwipeClick).
 */
const SWIPE_AXIS_LOCK_PX = 10;
/*
 * Released past this much of the stage and the turn lands. Distance is only half
 * the rule, though -- a fast, short flick is a page turn too, and one that had to
 * cross a fixed distance would feel stuck. Either answer commits.
 */
const SWIPE_COMMIT_PROGRESS = 0.4;
/*
 * Pixels per millisecond, measured over the end of the drag rather than all of
 * it, so a slow drag finished with a flick counts as a flick. The floor keeps a
 * twitch on a tap from paging: fast is not enough on its own, it has to have gone
 * somewhere.
 */
const SWIPE_FLICK_VELOCITY = 0.4;
const SWIPE_FLICK_MIN_PROGRESS = 0.08;
/*
 * The speed is measured across a window of recent positions rather than smoothed
 * sample by sample. Pointermove spacing is not something a page controls -- a
 * busy main thread coalesces moves into one big jump, and a single jump like that
 * dominates any running average long after the finger has stopped. Over a window
 * it cannot: a drag that ends in a hold reports the hold, because that is what
 * the last hundred milliseconds contain.
 */
const SWIPE_VELOCITY_WINDOW_MS = 120;
/*
 * Below this the window is too short to divide by and says nothing about speed,
 * so it reports none -- which fails the flick test rather than passing it on a
 * rounding error.
 */
const SWIPE_VELOCITY_MIN_SPAN_MS = 4;
/*
 * How much of its own opacity each image gives up at the far end of the turn.
 * A third, not all of it: the movement carries the gesture and the fade is a
 * wash over the top of it, so the pair reads as two images passing rather than
 * one dissolving into the other.
 */
const SWIPE_FADE_DEPTH = 0.35;
/*
 * The snap after release: long enough to read as the images travelling there,
 * short enough not to hold up the next swipe.
 */
const SWIPE_SETTLE_MS = 320;
/*
 * The snap still runs at reduced motion, because it is the gesture arriving
 * rather than an effect over the top of it -- cutting it dead would leave the
 * reader's own drag unfinished. It just gets out of the way quickly.
 */
const SWIPE_SETTLE_REDUCED_MS = 90;
/*
 * requestAnimationFrame is paused in a backgrounded tab, so the snap below can be
 * left part-way through -- the outgoing image half off the stage -- for as long as
 * the reader stays away. The deadline is the floor under it: it finishes the turn
 * outright, which costs nothing on a page nobody is watching. Same reasoning as
 * the deadline on every tween in useSharedImageTransition.
 */
const SWIPE_SETTLE_DEADLINE_MS = SWIPE_SETTLE_MS + 250;

/*
 * One number drives the whole gesture -- how far through the turn it is -- plus
 * which neighbour is coming in. Progress moves the outgoing image out and fades
 * it down while moving the incoming one in and fading it up, in equal and
 * opposite measure, so every state the gesture can be in (dragging, snapping
 * back, finishing a commit) is a value of these two. That symmetry is what lets
 * the commit below hand over mid-gesture without a state machine.
 */
const swipeProgress = ref(0);
const swipeDirection = ref<'previous' | 'next' | null>(null);

/*
 * Plain locals, not refs: nothing renders from them, and a pointermove that
 * touched four refs per frame would queue four re-renders for a value the
 * template never reads.
 */
let swipePointerId: number | null = null;
let swipeStartX = 0;
let swipeStartY = 0;
let swipeAxis: 'undecided' | 'horizontal' = 'undecided';
let swipeWidth = 0;
let swipeMoved = false;
let swipeSamples: { x: number; at: number }[] = [];
let settleFrame: number | null = null;
let settleTimer: number | null = null;
let settleFrom = 0;
let settleStartedAt = 0;
let settleDuration = SWIPE_SETTLE_MS;

const canSwipe = computed(() => dialogMode.value === 'single' && totalImages.value > 1);
const isSwiping = computed(() => swipeProgress.value > 0);

/*
 * The incoming image has to already be decoded when the fade starts, so both
 * neighbours stay mounted rather than appearing on pointerdown -- otherwise the
 * reader dissolves into an empty box while the browser starts the request. At
 * rest they cost nothing but the decode: they are stacked exactly under the
 * frame at opacity 0. On a pointer-less desktop the same two decodes are what
 * makes an arrow click land on a painted image.
 *
 * Both wrap, matching the arrows -- at index 0 the previous image is the last
 * one, which is exactly what paging backwards lands on.
 */
const previousImage = computed(() =>
  canSwipe.value
    ? (props.images[(currentIndex.value - 1 + totalImages.value) % totalImages.value] ?? null)
    : null
);
const nextImage = computed(() =>
  canSwipe.value ? (props.images[(currentIndex.value + 1) % totalImages.value] ?? null) : null
);

/*
 * Which way the pair travels: a swipe toward the next image moves it in from the
 * right, so the outgoing image leaves to the left, and the reverse for previous.
 */
const swipeSign = computed(() => (swipeDirection.value === 'next' ? 1 : -1));

/*
 * A whole image plus the gap between them, so the two are always exactly one
 * slide apart and never overlap: at rest the neighbour is a full width and a gap
 * clear of the frame, off the stage entirely, and it arrives as the frame leaves
 * by the same amount. Expressed in the element's own width rather than the pixels
 * the finger moved, so a mid-drag resize cannot strand a slide off-centre, and in
 * `calc` so the gap stays a theme token instead of a number agreed on twice.
 */
function slideOffset(travel: number) {
  const distance = Math.round(travel * 1000) / 1000;

  if (!distance) {
    return '0px';
  }

  return `calc(${distance * 100}% + ${distance} * var(--ig-dialog-slide-gap, 5rem))`;
}

/*
 * The frame carries the image being left behind: it slides off the way the
 * finger came from, thinning slightly as it goes.
 */
function frameTransform() {
  if (!swipeProgress.value) {
    return undefined;
  }

  return `translateX(${slideOffset(-swipeSign.value * swipeProgress.value)})`;
}

function frameOpacity() {
  return swipeProgress.value ? 1 - SWIPE_FADE_DEPTH * swipeProgress.value : undefined;
}

/*
 * And the neighbour carries the image arriving: the exact mirror of the frame, a
 * slide out at rest and level with it at the end. translateY is repeated from the
 * stylesheet because an inline transform replaces it wholesale.
 */
function slideTransform(side: 'previous' | 'next') {
  if (swipeDirection.value !== side || !swipeProgress.value) {
    return undefined;
  }

  return `translate(${slideOffset(swipeSign.value * (1 - swipeProgress.value))}, -50%)`;
}

function slideOpacity(side: 'previous' | 'next') {
  if (swipeDirection.value !== side || !swipeProgress.value) {
    return undefined;
  }

  return 1 - SWIPE_FADE_DEPTH * (1 - swipeProgress.value);
}

/*
 * Asked of the stylesheet rather than of a breakpoint hardcoded here, the same
 * handoff the grid uses for its column count: the media query owns the decision
 * and this reads the answer back. That keeps one rule responsible for both
 * halves of it -- hiding the arrows and arming the gesture -- so the two can
 * never disagree, and lets a theme move the line or arm the gesture at every
 * width without the component knowing.
 *
 * Read per gesture rather than watched, which costs one style resolution on
 * pointerdown and is always current. An absent value means yes: swipe is the
 * default, and the stylesheet opts *out* of it where the arrows are shown.
 */
function swipeEnabledFor(stage: HTMLElement | null) {
  if (!stage || typeof window === 'undefined') {
    return false;
  }

  return getComputedStyle(stage).getPropertyValue('--ig-dialog-swipe').trim() !== '0';
}

function addSwipeListeners() {
  window.addEventListener('pointermove', onSwipeMove, { passive: false });
  window.addEventListener('pointerup', onSwipeEnd);
  window.addEventListener('pointercancel', onSwipeCancel);
}

function removeSwipeListeners() {
  if (typeof window === 'undefined') {
    return;
  }

  window.removeEventListener('pointermove', onSwipeMove);
  window.removeEventListener('pointerup', onSwipeEnd);
  window.removeEventListener('pointercancel', onSwipeCancel);
}

/*
 * Stops tracking without touching the turn itself, so the caller decides what
 * becomes of it: snapped back, snapped in, or dropped where it stands.
 */
function endSwipeTracking() {
  removeSwipeListeners();
  swipePointerId = null;
  swipeAxis = 'undecided';
}

/*
 * `swipeDirection` deliberately survives this. A snap-back still has to carry the
 * neighbour it revealed back out, and clearing the direction would blank it in
 * one frame instead. At progress 0 a stale direction shows nothing.
 */
function resetSwipe() {
  endSwipeTracking();
  cancelSettle();
  swipeProgress.value = 0;
}

function onSwipeStart(event: PointerEvent) {
  /*
   * Before any of the bail-outs below, because the click this suppresses is only
   * ever the compatibility one a drag leaves behind -- and that arrives before
   * any further pointer touches the stage. A touch drag often produces no click
   * at all, so a flag left standing would be spent on whatever the reader
   * pressed next instead: they would swipe, tap an arrow, and watch the tap do
   * nothing. Their own press clears it.
   */
  swipeMoved = false;

  if (!canSwipe.value) {
    return;
  }

  // A second pointer means pinch-zoom, not a swipe. Abandon the gesture rather
  // than tracking one finger of two and paging on a zoom.
  if (swipePointerId !== null) {
    resetSwipe();
    return;
  }

  if (event.pointerType === 'mouse' && event.button !== 0) {
    return;
  }

  const stage = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

  if (!swipeEnabledFor(stage)) {
    return;
  }

  // A drag that starts during the snap of the previous one takes it over: the
  // snap stops where it is and this drag decides from there.
  resetSwipe();

  swipeWidth = stage?.getBoundingClientRect().width || window.innerWidth;
  swipePointerId = event.pointerId;
  swipeStartX = event.clientX;
  swipeStartY = event.clientY;
  swipeAxis = 'undecided';
  swipeSamples = [{ x: event.clientX, at: event.timeStamp }];

  addSwipeListeners();
}

function onSwipeMove(event: PointerEvent) {
  if (swipePointerId === null || event.pointerId !== swipePointerId) {
    return;
  }

  const deltaX = event.clientX - swipeStartX;
  const deltaY = event.clientY - swipeStartY;

  if (swipeAxis === 'undecided') {
    if (Math.abs(deltaX) < SWIPE_AXIS_LOCK_PX && Math.abs(deltaY) < SWIPE_AXIS_LOCK_PX) {
      return;
    }

    /*
     * Vertical wins ties and is never claimed: whatever the host puts in the
     * dialog -- a long caption, its own toolbar -- has to keep scrolling, and a
     * gesture that is not clearly sideways is not a page turn.
     */
    if (Math.abs(deltaY) >= Math.abs(deltaX)) {
      resetSwipe();
      return;
    }

    swipeAxis = 'horizontal';
    swipeMoved = true;
  }

  // touch-action keeps the browser from panning; this is for the mouse, where a
  // drag over the image would otherwise start a native image drag.
  if (event.cancelable) {
    event.preventDefault();
  }

  swipeSamples.push({ x: event.clientX, at: event.timeStamp });

  // Two are always kept, however old, so a drag that pauses and then releases
  // still has a span to measure across rather than none at all.
  while (swipeSamples.length > 2 && event.timeStamp - swipeSamples[0].at > SWIPE_VELOCITY_WINDOW_MS) {
    swipeSamples.shift();
  }

  swipeDirection.value = deltaX < 0 ? 'next' : 'previous';
  // Clamped, so dragging on past the stage cannot turn two pages: one gesture is
  // one image, and the surplus simply holds the turn at fully in.
  swipeProgress.value = Math.min(1, Math.abs(deltaX) / Math.max(1, swipeWidth));
}

/*
 * Which way the finger was going over the last pair of positions. The window
 * velocity below answers *how fast*, but it cannot always answer *which way*:
 * when the main thread coalesces moves, a whole drag and the throw back out of it
 * can land inside one window, and the window then reports the net displacement --
 * leftward for a gesture whose last act was to fling the image back to the right.
 * Requiring the final segment to agree keeps a change of mind from paging.
 */
function recentSwipeSign() {
  if (swipeSamples.length < 2) {
    return 0;
  }

  const last = swipeSamples[swipeSamples.length - 1];
  const previous = swipeSamples[swipeSamples.length - 2];

  return Math.sign(last.x - previous.x);
}

/* Pixels per millisecond across the retained window, signed. */
function swipeVelocityAt(x: number, at: number) {
  const oldest = swipeSamples[0];

  if (!oldest) {
    return 0;
  }

  const span = at - oldest.at;

  if (span < SWIPE_VELOCITY_MIN_SPAN_MS) {
    return 0;
  }

  return (x - oldest.x) / span;
}

function onSwipeEnd(event: PointerEvent) {
  if (swipePointerId === null || event.pointerId !== swipePointerId) {
    return;
  }

  const deltaX = event.clientX - swipeStartX;
  /*
   * A flick only counts in the direction the drag was already going. Otherwise a
   * reader who pulled an image halfway in and then threw it back would page
   * forward on the strength of a gesture that plainly meant no.
   */
  const velocity = swipeVelocityAt(event.clientX, event.timeStamp);
  const flicked =
    Math.abs(velocity) >= SWIPE_FLICK_VELOCITY &&
    Math.sign(velocity) === Math.sign(deltaX) &&
    recentSwipeSign() === Math.sign(deltaX) &&
    swipeProgress.value >= SWIPE_FLICK_MIN_PROGRESS;
  const committed = swipeAxis === 'horizontal' && (swipeProgress.value >= SWIPE_COMMIT_PROGRESS || flicked);

  endSwipeTracking();

  if (!committed) {
    startSettle();
    return;
  }

  /*
   * Snapping in without a timer, by re-anchoring the turn. Paging forward makes
   * the image that was leaving the *previous* neighbour and the one that was
   * arriving the frame -- and because the two roles are exact mirrors, running
   * the progress backwards from `1 - progress` leaves both images on the pixels
   * and the opacity they already had. From there the settle to 0 finishes the
   * movement the finger started, as a plain transition on a value nothing else
   * owns. A timer-and-swap would have to be cancelled and unwound by the next
   * pointerdown; there is nothing here to unwind.
   */
  const remaining = 1 - swipeProgress.value;
  const goingNext = deltaX < 0;

  if (goingNext) {
    goNext();
  } else {
    goPrevious();
  }

  swipeDirection.value = goingNext ? 'previous' : 'next';
  swipeProgress.value = remaining;

  startSettle();
}

function onSwipeCancel(event: PointerEvent) {
  if (swipePointerId === null || event.pointerId !== swipePointerId) {
    return;
  }

  endSwipeTracking();
  startSettle();
}

function clearSettleHandles() {
  if (settleFrame !== null) {
    window.cancelAnimationFrame(settleFrame);
    settleFrame = null;
  }

  if (settleTimer !== null) {
    window.clearTimeout(settleTimer);
    settleTimer = null;
  }
}

function easeOut(ratio: number) {
  return 1 - (1 - ratio) ** 3;
}

/*
 * The snap is driven here rather than handed to a CSS transition, because the
 * transition could not be relied on to run. A transition only starts if the
 * property was already transitionable in the style the browser last resolved --
 * and the moment the snap begins is exactly the moment the drag stops being
 * direct, so arming the transition and moving the value are the same update. The
 * browser then sees a new transition and a new value together and honours
 * neither, except when a style resolution happens to land between the two, which
 * is what made it snap into place sometimes and jump the rest of the time.
 *
 * Driving it removes the ordering question altogether: the same one value the
 * finger was writing keeps being written, just by a clock instead. It also means
 * the drag and the snap animate through identical code, so they cannot disagree.
 */
function startSettle() {
  cancelSettle();

  if (!swipeProgress.value) {
    return;
  }

  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    swipeProgress.value = 0;
    return;
  }

  settleFrom = swipeProgress.value;
  settleStartedAt = 0;
  settleDuration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? SWIPE_SETTLE_REDUCED_MS
    : SWIPE_SETTLE_MS;
  settleFrame = window.requestAnimationFrame(stepSettle);
  settleTimer = window.setTimeout(() => {
    settleTimer = null;
    cancelSettle();
    swipeProgress.value = 0;
  }, SWIPE_SETTLE_DEADLINE_MS);
}

function stepSettle(now: number) {
  // Stamped from the first frame's own timestamp rather than from the release, so
  // a frame the browser was late to deliver does not eat the start of the snap.
  if (!settleStartedAt) {
    settleStartedAt = now;
  }

  const ratio = Math.min(1, (now - settleStartedAt) / settleDuration);

  swipeProgress.value = settleFrom * (1 - easeOut(ratio));

  if (ratio < 1) {
    settleFrame = window.requestAnimationFrame(stepSettle);
    return;
  }

  settleFrame = null;
  clearSettleHandles();
  swipeProgress.value = 0;
}

function cancelSettle() {
  if (typeof window === 'undefined') {
    return;
  }

  clearSettleHandles();
}

/*
 * A drag that happens to end over a control on the stage still produces a click
 * there, which would page a second time on top of the swipe. Capture phase, so
 * it never reaches the control.
 */
function swallowSwipeClick(event: MouseEvent) {
  if (!swipeMoved) {
    return;
  }

  swipeMoved = false;
  event.preventDefault();
  event.stopPropagation();
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
  ).filter(
    (element) =>
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      /*
       * Rendered, not merely present. The arrows are retired by a media query on
       * narrow viewports, and a display:none button cannot take focus -- so a
       * trap that kept it in the cycle would try to focus nothing, leave the
       * browser to carry on past the dialog, and let Tab escape it entirely.
       * Client rects rather than offsetParent because a `position: fixed`
       * control -- which a consumer's toolbar slot may well be -- reports no
       * offsetParent while being perfectly visible and focusable.
       */
      element.getClientRects().length > 0
  );

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
  window.addEventListener('resize', onResize);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown);
    window.removeEventListener('resize', onResize);
    removeSwipeListeners();
    clearSettleHandles();
  }

  unlockBodyScroll();
});

watch([dialogMode, dialogIsVisible], async () => {
  focusableCache.value = null;
  // Leaving single mode (or closing) mid-drag would otherwise keep the offset,
  // and the stage would come back nudged sideways.
  resetSwipe();

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
            <!--
              The swipe surface is the whole stage, not just the image: on a
              phone the image is letterboxed inside it, and a gesture that only
              counted when it started on the pixels of the photo would miss half
              the thumb drags aimed at it.
            -->
            <div
              v-if="dialogMode === 'single'"
              class="image-gallery-stage flex h-full items-center justify-center"
              :data-ig-swiping="isSwiping ? 'true' : 'false'"
              @pointerdown="onSwipeStart"
              @click.capture="swallowSwipeClick"
            >
              <button
                type="button"
                class="image-gallery-stage-arrow absolute left-4 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ig-dialog-button)] text-[var(--ig-dialog-text)] transition hover:bg-[var(--ig-dialog-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]"
                :aria-label="resolvedLabels.previous"
                @click="goPrevious"
              >
                <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                  <path d="m14.5 5.5-6 6 6 6" />
                </svg>
              </button>

              <div class="flex h-full w-full flex-col items-center justify-center px-10 py-6 sm:px-20">
                <!--
                  One image is visible at a time; the neighbours are stacked
                  underneath the frame on the same centre, not offset beside it,
                  because the gesture dissolves between them rather than sliding.
                  They come after the frame in the DOM so the image fading in is
                  always the one on top, whichever way the drag went. The frame
                  is still the element in flow, so it alone sizes the stack, and
                  it keeps the transition's identity -- it is what
                  animateBetween flies into and out of.
                -->
                <div
                  ref="carouselStackRef"
                  class="image-gallery-stage-stack relative"
                  :style="{ width: 'min(100%, 56rem)' }"
                >
                  <div
                    ref="carouselFrameRef"
                    class="image-gallery-stage-frame relative overflow-hidden rounded-[var(--ig-dialog-radius)]"
                    :style="{
                      aspectRatio: getImageAspectRatio(activeImage, '4 / 5'),
                      width: '100%',
                      maxHeight: 'calc(100vh - (2 * var(--ig-dialog-topbar-height, 4rem)) - 4rem)',
                      transform: frameTransform(),
                      opacity: frameOpacity()
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
                      draggable="false"
                      class="image-gallery-image absolute inset-0 block h-full w-full rounded-[var(--ig-dialog-radius)]"
                    />
                  </div>

                  <div
                    v-if="previousImage"
                    class="image-gallery-stage-slide"
                    data-ig-slide="previous"
                    aria-hidden="true"
                    :style="{
                      aspectRatio: getImageAspectRatio(previousImage, '4 / 5'),
                      maxHeight: 'calc(100vh - (2 * var(--ig-dialog-topbar-height, 4rem)) - 4rem)',
                      transform: slideTransform('previous'),
                      opacity: slideOpacity('previous')
                    }"
                  >
                    <img
                      :src="previousImage.src"
                      alt=""
                      :srcset="previousImage.srcset"
                      :sizes="previousImage.sizes"
                      :decoding="previousImage.decoding"
                      draggable="false"
                      class="image-gallery-image absolute inset-0 block h-full w-full rounded-[var(--ig-dialog-radius)]"
                    />
                  </div>

                  <div
                    v-if="nextImage"
                    class="image-gallery-stage-slide"
                    data-ig-slide="next"
                    aria-hidden="true"
                    :style="{
                      aspectRatio: getImageAspectRatio(nextImage, '4 / 5'),
                      maxHeight: 'calc(100vh - (2 * var(--ig-dialog-topbar-height, 4rem)) - 4rem)',
                      transform: slideTransform('next'),
                      opacity: slideOpacity('next')
                    }"
                  >
                    <img
                      :src="nextImage.src"
                      alt=""
                      :srcset="nextImage.srcset"
                      :sizes="nextImage.sizes"
                      :decoding="nextImage.decoding"
                      draggable="false"
                      class="image-gallery-image absolute inset-0 block h-full w-full rounded-[var(--ig-dialog-radius)]"
                    />
                  </div>
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
                class="image-gallery-stage-arrow absolute right-4 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ig-dialog-button)] text-[var(--ig-dialog-text)] transition hover:bg-[var(--ig-dialog-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-dialog-ring)]"
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
