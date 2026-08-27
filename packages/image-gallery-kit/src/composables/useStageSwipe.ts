import { computed, onBeforeUnmount, ref } from 'vue';
import type { ComputedRef } from 'vue';
import { isBrowser, prefersReducedMotion } from '@/utils/environment';

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
 * swallows its own trailing click instead (see swallowClick).
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

interface StageSwipeOptions {
  /* Whether the stage is in a state where a drag may page at all. */
  enabled: ComputedRef<boolean>;
  /*
   * Whether a neighbour exists on each side, which is the same question the
   * arrows answer: past an end with `loop` off the drag rubber-bands instead of
   * revealing a slide that would never be allowed in.
   */
  hasPrevious: ComputedRef<boolean>;
  hasNext: ComputedRef<boolean>;
  goPrevious: () => void;
  goNext: () => void;
}

export function useStageSwipe(options: StageSwipeOptions) {
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

  const isSwiping = computed(() => swipeProgress.value > 0);

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
    if (!isBrowser) {
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
  function reset() {
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

    if (!options.enabled.value) {
      return;
    }

    // A second pointer means pinch-zoom, not a swipe. Abandon the gesture rather
    // than tracking one finger of two and paging on a zoom.
    if (swipePointerId !== null) {
      reset();
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
    reset();

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
        reset();
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
    const hasNeighbor = deltaX < 0 ? options.hasNext.value : options.hasPrevious.value;
    swipeProgress.value = hasNeighbor ? progress : progress * SWIPE_END_RESISTANCE;
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
      (deltaX < 0 ? options.hasNext.value : options.hasPrevious.value);

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
      options.goNext();
    } else {
      options.goPrevious();
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

    if (!isBrowser || typeof window.requestAnimationFrame !== 'function') {
      swipeProgress.value = 0;
      return;
    }

    settleFrom = swipeProgress.value;
    settleStartedAt = 0;
    settleDuration = prefersReducedMotion() ? SWIPE_SETTLE_REDUCED_MS : SWIPE_SETTLE_MS;
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
    if (!isBrowser) {
      return;
    }

    clearSettleHandles();
  }

  /*
   * A drag that happens to end over a control on the stage still produces a click
   * there, which would page a second time on top of the swipe. Capture phase, so
   * it never reaches the control.
   */
  function swallowClick(event: MouseEvent) {
    if (!swipeMoved) {
      return;
    }

    swipeMoved = false;
    event.preventDefault();
    event.stopPropagation();
  }

  onBeforeUnmount(() => {
    if (isBrowser) {
      removeSwipeListeners();
      clearSettleHandles();
    }
  });

  return {
    isSwiping,
    onSwipeStart,
    swallowClick,
    frameTransform,
    frameOpacity,
    slideTransform,
    slideOpacity,
    reset
  };
}
