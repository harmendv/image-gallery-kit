import { mount } from '@vue/test-utils';
import ImageGallery from '@/components/ImageGallery.vue';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

/*
 * The crop change is a documented feature -- a `cover` tile flying into an
 * `object-contain` stage scales continuously instead of snapping -- and it is
 * the one part of the flight that cannot be seen in jsdom, so it is pinned
 * here instead. The geometry is the docs' worst case, measured off the page: a
 * near-square mosaic tile into a 16/9 contain frame.
 *
 * `object-fit` is discrete, so the flight cannot lean on it. It pins the
 * clone's image to the painted rect its source shows and tweens that to the
 * painted rect the destination shows. Both ends must land exactly, and both
 * halves must share one duration and ease -- otherwise the picture drifts out
 * of its own box partway through even though the endpoints line up.
 */
const NATURAL = { width: 1400, height: 933 };
const TILE = { x: 336, y: 210, width: 298.5, height: 300 };
const FRAME = { x: 192, y: 77, width: 896, height: 504 };

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: NATURAL.width, height: NATURAL.height },
  { src: '/two.jpg', alt: 'Two', width: NATURAL.width, height: NATURAL.height }
];

const tweens: { target: HTMLElement; vars: Record<string, unknown> }[] = [];

vi.mock('gsap', () => ({
  gsap: {
    to: (target: HTMLElement, vars: Record<string, unknown>) => {
      tweens.push({ target, vars });
      if (typeof vars.onComplete === 'function') (vars.onComplete as () => void)();
      return { kill() {} };
    },
    set: () => {},
    killTweensOf: () => {}
  }
}));

function rect(r: { x: number; y: number; width: number; height: number }) {
  return {
    x: r.x,
    y: r.y,
    width: r.width,
    height: r.height,
    left: r.x,
    top: r.y,
    right: r.x + r.width,
    bottom: r.y + r.height,
    toJSON: () => ({})
  } as DOMRect;
}

/* The painted rect of an image with a given fit inside a given box. */
function painted(box: { x: number; y: number; width: number; height: number }, fit: 'cover' | 'contain') {
  const scale =
    fit === 'contain'
      ? Math.min(box.width / NATURAL.width, box.height / NATURAL.height)
      : Math.max(box.width / NATURAL.width, box.height / NATURAL.height);
  const width = NATURAL.width * scale;
  const height = NATURAL.height * scale;
  return {
    left: box.x + (box.width - width) / 2,
    top: box.y + (box.height - height) / 2,
    width,
    height
  };
}

describe('flight across a change of crop', () => {
  it('moves the picture continuously between the two painted rects', async () => {
    tweens.length = 0;

    const origRect = Element.prototype.getBoundingClientRect;
    const origFit = Object.getOwnPropertyDescriptor(window, 'getComputedStyle');

    Element.prototype.getBoundingClientRect = function (this: Element) {
      if (this.closest('.image-gallery-stage-frame')) return rect(FRAME);
      if (this.closest('[data-ig-tile-frame]') || this.closest('button')) return rect(TILE);
      return rect({ x: 0, y: 0, width: 1280, height: 720 });
    };

    const realComputed = window.getComputedStyle.bind(window);
    // @ts-expect-error test double
    window.getComputedStyle = (el: Element, pe?: string) => {
      const base = realComputed(el, pe as string | undefined);
      if (el.tagName === 'IMG') {
        const inStage = !!el.closest('.image-gallery-stage-frame');
        return new Proxy(base, {
          get(t, k) {
            if (k === 'objectFit') return inStage ? 'contain' : 'cover';
            const v = Reflect.get(t, k);
            return typeof v === 'function' ? v.bind(t) : v;
          }
        });
      }
      return base;
    };

    // naturalWidth/Height are 0 in jsdom; pinPicture bails without them.
    Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', {
      configurable: true,
      get: () => NATURAL.width
    });
    Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', {
      configurable: true,
      get: () => NATURAL.height
    });

    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: { default: previewSlot(images) },
      attachTo: document.body
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await new Promise((r) => setTimeout(r, 300));

    Element.prototype.getBoundingClientRect = origRect;
    if (origFit) Object.defineProperty(window, 'getComputedStyle', origFit);

    const from = painted(TILE, 'cover');
    const to = painted(FRAME, 'contain');

    const pictureTween = tweens.find((t) => t.target?.tagName === 'IMG');
    const boxTween = tweens.find((t) => t.target?.tagName !== 'IMG');

    expect(pictureTween, 'the picture must get its own tween').toBeTruthy();

    // Endpoints, converted back to absolute coordinates.
    const startAbs = {
      left: TILE.x + parseFloat((pictureTween!.target as HTMLElement).style.left),
      top: TILE.y + parseFloat((pictureTween!.target as HTMLElement).style.top),
      width: parseFloat((pictureTween!.target as HTMLElement).style.width),
      height: parseFloat((pictureTween!.target as HTMLElement).style.height)
    };
    const endAbs = {
      left: FRAME.x + (pictureTween!.vars.left as number),
      top: FRAME.y + (pictureTween!.vars.top as number),
      width: pictureTween!.vars.width as number,
      height: pictureTween!.vars.height as number
    };

    expect(startAbs.left).toBeCloseTo(from.left, 1);
    expect(startAbs.width).toBeCloseTo(from.width, 1);
    expect(endAbs.left).toBeCloseTo(to.left, 1);
    expect(endAbs.width).toBeCloseTo(to.width, 1);

    // Both halves must share one ease and one duration, or the picture drifts
    // out of its box partway through even though both ends line up.
    expect(pictureTween!.vars.ease).toBe(boxTween!.vars.ease);
    expect(pictureTween!.vars.duration).toBe(boxTween!.vars.duration);

    wrapper.unmount();
  });
});
