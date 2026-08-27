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
import { useSharedImageTransition } from '@/composables/useSharedImageTransition';
import type { GalleryImage, GalleryLabels } from '@/types';

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
const bentoFrameRefs = ref<(HTMLElement | null)[]>([]);
const carouselFrameRef = ref<HTMLElement | null>(null);
const carouselStackRef = ref<HTMLElement | null>(null);
const bentoGridRef = ref<HTMLElement | null>(null);
const dialogRef = ref<HTMLElement | null>(null);
const closeButtonRef = ref<HTMLElement | null>(null);
const isBentoEntering = ref(false);
const lastFocusedElement = ref<HTMLElement | null>(null);
const previousBodyOverflow = ref<string | null>(null);
const previousBodyPaddingRight = ref<string | null>(null);
const focusableCache = ref<{ root: HTMLElement; elements: HTMLElement[] } | null>(null);
const gridColumnCount = ref(1);

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
const bentoUniform = ref(false);

const bentoColumns = computed(() => {
  const count = Math.max(1, gridColumnCount.value);
  const columns = Array.from({ length: count }, () => ({ entries: [] as PreviewEntry[], height: 0 }));

  props.images.forEach((image, index) => {
    const shortest = columns.reduce(
      (best, column) => (column.height < best.height ? column : best),
      columns[0]
    );

    shortest.entries.push({ image, actualIndex: index });
    /*
     * A uniform grid renders every tile at one shape, whatever ratio the image
     * itself has -- so the plan has to assume the same, or a column that drew
     * the portraits is planned tall, rendered short, and comes up tiles ragged
     * at the bottom. Constant heights turn shortest-column into round-robin,
     * which is also what puts the reading order back left-to-right.
     */
    shortest.height += bentoUniform.value ? 1 : 1 / getImageRatioNumber(image);
  });

  return columns;
});

/*
 * The packing above needs the column count as a number, and the grid itself is
 * the authority on it: `grid-template-columns` resolves to one entry per track,
 * whoever declared it. Counting those is what lets the tracks be plain CSS, and
 * what makes a `md:grid-cols-6` of the consumer's own authoritative.
 *
 * Split at paren depth zero, because an untouched grid reports its tracks as
 * `minmax(0px, 1fr)` rather than as used pixel widths, and those parentheses
 * contain spaces of their own. Bento mode is only ever reached by a click, so
 * this never has to produce a value during SSR.
 */
function countColumnTracks(value: string) {
  if (!value || value === 'none') {
    return 0;
  }

  let depth = 0;
  let tracks = 0;
  let inTrack = false;

  for (const character of value) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
    }

    if (depth === 0 && /\s/.test(character)) {
      inTrack = false;
    } else if (!inTrack) {
      inTrack = true;
      tracks += 1;
    }
  }

  return tracks;
}

/*
 * Also the hook for anything else a resize can invalidate: a control a media
 * query retires at some width leaves a cached focusable set holding a button
 * that is not rendered any longer.
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

  const tracks = countColumnTracks(getComputedStyle(container).gridTemplateColumns);

  gridColumnCount.value = tracks > 0 ? tracks : 1;
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
 * Keyed by index rather than pushed in render order, because the packing puts
 * image 7 in whichever column was shortest and that changes with the column
 * count. Both sides arrive as refs so a tile that moves column on a resize
 * updates the entry it already owns instead of stranding it.
 */
function registerBentoTile(index: Ref<number>, element: Ref<HTMLElement | null>) {
  watch(
    [index, element],
    ([nextIndex, nextElement], previous) => {
      const previousIndex = previous?.[0];

      if (previousIndex !== undefined && previousIndex !== nextIndex) {
        delete bentoFrameRefs.value[previousIndex];
      }

      bentoFrameRefs.value[nextIndex] = nextElement;
    },
    { immediate: true }
  );
}

function unregisterBentoTile(index: number) {
  delete bentoFrameRefs.value[index];
}

/*
 * The grid's one Tab stop. Every tile is a button, so left to the browser a
 * thousand-image grid is a thousand Tab stops between the toggle and the close
 * button -- Tab has to march through all of them to leave. Roving tabindex is
 * the standard answer: one tile stays in the Tab order and the arrow keys move
 * *which* one, so Tab crosses the grid in a single step while every tile stays
 * reachable.
 */
const bentoFocusIndex = ref(0);

/*
 * The tile above or below, which only the packing can answer: shortest-column
 * packing decides which column an image lands in, so in a two-column grid the
 * vertical neighbour of image 4 may be image 6. Asking bentoColumns keeps the
 * keyboard's idea of "up" identical to what is painted.
 */
function bentoColumnNeighbor(index: number, delta: -1 | 1) {
  for (const column of bentoColumns.value) {
    const position = column.entries.findIndex((entry) => entry.actualIndex === index);

    if (position >= 0) {
      return column.entries[position + delta]?.actualIndex ?? null;
    }
  }

  return null;
}

function moveBentoFocus(event: KeyboardEvent) {
  /*
   * Anchored on the tile the key was pressed in when there is one, not on the
   * roving state: a consumer's recomposed tile keeps its natural tabindex, so
   * focus can legitimately sit on a tile the state never followed.
   */
  const origin = event.target instanceof HTMLElement ? event.target.closest('[data-bento-index]') : null;
  const parsed = origin instanceof HTMLElement ? Number(origin.dataset.bentoIndex) : Number.NaN;
  const from = Number.isInteger(parsed) ? parsed : bentoFocusIndex.value;
  let target: number | null;

  switch (event.key) {
    case 'ArrowRight':
      target = from + 1 < totalImages.value ? from + 1 : null;
      break;
    case 'ArrowLeft':
      target = from - 1 >= 0 ? from - 1 : null;
      break;
    case 'ArrowDown':
      target = bentoColumnNeighbor(from, 1);
      break;
    case 'ArrowUp':
      target = bentoColumnNeighbor(from, -1);
      break;
    case 'Home':
      target = 0;
      break;
    case 'End':
      target = totalImages.value - 1;
      break;
    default:
      return;
  }

  // Claimed even at an edge, where target is null: a handled key must not fall
  // through to scrolling the grid, or the tiles and the scrollport drift apart.
  event.preventDefault();

  if (target === null || target === from) {
    return;
  }

  bentoFocusIndex.value = target;
  bentoFrameRefs.value[target]?.focus();
}

/*
 * Focus follows the view swap. The control that triggered it is gone the
 * moment the mode flips -- the toggle only renders in single mode, a selected
 * tile only in bento -- and focus on a removed element falls to <body>, from
 * where the next Tab escapes the dialog entirely. Landing on the active tile
 * also puts the arrow keys immediately in hand. preventScroll, because
 * revealBentoFrame has already put the tile where the flight needs it.
 */
function focusBentoTile(index: number) {
  bentoFocusIndex.value = clampIndex(index);
  bentoFrameRefs.value[bentoFocusIndex.value]?.focus({ preventScroll: true });
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
      () => revealBentoFrame(currentIndex.value),
      { fromRect: from.rect, fromRadius: from.radius }
    );
    await animateBentoEntrance(() => bentoGridRef.value);
    isBentoEntering.value = false;
    focusBentoTile(currentIndex.value);
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

function goNext() {
  if (!canGoNext.value) {
    return;
  }

  setCurrentIndex((currentIndex.value + 1) % totalImages.value, { emitChange: true });
}

function goPrevious() {
  if (!canGoPrevious.value) {
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
 * How far a drag past an end gets when `loop` is off. There is no neighbour to
 * reveal there, so the drag rubber-bands: enough movement to say "this is the
 * end", and by construction always under the commit threshold -- though the
 * commit itself still checks for the neighbour, so a flick cannot sneak past
 * on velocity alone.
 */
const SWIPE_END_RESISTANCE = 0.15;

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
 * Both follow the arrows exactly -- wrapping when `loop` wraps, and null past
 * an end when it does not, so a stage at the last image parks no slide it
 * would never be allowed to reveal.
 */
const previousImage = computed(() =>
  canSwipe.value && canGoPrevious.value
    ? (props.images[(currentIndex.value - 1 + totalImages.value) % totalImages.value] ?? null)
    : null
);
const nextImage = computed(() =>
  canSwipe.value && canGoNext.value
    ? (props.images[(currentIndex.value + 1) % totalImages.value] ?? null)
    : null
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
 * `calc` so the gap is read from the one place it is declared -- the stack's
 * --ig-internal-slide-gap -- rather than being a number agreed on twice.
 */
function slideOffset(travel: number) {
  const distance = Math.round(travel * 1000) / 1000;

  if (!distance) {
    return '0px';
  }

  return `calc(${distance * 100}% + ${distance} * var(--ig-internal-slide-gap, 5rem))`;
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

  /*
   * Touch only. The question a swipe has to answer is which input is in use, not
   * which device is probably there: a touchscreen laptop at desktop width can
   * swipe, and a mouse at phone width must not drag the page out from under a
   * click. Asking the pointer answers it exactly, and it is why the arrows need
   * no coordinating -- each serves the input it is for, and both stay live.
   */
  if (event.pointerType === 'mouse') {
    return;
  }

  const stage = event.currentTarget instanceof HTMLElement ? event.currentTarget : null;

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
  const progress = Math.min(1, Math.abs(deltaX) / Math.max(1, swipeWidth));
  const neighbor = deltaX < 0 ? nextImage.value : previousImage.value;
  swipeProgress.value = neighbor ? progress : progress * SWIPE_END_RESISTANCE;
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
  const committed =
    swipeAxis === 'horizontal' &&
    (swipeProgress.value >= SWIPE_COMMIT_PROGRESS || flicked) &&
    (deltaX < 0 ? nextImage.value : previousImage.value) !== null;

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
    const from = measureFrame(fromFrame);

    isBentoEntering.value = true;
    dialogMode.value = 'bento';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => revealBentoFrame(currentIndex.value),
        { fromRect: from.rect, fromRadius: from.radius }
      );
      await animateBentoEntrance(() => bentoGridRef.value);
      isBentoEntering.value = false;
      focusBentoTile(currentIndex.value);
    } else {
      isBentoEntering.value = false;
    }
  } else {
    const fromFrame = revealBentoFrame(currentIndex.value);
    const from = measureFrame(fromFrame);

    if (isMounted.value) {
      void animateBentoExit(() => bentoGridRef.value, { activeIndex: currentIndex.value });
    }

    dialogMode.value = 'single';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => carouselFrameRef.value,
        { fromRect: from.rect, fromRadius: from.radius }
      );
      // The tile focus rode on is gone with the grid; same reasoning as
      // focusBentoTile, landing back where the dialog starts.
      focusInitialDialogElement();
    }
  }
}

async function selectBentoImage(index: number) {
  const fromFrame = bentoFrameRefs.value[index] ?? null;
  const from = measureFrame(fromFrame);

  if (isMounted.value) {
    void animateBentoExit(() => bentoGridRef.value, { activeIndex: index });
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
    focusInitialDialogElement();
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

  /*
   * tabindex="-1" excludes an element from every clause, not just the last: a
   * grid tile parked out of the Tab order by the roving tabindex is still a
   * <button>, and a trap whose first-or-last endpoint the browser's own Tab can
   * never reach would let Tab walk straight past the wrap-around and out of the
   * dialog.
   */
  const elements = Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
    )
  ).filter(
    (element) =>
      element.getAttribute('tabindex') !== '-1' &&
      !element.hasAttribute('disabled') &&
      element.getAttribute('aria-hidden') !== 'true' &&
      /*
       * Rendered, not merely present. A control a consumer's media query hides
       * cannot take focus, and a display:none button cannot either -- so a
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
    bentoFocusIndex.value = clampIndex(bentoFocusIndex.value);

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
    registerCloseButton(element) {
      closeButtonRef.value = element.value;

      // The element arrives as a ref because the button mounts after this runs,
      // and the trap reads it much later -- on open, not on registration.
      watch(element, (next) => {
        closeButtonRef.value = next;
      });
    },
    registerRoot(element) {
      dialogRef.value = element.value;

      watch(element, (next) => {
        dialogRef.value = next;
        // The focusable set is cached against the root it was read from, so a
        // new root has to invalidate it rather than wait for a mode change.
        focusableCache.value = null;
      });
    },
    stage: {
      isSwiping,
      onSwipeStart,
      swallowClick: swallowSwipeClick,
      frameTransform,
      frameOpacity,
      slideTransform,
      slideOpacity,
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
      columns: bentoColumns,
      isEntering: isBentoEntering,
      focusIndex: bentoFocusIndex,
      moveFocus: moveBentoFocus,
      setGrid(element) {
        bentoGridRef.value = element;
      },
      registerTile: registerBentoTile,
      unregisterTile: unregisterBentoTile,
      select: selectBentoImage,
      setUniform(value) {
        bentoUniform.value = value;
      }
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
