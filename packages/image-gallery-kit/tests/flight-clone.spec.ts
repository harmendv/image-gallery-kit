import { h } from 'vue';
import { mount } from '@vue/test-utils';
import ImageGallery from '@/components/ImageGallery.vue';
import ImageGalleryImage from '@/components/ImageGalleryImage.vue';
import { useSharedImageTransition } from '@/composables/useSharedImageTransition';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 }
];

// jsdom reports zero-size rects, and animateBetween refuses to fly a zero-size
// box, so every element has to claim the same 100x100 square.
function withFixedRects(run: () => Promise<void> | void) {
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      toJSON: () => ({})
    } as DOMRect;
  };

  return Promise.resolve(run()).finally(() => {
    Element.prototype.getBoundingClientRect = original;
  });
}

function flyingClone() {
  return document.querySelector<HTMLElement>('[data-ig-flight="true"]');
}

/*
 * The clone appears only after paint waits whose timing the scheduler owns, so
 * a fixed sleep is a bet on machine load -- lost whenever the suite runs wide.
 * Polling for the clone itself waits exactly as long as the take-off takes,
 * and catches the flight at its earliest -- before the tween has moved
 * anything -- which is also what the start-of-flight assertions want.
 */
/* eslint-disable no-await-in-loop -- polling waits for each check in turn; that is the point */
async function cloneInFlight() {
  for (let attempt = 0; attempt < 400; attempt += 1) {
    const clone = flyingClone();

    if (clone) {
      return clone;
    }

    await new Promise((resolve) => setTimeout(resolve, 5));
  }

  throw new Error('the flight never took off');
}
/* eslint-enable no-await-in-loop */

function flightLayer() {
  return document.querySelector<HTMLElement>('[data-ig-flight-layer="true"]');
}

/*
 * Mounts a preview whose tiles look like a consumer's: appearance in classes on
 * the tile, and a badge in the slot that belongs to the grid rather than to the
 * image.
 */
function mountWithTiles(props: Record<string, unknown> = {}) {
  return mount(ImageGallery, {
    props: { images, ...props },
    slots: {
      default: () =>
        images.map((image) =>
          h(
            ImageGalleryImage,
            { image, key: image.src, class: 'rounded-2xl shadow-lg ring-2', style: 'overflow: hidden' },
            { default: () => h('span', { class: 'tile-badge' }, '+7') }
          )
        )
    },
    attachTo: document.body
  });
}

async function duringFlight(wrapper: ReturnType<typeof mount>, assert: () => void) {
  const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');
  await cloneInFlight();

  assert();

  await open;
  await new Promise((resolve) => setTimeout(resolve, 1200));
  wrapper.unmount();
}

describe('measureTransitionRadius', () => {
  const { measureTransitionRadius } = useSharedImageTransition();

  function build(outerStyle: string, innerStyle = '') {
    const outer = document.createElement('div');
    outer.setAttribute('style', outerStyle);
    const inner = document.createElement('div');
    inner.setAttribute('style', innerStyle);
    outer.appendChild(inner);
    document.body.appendChild(outer);
    return { outer, inner };
  }

  it("prefers the element's own radius", () =>
    withFixedRects(() => {
      const { inner } = build('overflow: hidden; border-radius: 20px', 'border-radius: 6px');
      expect(measureTransitionRadius(inner)).toBe('6px');
    }));

  /*
   * The reported bug: a preview tile registers the frame *inside* the
   * consumer's <button>, and the consumer's radius is a class on the button.
   */
  it('climbs to a clipping ancestor that shares its box', () =>
    withFixedRects(() => {
      const { inner } = build('overflow: hidden; border-radius: 14px');
      expect(measureTransitionRadius(inner)).toBe('14px');
    }));

  it('stops at an ancestor that does not clip', () =>
    withFixedRects(() => {
      const { inner } = build('border-radius: 14px');
      expect(measureTransitionRadius(inner)).toBe('0px');
    }));

  it('stops at an ancestor whose box is elsewhere', () => {
    const { inner, outer } = build('overflow: hidden; border-radius: 14px');
    const rect = (top: number) =>
      ({ x: 0, y: top, width: 100, height: 100, top, left: 0, right: 100, bottom: top + 100 }) as DOMRect;

    inner.getBoundingClientRect = () => rect(0);
    outer.getBoundingClientRect = () => rect(400);

    expect(measureTransitionRadius(inner)).toBe('0px');
  });
});

describe('flight radius', () => {
  it("starts the clone at the preview tile's own corners, not the frame's", () =>
    withFixedRects(async () => {
      const wrapper = mount(ImageGallery, {
        props: { images },
        slots: {
          default: () =>
            images.map((image) =>
              h(ImageGalleryImage, { image, key: image.src, style: 'overflow: hidden; border-radius: 14px' })
            )
        },
        attachTo: document.body
      });

      const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');
      const clone = await cloneInFlight();

      expect(clone.style.borderRadius).toBe('14px');

      await open;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      wrapper.unmount();
    }));

  it('uses the radius the caller captured, since the source may already be gone', () =>
    withFixedRects(async () => {
      const { animateBetween } = useSharedImageTransition();

      const source = document.createElement('div');
      const target = document.createElement('div');
      document.body.appendChild(target);

      const flight = animateBetween(
        () => source,
        () => target,
        {
          fromRect: source.getBoundingClientRect(),
          fromRadius: '18px'
        }
      );

      const clone = await cloneInFlight();
      expect(clone.style.borderRadius).toBe('18px');

      await flight;
      expect(flyingClone()).toBeNull();
    }));
});

describe('the flying clone', () => {
  /*
   * The whole point of cloning the consumer's element rather than the frame
   * inside it: every bit of a tile's appearance is a class, and a class list
   * travels for free.
   */
  it("carries the tile's own classes, so its appearance travels", () =>
    withFixedRects(async () => {
      const wrapper = mountWithTiles();

      await duringFlight(wrapper, () => {
        const clone = flyingClone();
        expect(clone?.classList.contains('rounded-2xl')).toBe(true);
        expect(clone?.classList.contains('shadow-lg')).toBe(true);
        expect(clone?.classList.contains('ring-2')).toBe(true);
      });
    }));

  it("drops the tile's slot content, which belongs to the grid", () =>
    withFixedRects(async () => {
      const wrapper = mountWithTiles();

      await duringFlight(wrapper, () => {
        const clone = flyingClone();
        expect(clone?.querySelector('img')).toBeTruthy();
        expect(clone?.querySelector('.tile-badge')).toBeNull();
      });
    }));

  // A clone of a tile is a clone of a <button>, and a decoration must not be
  // reachable by Tab.
  it('is inert and untabbable', () =>
    withFixedRects(async () => {
      const wrapper = mountWithTiles();

      await duringFlight(wrapper, () => {
        const clone = flyingClone();
        expect(clone?.tabIndex).toBe(-1);
        expect(clone?.getAttribute('aria-hidden')).toBe('true');
      });
    }));
});

describe('the flight layer', () => {
  /*
   * One class, and only one. The dialog paints in system colours, which resolve
   * wherever a clone lands, so the reset is all that has to travel -- and it does
   * have to, because it is what gives the clone its box model.
   */
  it('wears the reset the clone has to resolve through', () =>
    withFixedRects(async () => {
      const wrapper = mountWithTiles();

      await duringFlight(wrapper, () => {
        expect(flightLayer()?.className).toBe('image-gallery-theme');
      });
    }));

  it('leaves nothing behind once the flight lands', () =>
    withFixedRects(async () => {
      const wrapper = mountWithTiles();

      await duringFlight(wrapper, () => {
        expect(flightLayer()).not.toBeNull();
      });

      expect(flightLayer()).toBeNull();
    }));
});

/*
 * The two ends of a flight wear different decoration -- a consumer's tile has a
 * border and a shadow, the dialog's stage has neither -- and the clone is
 * swapped for the real thing the instant it lands. Anything not tweened to the
 * destination's value therefore holds at full strength for the whole flight and
 * then vanishes at the swap.
 */
describe('decoration across the flight', () => {
  function mountBordered() {
    return mount(ImageGallery, {
      props: { images },
      slots: {
        default: () =>
          images.map((image) =>
            h(ImageGalleryImage, {
              image,
              key: image.src,
              style: 'overflow: hidden; border: 6px solid rgb(0, 128, 0); background-color: rgb(0, 0, 255)'
            })
          )
      },
      attachTo: document.body
    });
  }

  it('eases the border out instead of dropping it at the swap', () =>
    withFixedRects(async () => {
      const wrapper = mountBordered();
      const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');

      // Sampled part-way through, so a value that merely snapped at either end
      // would not land here.
      await new Promise((resolve) => setTimeout(resolve, 240));
      const midFlight = Number.parseFloat(flyingClone()?.style.borderTopWidth ?? '');

      expect(midFlight).toBeGreaterThan(0);
      expect(midFlight).toBeLessThan(6);

      await open;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      wrapper.unmount();
    }));

  it('carries the background down with it', () =>
    withFixedRects(async () => {
      const wrapper = mountBordered();
      const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');

      await new Promise((resolve) => setTimeout(resolve, 240));
      // Mid-tween the colour is neither the tile's blue nor fully transparent.
      expect(flyingClone()?.style.backgroundColor).toMatch(/rgba?\(/);
      expect(flyingClone()?.style.backgroundColor).not.toBe('rgb(0, 0, 255)');

      await open;
      await new Promise((resolve) => setTimeout(resolve, 1200));
      wrapper.unmount();
    }));
});

/*
 * `object-fit` is discrete -- there is no halfway between `cover` and `contain`
 * for a browser to interpolate -- so a flight between two ends that crop
 * differently cannot be carried by it: the box would tween while the picture
 * inside jumped at the swap. The flight pins the clone's image to the picture
 * its source was painting and tweens that geometry instead.
 */
describe('the picture inside the clone', () => {
  const naturalWidth = 200;
  const naturalHeight = 100;
  const realRect = Element.prototype.getBoundingClientRect;
  const realNaturalWidth = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalWidth');
  const realNaturalHeight = Object.getOwnPropertyDescriptor(HTMLImageElement.prototype, 'naturalHeight');

  /* A 2:1 image, a 100x100 tile and a 400x200 stage: cover paints 200x100 and 400x200. */
  beforeEach(() => {
    ['naturalWidth', 'naturalHeight'].forEach((property) => {
      Object.defineProperty(HTMLImageElement.prototype, property, {
        configurable: true,
        get: () => (property === 'naturalWidth' ? naturalWidth : naturalHeight)
      });
    });

    Element.prototype.getBoundingClientRect = function () {
      const onStage = this.closest('.image-gallery-stage-frame') !== null;
      const width = onStage ? 400 : 100;
      const height = onStage ? 200 : 100;

      return {
        x: 0,
        y: 0,
        width,
        height,
        top: 0,
        left: 0,
        right: width,
        bottom: height,
        toJSON: () => ({})
      } as DOMRect;
    };
  });

  afterEach(() => {
    Element.prototype.getBoundingClientRect = realRect;
    if (realNaturalWidth) {
      Object.defineProperty(HTMLImageElement.prototype, 'naturalWidth', realNaturalWidth);
    }
    if (realNaturalHeight) {
      Object.defineProperty(HTMLImageElement.prototype, 'naturalHeight', realNaturalHeight);
    }
  });

  function cloneImage() {
    return flyingClone()?.querySelector('img') ?? null;
  }

  it("starts on the picture its source was painting, not on the source's box", async () => {
    const wrapper = mountWithTiles();
    const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await cloneInFlight();

    const image = cloneImage() as HTMLElement;

    // `fill`, because the explicit box is doing the fitting now.
    expect(image.style.objectFit).toBe('fill');
    // Cover in a 100x100 box paints 200x100, overflowing 50px either side.
    expect(Math.round(Number.parseFloat(image.style.width))).toBe(200);
    expect(Math.round(Number.parseFloat(image.style.height))).toBe(100);
    expect(Math.round(Number.parseFloat(image.style.left))).toBe(-50);

    await open;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    wrapper.unmount();
  });

  it('tweens that picture toward the one the destination paints', async () => {
    const wrapper = mountWithTiles();
    const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    // Sampled part-way, so a value that merely snapped at either end would not
    // land strictly between the two.
    await new Promise((resolve) => setTimeout(resolve, 240));
    const width = Number.parseFloat((cloneImage() as HTMLElement).style.width);

    expect(width).toBeGreaterThan(200);
    expect(width).toBeLessThan(400);

    await open;
    await new Promise((resolve) => setTimeout(resolve, 1200));
    wrapper.unmount();
  });
});
