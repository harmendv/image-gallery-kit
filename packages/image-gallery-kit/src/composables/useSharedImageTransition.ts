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

export function useSharedImageTransition() {
  function getTransitionRadius(element: HTMLElement) {
    return element.dataset.transitionRadius || getComputedStyle(element).borderRadius;
  }

  function copyGalleryCustomProperties(source: HTMLElement, clone: HTMLElement) {
    const computedStyle = getComputedStyle(source);
    const galleryRadius = computedStyle.getPropertyValue('--ig-radius').trim();
    const galleryRing = computedStyle.getPropertyValue('--ig-ring').trim();

    if (galleryRadius) {
      clone.style.setProperty('--ig-radius', galleryRadius);
    }

    if (galleryRing) {
      clone.style.setProperty('--ig-ring', galleryRing);
    }
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

      if (computedStyle.getPropertyValue('--ig-radius').trim()) {
        element.style.setProperty('--ig-radius', computedStyle.getPropertyValue('--ig-radius').trim());
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

      await withDeadline((done) => {
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
      }, duration * 1000 + 400);
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

    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-bento-item="true"]:not([data-bento-active="true"])')
    );
    if (!items.length) {
      return;
    }

    try {
      const { gsap } = await import('gsap');

      await withDeadline((done) => {
        gsap.to(
          items,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.34,
            ease: 'power2.out',
            stagger: 0.04,
            onComplete: done
          }
        );
      }, 340 + items.length * 40 + 400);
    } catch {
      // No-op fallback when GSAP is unavailable.
    }
  }

  async function animateBentoExit(
    containerGetter: ElementGetter,
    options: BentoExitOptions = {}
  ) {
    if (!isBrowser || prefersReducedMotion()) {
      return;
    }

    const container = containerGetter();
    if (!container) {
      return;
    }

    const items = Array.from(
      container.querySelectorAll<HTMLElement>('[data-bento-item="true"]')
    ).filter((item) => item.dataset.bentoIndex !== `${options.activeIndex ?? ''}`);

    if (!items.length) {
      return;
    }

    const clones = items
      .map((item) => {
        const rect = item.getBoundingClientRect();
        if (!rect.width || !rect.height) {
          return null;
        }

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
      })
      .filter((clone): clone is HTMLElement => clone !== null);

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
