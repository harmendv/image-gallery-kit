import { nextTick } from 'vue';

type ElementGetter = () => HTMLElement | null;

interface TransitionOptions {
  duration?: number;
  ease?: string;
  fromRect?: DOMRect | null;
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

export function useSharedImageTransition() {
  /*
   * Read the radius the element actually has rather than any value the caller
   * thinks it should have. The two ends of the flight get their corners from
   * different places entirely -- a preview tile from whatever class the consumer
   * put on it, an all-images grid tile from --ig-dialog-grid-tile-radius -- and
   * neither is knowable from here. Computed style resolves both, and in px,
   * which is what gsap needs to tween the corner instead of snapping it.
   */
  function getTransitionRadius(element: HTMLElement) {
    return getComputedStyle(element).borderRadius;
  }

  /*
   * The clone flies outside the gallery root, so anything it resolves through an
   * inherited token has to travel with it. --ig-object-fit is the load-bearing
   * one: the tile it was cloned from reads object-fit from that token, and
   * losing it mid-flight would re-crop the image partway through the
   * transition. Appearance that comes from a class needs no help -- cloneNode
   * carries the class list along.
   */
  const TRAVELLING_TOKENS = ['--ig-object-fit', '--ig-dialog-radius', '--ig-dialog-ring'];

  function copyGalleryCustomProperties(source: HTMLElement, clone: HTMLElement) {
    const computedStyle = getComputedStyle(source);

    TRAVELLING_TOKENS.forEach((token) => {
      const value = computedStyle.getPropertyValue(token).trim();

      if (value) {
        clone.style.setProperty(token, value);
      }
    });
  }

  function createFlyingClone(source: HTMLElement) {
    const clone = source.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.margin = '0';
    clone.style.transformOrigin = 'center center';
    clone.style.overflow = 'hidden';
    clone.style.pointerEvents = 'none';
    clone.style.zIndex = '9999';

    copyGalleryCustomProperties(source, clone);
    clone.style.borderRadius = getTransitionRadius(source);

    const sourceDescendants = source.querySelectorAll<HTMLElement>('*');
    const cloneDescendants = clone.querySelectorAll<HTMLElement>('*');

    cloneDescendants.forEach((element, index) => {
      const sourceElement = sourceDescendants[index];
      if (!sourceElement) {
        return;
      }

      const computedStyle = getComputedStyle(sourceElement);
      element.style.borderRadius = 'inherit';
      element.style.transition = 'none';
      element.style.overflow = computedStyle.overflow;

      if (computedStyle.getPropertyValue('--ig-dialog-radius').trim()) {
        element.style.setProperty(
          '--ig-dialog-radius',
          computedStyle.getPropertyValue('--ig-dialog-radius').trim()
        );
      }
    });

    return clone;
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

    const clone = createFlyingClone(fromEl);
    clone.style.position = 'fixed';
    clone.style.left = `${fromRect.left}px`;
    clone.style.top = `${fromRect.top}px`;
    clone.style.width = `${fromRect.width}px`;
    clone.style.height = `${fromRect.height}px`;

    const previousFromVisibility = fromEl.style.visibility;
    const previousToVisibility = toEl.style.visibility;

    fromEl.style.visibility = 'hidden';
    toEl.style.visibility = 'hidden';
    document.body.appendChild(clone);

    try {
      const { gsap } = await import('gsap');

      const duration = options.duration ?? 0.48;

      await withDeadline(
        (done) => {
          gsap.to(clone, {
            left: toRect.left,
            top: toRect.top,
            width: toRect.width,
            height: toRect.height,
            borderRadius: getTransitionRadius(toEl),
            duration,
            ease: options.ease ?? 'power3.inOut',
            onComplete: done
          });
        },
        duration * 1000 + 400
      );
    } catch {
      // If GSAP is unavailable, the state change still succeeds without animation.
    } finally {
      clone.remove();
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
      // themselves, so a small collection keeps exactly its old per-tile 0.04s.
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
    const clones = measureVisible(candidates).map(({ item, rect }) => {
      const clone = createFlyingClone(item);
      clone.style.position = 'fixed';
      clone.style.left = `${rect.left}px`;
      clone.style.top = `${rect.top}px`;
      clone.style.width = `${rect.width}px`;
      clone.style.height = `${rect.height}px`;
      clone.style.zIndex = '9998';
      clone.style.opacity = '1';
      document.body.appendChild(clone);
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
      });
    } catch {
      clones.forEach((clone) => clone.remove());
    }
  }

  return {
    animateBetween,
    animateBentoEntrance,
    animateBentoExit
  };
}
