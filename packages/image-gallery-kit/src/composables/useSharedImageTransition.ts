import { nextTick } from 'vue';

type ElementGetter = () => HTMLElement | null;

interface TransitionOptions {
  duration?: number;
  ease?: string;
  fromRect?: DOMRect | null;
}

const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

export function useSharedImageTransition() {
  async function waitForPaint() {
    await nextTick();

    if (!isBrowser) {
      return;
    }

    await new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  async function animateBetween(
    fromGetter: ElementGetter,
    toGetter: ElementGetter,
    options: TransitionOptions = {}
  ) {
    if (!isBrowser) {
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

    const clone = fromEl.cloneNode(true) as HTMLElement;
    clone.setAttribute('aria-hidden', 'true');
    clone.style.position = 'fixed';
    clone.style.left = `${fromRect.left}px`;
    clone.style.top = `${fromRect.top}px`;
    clone.style.width = `${fromRect.width}px`;
    clone.style.height = `${fromRect.height}px`;
    clone.style.margin = '0';
    clone.style.transformOrigin = 'center center';
    clone.style.overflow = 'hidden';
    clone.style.borderRadius = getComputedStyle(fromEl).borderRadius;
    clone.style.zIndex = '9999';
    clone.style.pointerEvents = 'none';

    const cloneMedia = clone.querySelector('img');
    if (cloneMedia) {
      cloneMedia.style.width = '100%';
      cloneMedia.style.height = '100%';
      cloneMedia.style.display = 'block';
    }

    const previousFromVisibility = fromEl.style.visibility;
    const previousToVisibility = toEl.style.visibility;

    fromEl.style.visibility = 'hidden';
    toEl.style.visibility = 'hidden';
    document.body.appendChild(clone);

    try {
      const { gsap } = await import('gsap');

      await new Promise<void>((resolve) => {
        gsap.to(clone, {
          left: toRect.left,
          top: toRect.top,
          width: toRect.width,
          height: toRect.height,
          borderRadius: getComputedStyle(toEl).borderRadius,
          duration: options.duration ?? 0.48,
          ease: options.ease ?? 'power3.inOut',
          onComplete: () => resolve()
        });
      });
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

      await new Promise<void>((resolve) => {
        gsap.to(
          items,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.34,
            ease: 'power2.out',
            stagger: 0.04,
            onComplete: () => resolve()
          }
        );
      });
    } catch {
      // No-op fallback when GSAP is unavailable.
    }
  }

  return {
    animateBetween,
    animateBentoEntrance
  };
}
