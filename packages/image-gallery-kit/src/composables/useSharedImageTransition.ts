import { nextTick } from 'vue';

type ElementGetter = () => HTMLElement | null;

interface TransitionOptions {
  duration?: number;
  ease?: string;
  fromRect?: DOMRect | null;
  fromRadius?: string | null;
}

interface BentoExitOptions {
  activeIndex?: number;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

/*
 * requestAnimationFrame is paused while a tab is backgrounded, so a GSAP tween
 * started just before a tab switch never ticks and its onComplete never fires.
 * Racing every tween against a deadline guarantees the cleanup that restores
 * element visibility and removes flying clones still runs.
 */
function withDeadline(run: (done: () => void) => void, maxMs: number) {
  return new Promise<void>((resolve) => {
    let settled = false;
    const done = () => {
      if (settled) {
        return;
      }

      settled = true;
      window.clearTimeout(timer);
      resolve();
    };

    const timer = window.setTimeout(done, maxMs);
    run(done);
  });
}

function prefersReducedMotion() {
  return isBrowser && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/*
 * The all-images grid renders every image, so a collection of a few thousand
 * puts a few thousand tiles in the DOM. Animating all of them is wasted work at
 * best: the ones outside the scrollport are never seen moving, and cloning them
 * (see animateBentoExit) is what turns a click into a multi-second main-thread
 * stall. The margin keeps a band of just-off-screen tiles animating so a scroll
 * arriving mid-transition does not reveal a row that never moved.
 */
const VIEWPORT_MARGIN = 200;
const STAGGER_EACH = 0.04;
const STAGGER_MAX_TOTAL = 0.4;

function intersectsViewport(rect: DOMRect) {
  if (!rect.width || !rect.height) {
    return false;
  }

  return (
    rect.bottom > -VIEWPORT_MARGIN &&
    rect.top < window.innerHeight + VIEWPORT_MARGIN &&
    rect.right > -VIEWPORT_MARGIN &&
    rect.left < window.innerWidth + VIEWPORT_MARGIN
  );
}

/*
 * Measure every candidate before touching the DOM. Interleaving a rect read
 * with a clone-and-append per item forces a synchronous layout on each
 * iteration; batching the reads pays for one layout and serves the rest from
 * it, which is the difference that makes the filter worth doing at all.
 */
function measureVisible(items: HTMLElement[]) {
  return items
    .map((item) => ({ item, rect: item.getBoundingClientRect() }))
    .filter(({ rect }) => intersectsViewport(rect));
}

/*
 * The one child of a tile the flight is actually about. A tile is the
 * consumer's element and may carry a badge, a caption or the overflow trigger
 * in its slot; those belong to the grid it was clicked in, not to the image in
 * flight, so the clone keeps this child and drops the rest.
 */
const TILE_FRAME = '[data-ig-tile-frame="true"]';

/*
 * Marks a clone as one. aria-hidden does not identify them, because the
 * carousel's own neighbour slides carry it too, and neither does position: a
 * clone sits inside the flight layer rather than directly under <body>.
 */
const FLIGHT_CLONE = 'data-ig-flight';

export function useSharedImageTransition() {
  /*
   * A clone has to leave its tile to fly -- it is positioned against the
   * viewport, so it cannot stay inside a scrolling grid -- and leaving costs it
   * the scoped reset that gives it its box model and strips the UA's button
   * styling. Dropped straight at <body> it lands outside that reset.
   *
   * Hence a layer rather than a parent: one container, held at <body> where no
   * framework will patch it, wearing the reset class when the flight's source
   * had it. The clone goes inside and resolves as it did in place. A fixed
   * parent with no transform is not a containing block for its fixed children,
   * so the clones stay viewport-positioned either way.
   *
   * The reset is the only thing that has to travel. The dialog paints in system
   * colours, which resolve anywhere, so there is no palette to carry with it.
   */
  let flightLayerElement: HTMLElement | null = null;

  function flightLayer(...candidates: (HTMLElement | null)[]) {
    if (!flightLayerElement || !document.body.contains(flightLayerElement)) {
      flightLayerElement = document.createElement('div');
      flightLayerElement.setAttribute('aria-hidden', 'true');
      flightLayerElement.setAttribute('data-ig-flight-layer', 'true');
      flightLayerElement.style.cssText =
        'position:fixed;inset:0;pointer-events:none;z-index:9999;border-radius:0';
      document.body.appendChild(flightLayerElement);
    }

    /*
     * Read off whichever end of the flight is still in the document. The source
     * is preferred -- it is what the clone must match -- but by the time a
     * bento tile is cloned the mode swap has already detached it, and a
     * detached element can see none of its ancestors.
     */
    const context = candidates.find((element) => element && document.contains(element)) ?? null;

    flightLayerElement.className = context?.closest('.image-gallery-theme') ? 'image-gallery-theme' : '';

    return flightLayerElement;
  }

  // Nothing in flight, nothing to keep in the host's DOM.
  function releaseFlightLayer() {
    if (flightLayerElement && !flightLayerElement.childElementCount) {
      flightLayerElement.remove();
      flightLayerElement = null;
    }
  }

  /*
   * Read the radius the element actually has rather than any value the caller
   * thinks it should have. The two ends of the flight get their corners from
   * different places entirely -- a preview tile from whatever class the consumer
   * put on it, a grid tile from its own -- and neither is knowable from here.
   * Computed style resolves both, and in px,
   * which is what gsap needs to tween the corner instead of snapping it.
   *
   * The element measured need not be the element rounded, either. A tile whose
   * own corners are square may still look rounded because something above it
   * clips them -- a consumer's rounded, overflow-hidden card around the tile.
   * So climb while an ancestor both clips and shares the element's box: that
   * ancestor's radius is the one actually on screen.
   */
  function isRounded(radius: string) {
    return (radius.match(/[\d.]+/g) ?? []).some((value) => Number.parseFloat(value) > 0);
  }

  /*
   * Either axis is enough: CSS forces the other to `auto` when the two
   * disagree, so a box with one non-visible axis clips both. The shorthand is
   * read alongside them because it is the only one of the three a stylesheet is
   * guaranteed to have expanded everywhere this runs.
   */
  function clipsContents(style: CSSStyleDeclaration) {
    return [style.overflow, style.overflowX, style.overflowY].some(
      (value) => value !== '' && value !== 'visible'
    );
  }

  // A subpixel of slack: an inset-0 frame and its button can land a hair apart
  // after layout rounding, and that must not read as a different box.
  const BOX_MATCH_TOLERANCE = 1;

  function sharesBox(inner: DOMRect, outer: DOMRect) {
    return (
      Math.abs(inner.left - outer.left) <= BOX_MATCH_TOLERANCE &&
      Math.abs(inner.top - outer.top) <= BOX_MATCH_TOLERANCE &&
      Math.abs(inner.right - outer.right) <= BOX_MATCH_TOLERANCE &&
      Math.abs(inner.bottom - outer.bottom) <= BOX_MATCH_TOLERANCE
    );
  }

  function getTransitionRadius(element: HTMLElement) {
    let current: HTMLElement | null = element;
    let rect = element.getBoundingClientRect();

    while (current) {
      const radius = getComputedStyle(current).borderRadius;

      if (isRounded(radius)) {
        return radius;
      }

      const parent: HTMLElement | null = current.parentElement;

      if (!parent) {
        break;
      }

      const parentRect = parent.getBoundingClientRect();

      if (!clipsContents(getComputedStyle(parent)) || !sharesBox(rect, parentRect)) {
        break;
      }

      current = parent;
      rect = parentRect;
    }

    return '0px';
  }

  function createFlyingClone(source: HTMLElement, radius?: string | null) {
    /*
     * A deep clone of the consumer's own element, which is what makes its
     * appearance travel: radius, border, shadow, background and ring all come
     * from its class list, and cloneNode carries that list along. Nothing below
     * copies them property by property -- only values the flight itself moves,
     * or that cannot survive the move, are touched.
     */
    const clone = source.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.setAttribute(FLIGHT_CLONE, 'true');
    clone.style.margin = '0';
    clone.style.transformOrigin = 'center center';
    clone.style.overflow = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';

    /*
     * A tile is a <button>, so a clone of one is a real tab stop in the host
     * page for as long as it flies -- and a decoration must never take focus.
     * aria-hidden keeps it out of the dialog trap's own query; inert is what
     * keeps it out of the browser's.
     */
    clone.inert = true;
    clone.tabIndex = -1;

    // A transition declared on the consumer's markup would fight the tween over
    // the very properties the flight moves.
    clone.style.transition = 'none';

    clone.style.borderRadius = radius ?? getTransitionRadius(source);

    const sourceDescendants = source.querySelectorAll<HTMLElement>('*');
    const cloneDescendants = clone.querySelectorAll<HTMLElement>('*');

    // Paired by index, so it has to run while the two subtrees still match --
    // before the slot content is stripped below.
    cloneDescendants.forEach((element, index) => {
      const sourceElement = sourceDescendants[index];
      if (!sourceElement) {
        return;
      }

      element.style.transition = 'none';
      element.style.overflow = getComputedStyle(sourceElement).overflow;
    });

    const children = Array.from(clone.children);
    const frame = children.find((child) => child.matches(TILE_FRAME));

    if (frame) {
      children.forEach((child) => {
        if (child !== frame) {
          child.remove();
        }
      });
    }

    return clone;
  }

  /*
   * A shadow that is present but invisible: the same layer count and structure,
   * every length collapsed and every colour taken to zero alpha. gsap
   * interpolates box-shadow by walking the numbers in the two strings, and
   * `none` gives it nothing to walk -- so a shadow that has to appear or
   * disappear over the flight needs a numerically-shaped counterpart at the
   * other end rather than the keyword.
   */
  function fadedShadow(value: string) {
    return value
      .replace(/rgba?\(([^)]+)\)/g, (_match, channels: string) => {
        const [red, green, blue] = channels.split(',');
        return `rgba(${red},${green},${blue},0)`;
      })
      .replace(/-?[\d.]+px/g, '0px');
  }

  const NO_SHADOW = ['', 'none'];
  const NO_BORDER = ['', 'none', 'hidden'];

  /*
   * What the border actually draws, not what it claims. A border whose style is
   * `none` paints nothing however wide it says it is -- and an element that was
   * never given a border reports the initial `medium` rather than zero, which
   * would otherwise read as a border to tween away from.
   */
  function drawnBorderWidth(width: string, borderStyle: string) {
    if (NO_BORDER.includes(borderStyle)) {
      return '0px';
    }

    const parsed = Number.parseFloat(width);

    return Number.isFinite(parsed) ? `${parsed}px` : '0px';
  }

  /*
   * The two ends of a flight rarely wear the same decoration: a preview tile
   * carries whatever border, shadow and background the consumer gave it, and
   * the dialog's stage carries none of them. Tweening the difference is what
   * stops a border from holding at full width for the whole flight and then
   * vanishing with the swap at the end -- it fades out on the way instead.
   *
   * Both ends are pinned explicitly rather than left for gsap to read off the
   * clone, because the value it would read is the nominal one.
   */
  function decorationTween(clone: HTMLElement, toEl: HTMLElement) {
    const from = getComputedStyle(clone);
    const to = getComputedStyle(toEl);
    const tween: Record<string, string> = {};

    (
      [
        ['borderTopWidth', 'borderTopStyle'],
        ['borderRightWidth', 'borderRightStyle'],
        ['borderBottomWidth', 'borderBottomStyle'],
        ['borderLeftWidth', 'borderLeftStyle']
      ] as const
    ).forEach(([widthKey, styleKey]) => {
      const start = drawnBorderWidth(from[widthKey], from[styleKey]);
      const end = drawnBorderWidth(to[widthKey], to[styleKey]);

      if (start === end) {
        return;
      }

      clone.style[widthKey] = start;
      tween[widthKey] = end;
    });

    if (from.backgroundColor !== to.backgroundColor) {
      tween.backgroundColor = to.backgroundColor;
    }

    const fromShadow = NO_SHADOW.includes(from.boxShadow) ? 'none' : from.boxShadow;
    const toShadow = NO_SHADOW.includes(to.boxShadow) ? 'none' : to.boxShadow;

    if (fromShadow !== toShadow) {
      if (toShadow === 'none') {
        tween.boxShadow = fadedShadow(fromShadow);
      } else if (fromShadow === 'none') {
        // Nothing to interpolate from, so give the clone a collapsed version of
        // where it is going and let the tween open it up.
        clone.style.boxShadow = fadedShadow(toShadow);
        tween.boxShadow = toShadow;
      } else {
        tween.boxShadow = toShadow;
      }
    }

    return tween;
  }

  /*
   * Where the picture actually lands inside its box. `object-fit` decides that,
   * and it is a discrete property -- there is no halfway between `cover` and
   * `contain` for a browser to interpolate. So a flight between two ends that
   * crop differently cannot be carried by object-fit at all: the box tweens
   * while the picture inside it jumps at the swap, which is the one thing a
   * shared-element transition exists to avoid.
   *
   * Computing the painted rect at either end turns that back into geometry,
   * which does interpolate. Centred, because `object-position` defaults to
   * 50% 50% and a flight is not the place to second-guess a consumer who moved
   * it -- the ends still match, only the path through would differ.
   */
  function paintedBox(naturalWidth: number, naturalHeight: number, box: DOMRect, fit: string) {
    const scale =
      fit === 'contain' || fit === 'scale-down'
        ? Math.min(box.width / naturalWidth, box.height / naturalHeight)
        : Math.max(box.width / naturalWidth, box.height / naturalHeight);

    const width = naturalWidth * scale;
    const height = naturalHeight * scale;

    return {
      left: box.left + (box.width - width) / 2,
      top: box.top + (box.height - height) / 2,
      width,
      height
    };
  }

  /*
   * Pins the clone's image to the picture its source was painting, and returns
   * where that picture has to arrive. `fill` because the box is now doing the
   * fitting; the max-width/height reset is there because the package's own
   * unlayered geometry would otherwise clamp it.
   *
   * Both ends are measured off live elements rather than derived from the boxes,
   * so a border or padding on either tile is already accounted for. The natural
   * size comes from the source, which is on screen and therefore decoded -- the
   * destination's copy of the same image may not be yet.
   */
  function pinPicture(source: HTMLElement, clone: HTMLElement, toEl: HTMLElement, fromRect: DOMRect) {
    const sourceImage = source.querySelector('img');
    const cloneImage = clone.querySelector<HTMLElement>('img');
    const targetImage = toEl.querySelector('img');

    if (!sourceImage || !cloneImage || !targetImage || !sourceImage.naturalWidth) {
      return null;
    }

    const natural = { width: sourceImage.naturalWidth, height: sourceImage.naturalHeight };
    const from = paintedBox(
      natural.width,
      natural.height,
      sourceImage.getBoundingClientRect(),
      getComputedStyle(sourceImage).objectFit
    );
    const to = paintedBox(
      natural.width,
      natural.height,
      targetImage.getBoundingClientRect(),
      getComputedStyle(targetImage).objectFit
    );

    if (!from.width || !from.height || !to.width || !to.height) {
      return null;
    }

    cloneImage.style.position = 'absolute';
    cloneImage.style.objectFit = 'fill';
    cloneImage.style.maxWidth = 'none';
    cloneImage.style.maxHeight = 'none';
    cloneImage.style.inset = 'auto';
    cloneImage.style.left = `${from.left - fromRect.left}px`;
    cloneImage.style.top = `${from.top - fromRect.top}px`;
    cloneImage.style.width = `${from.width}px`;
    cloneImage.style.height = `${from.height}px`;

    return { element: cloneImage, to };
  }

  async function waitForPaint() {
    await nextTick();

    if (!isBrowser) {
      return;
    }

    // Same deadline treatment as the tweens: rAF is paused in a backgrounded
    // tab, so a bare requestAnimationFrame promise never settles and would
    // strand the caller before it even reaches the animation.
    await withDeadline((done) => {
      window.requestAnimationFrame(() => done());
    }, 250);
  }

  async function animateBetween(
    fromGetter: ElementGetter,
    toGetter: ElementGetter,
    options: TransitionOptions = {}
  ) {
    if (!isBrowser || prefersReducedMotion()) {
      return;
    }

    await waitForPaint();

    const fromEl = fromGetter();
    const toEl = toGetter();

    if (!fromEl || !toEl) {
      return;
    }

    const fromRect = options.fromRect ?? fromEl.getBoundingClientRect();
    const toRect = toEl.getBoundingClientRect();

    if (!fromRect.width || !fromRect.height || !toRect.width || !toRect.height) {
      return;
    }

    const clone = createFlyingClone(fromEl, options.fromRadius);
    clone.style.position = 'fixed';
    clone.style.left = `${fromRect.left}px`;
    clone.style.top = `${fromRect.top}px`;
    clone.style.width = `${fromRect.width}px`;
    clone.style.height = `${fromRect.height}px`;

    const picture = pinPicture(fromEl, clone, toEl, fromRect);

    const previousFromVisibility = fromEl.style.visibility;
    const previousToVisibility = toEl.style.visibility;

    fromEl.style.visibility = 'hidden';
    toEl.style.visibility = 'hidden';
    flightLayer(fromEl, toEl).appendChild(clone);

    try {
      const { gsap } = await import('gsap');

      const duration = options.duration ?? 0.48;

      await withDeadline(
        (done) => {
          const ease = options.ease ?? 'power3.inOut';

          /*
           * The picture rides the same duration and ease as its frame, so the
           * two stay in step: the box crops progressively while the picture
           * scales into it, and neither end has anything left to snap to.
           */
          if (picture) {
            gsap.to(picture.element, {
              left: picture.to.left - toRect.left,
              top: picture.to.top - toRect.top,
              width: picture.to.width,
              height: picture.to.height,
              duration,
              ease
            });
          }

          gsap.to(clone, {
            left: toRect.left,
            top: toRect.top,
            width: toRect.width,
            height: toRect.height,
            borderRadius: getTransitionRadius(toEl),
            ...decorationTween(clone, toEl),
            duration,
            ease,
            onComplete: done
          });
        },
        duration * 1000 + 400
      );
    } catch {
      // If GSAP is unavailable, the state change still succeeds without animation.
    } finally {
      clone.remove();
      releaseFlightLayer();
      fromEl.style.visibility = previousFromVisibility;
      toEl.style.visibility = previousToVisibility;
    }
  }

  async function animateBentoEntrance(containerGetter: ElementGetter) {
    if (!isBrowser) {
      return;
    }

    // The hidden state is class-driven by isBentoEntering, which the caller
    // clears straight after this resolves, so returning early reveals the tiles.
    if (prefersReducedMotion()) {
      return;
    }

    await waitForPaint();

    const container = containerGetter();
    if (!container) {
      return;
    }

    const candidates = Array.from(
      container.querySelectorAll<HTMLElement>('[data-bento-item="true"]:not([data-bento-active="true"])')
    );

    // Tiles below the fold stay at their class-driven hidden state until the
    // caller clears isBentoEntering, which happens as soon as this resolves.
    const items = measureVisible(candidates).map(({ item }) => item);
    if (!items.length) {
      return;
    }

    try {
      const { gsap } = await import('gsap');

      /*
       * A per-item stagger has to be capped, not just applied to fewer items: at
       * 0.04s each, 1000 tiles spread the reveal over 40 seconds and this
       * promise -- which the caller awaits before clearing isBentoEntering --
       * resolves 40 seconds after the grid opened. Spreading a fixed budget
       * keeps the cascade legible at ten tiles and bounded at a thousand.
       */
      const duration = 0.34;
      // Spread is measured across the gaps between tiles, not the tiles
      // themselves, so a small collection keeps exactly the uncapped per-tile 0.04s.
      const gaps = items.length - 1;
      const staggerTotal = Math.min(gaps * STAGGER_EACH, STAGGER_MAX_TOTAL);

      await withDeadline(
        (done) => {
          gsap.to(items, {
            opacity: 1,
            y: 0,
            scale: 1,
            duration,
            ease: 'power2.out',
            stagger: gaps > 0 ? staggerTotal / gaps : 0,
            onComplete: done
          });
        },
        (duration + staggerTotal) * 1000 + 400
      );
    } catch {
      // No-op fallback when GSAP is unavailable.
    }
  }

  async function animateBentoExit(containerGetter: ElementGetter, options: BentoExitOptions = {}) {
    if (!isBrowser || prefersReducedMotion()) {
      return;
    }

    const container = containerGetter();
    if (!container) {
      return;
    }

    const candidates = Array.from(container.querySelectorAll<HTMLElement>('[data-bento-item="true"]')).filter(
      (item) => item.dataset.bentoIndex !== `${options.activeIndex ?? ''}`
    );

    if (!candidates.length) {
      return;
    }

    /*
     * Every clone is a deep copy carrying its own <img>, and building one reads
     * computed style off each descendant of the source. Doing that for a whole
     * collection means thousands of style reads and thousands of extra images
     * entering the document, all synchronously, on a single tile click. Only
     * tiles the user can actually watch fade out are worth that cost.
     */
    const host = flightLayer(container);

    const clones = measureVisible(candidates).map(({ item, rect }) => {
      const clone = createFlyingClone(item);
      clone.style.position = 'fixed';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.zIndex = '9998';
      clone.style.opacity = '1';
      host.appendChild(clone);
      return clone;
    });

    if (!clones.length) {
      return;
    }

    try {
      const { gsap } = await import('gsap');

      void withDeadline((done) => {
        gsap.to(clones, {
          opacity: 0,
          y: -8,
          scale: 0.985,
          duration: 0.2,
          ease: 'power2.in',
          onComplete: done
        });
      }, 600).then(() => {
        clones.forEach((clone) => clone.remove());
        releaseFlightLayer();
      });
    } catch {
      clones.forEach((clone) => clone.remove());
      releaseFlightLayer();
    }
  }

  return {
    animateBetween,
    animateBentoEntrance,
    animateBentoExit,
    measureTransitionRadius: getTransitionRadius
  };
}
