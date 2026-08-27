import { h, nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import ImageGallery from '@/components/ImageGallery.vue';
import ImageGalleryCloseButton from '@/components/ImageGalleryCloseButton.vue';
import ImageGalleryCounter from '@/components/ImageGalleryCounter.vue';
import ImageGalleryGrid from '@/components/ImageGalleryGrid.vue';
import ImageGalleryGridToggle from '@/components/ImageGalleryGridToggle.vue';
import ImageGalleryOverlay from '@/components/ImageGalleryOverlay.vue';
import ImageGalleryGridImage from '@/components/ImageGalleryGridImage.vue';
import ImageGalleryGridTile from '@/components/ImageGalleryGridTile.vue';
import ImageGalleryStage from '@/components/ImageGalleryStage.vue';
import ImageGalleryStageFrame from '@/components/ImageGalleryStageFrame.vue';
import ImageGalleryStageImage from '@/components/ImageGalleryStageImage.vue';
import ImageGalleryTopbar from '@/components/ImageGalleryTopbar.vue';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = Array.from({ length: 4 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: 1000,
  height: 1000
}));

/*
 * A dialog recomposed the way a consumer would: the same parts, deliberately
 * not in the default arrangement, wearing the consumer's own classes. The point
 * of every assertion below is that behaviour arrived with the parts rather than
 * with the default markup -- the parts register what they provide, so a
 * rearranged dialog is still a working one.
 */
function mountRecomposed() {
  return mount(ImageGallery, {
    props: { images },
    slots: {
      default: previewSlot(images, 2),
      dialog: () =>
        h(
          ImageGalleryOverlay,
          { class: 'my-overlay' },
          {
            topbar: () =>
              h(ImageGalleryTopbar, null, {
                // Close on the left, counter on the right: the mirror of the default.
                start: () => h(ImageGalleryCloseButton, { class: 'my-close' }),
                center: () => h(ImageGalleryGridToggle),
                end: () => h(ImageGalleryCounter, { class: 'my-counter' })
              }),
            default: () => [h(ImageGalleryStage), h(ImageGalleryGrid)]
          }
        )
    },
    attachTo: document.body
  });
}

/*
 * The dialog is teleported to <body>, so a spec that throws before its own
 * unmount would otherwise leave it there for every spec after it -- and those
 * read the DOM by selector. One stray dialog turns a single failure into a
 * fileful of them.
 */
afterEach(() => {
  document.body.innerHTML = '';
});

async function open(wrapper: ReturnType<typeof mount>) {
  await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
  await new Promise((resolve) => setTimeout(resolve, 60));
}

describe('a recomposed dialog', () => {
  it('renders the consumer arrangement and their classes', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);

    const overlay = document.querySelector('[role="dialog"]');
    expect(overlay?.classList.contains('my-overlay')).toBe(true);
    expect(document.querySelector('.image-gallery-topbar-start .my-close')).toBeTruthy();
    expect(document.querySelector('.image-gallery-topbar-end .my-counter')).toBeTruthy();

    wrapper.unmount();
  });

  // registerRoot: without it there is no element for the trap to key on.
  it('is still a dialog to assistive technology', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);

    const overlay = document.querySelector('[role="dialog"]');
    expect(overlay?.getAttribute('aria-modal')).toBe('true');
    expect(overlay?.getAttribute('aria-label')).toContain('1 of 4');

    wrapper.unmount();
  });

  // registerCloseButton: focus goes to the way out, not to the first control
  // that DOM order happens to offer.
  it('still opens with focus on the close button', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);
    await new Promise((resolve) => setTimeout(resolve, 30));

    expect((document.activeElement as HTMLElement)?.classList.contains('my-close')).toBe(true);

    wrapper.unmount();
  });

  it('still closes, and gives the page its scroll back', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);
    expect(document.body.style.overflow).toBe('hidden');

    await (document.querySelector('.my-close') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(document.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');

    wrapper.unmount();
  });

  it('still swaps to the grid and back', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);

    await (document.querySelector('button[aria-label="Toggle image grid"]') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(document.querySelectorAll('[data-bento-item="true"]').length).toBe(images.length);
    // The counter describes a position the grid has stepped the reader out of.
    expect(document.querySelector('.my-counter')).toBeNull();

    wrapper.unmount();
  });

  it('refuses to render a part outside the gallery, by name', () => {
    expect(() => mount(ImageGalleryCloseButton)).toThrow(/<ImageGalleryCloseButton>/);
  });
});

/*
 * Every default this library applies is a class in @layer components, and the
 * element itself carries no utility of ours. That combination is what makes an
 * override win: a utility beats a layered class whatever the source order, and
 * an unlayered class of the consumer's own beats it too. These specs pin the
 * half of that contract a unit test can see -- that nothing of ours lands on the
 * element to race a consumer's class in the first place, and that what we do
 * apply is a single layered hook they can aim at.
 */
describe('overridable defaults', () => {
  const parts = [
    ['ImageGalleryCloseButton', ImageGalleryCloseButton, '.image-gallery-control'],
    ['ImageGalleryCounter', ImageGalleryCounter, '.image-gallery-counter'],
    ['ImageGalleryOverlay', ImageGalleryOverlay, '.image-gallery-overlay'],
    ['ImageGalleryTopbar', ImageGalleryTopbar, '.image-gallery-topbar']
  ] as const;

  it.each(parts)('%s takes a consumer class alongside its own', async (_name, part, hook) => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: previewSlot(images, 2),
        dialog: () => h(part as never, { class: 'consumer-class' })
      },
      attachTo: document.body
    });
    await open(wrapper);

    const element = document.querySelector(`${hook}.consumer-class`);
    expect(element).toBeTruthy();

    wrapper.unmount();
  });

  it('leaves no utility of its own on a dialog control to race the override', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);

    const close = document.querySelector('.my-close') as HTMLElement;
    // Its own classes are the layered hooks and the consumer's -- nothing else.
    expect([...close.classList].sort()).toEqual(
      ['image-gallery-control', 'image-gallery-control-round', 'my-close'].sort()
    );
    expect(close.getAttribute('style')).toBeNull();

    wrapper.unmount();
  });

  /*
   * An inline style beats a class regardless of layer, so nothing overridable may
   * be written inline -- not the corners, and not the shape. The image's ratio
   * goes out as a custom property the CSS reads, which an `aspect-square` of the
   * consumer's then wins over.
   */
  it('writes no overridable property inline on a grid tile', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);

    await (document.querySelector('button[aria-label="Toggle image grid"]') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 700));

    const tile = document.querySelector('[data-bento-item="true"]') as HTMLElement;

    expect(tile.style.getPropertyValue('--ig-internal-tile-ratio')).toBeTruthy();
    expect(tile.style.aspectRatio).toBe('');
    expect(tile.style.borderRadius).toBe('');

    wrapper.unmount();
  });

  it('writes no overridable property inline on a stage frame', async () => {
    const wrapper = mountRecomposed();
    await open(wrapper);

    const frame = document.querySelector('.image-gallery-stage-frame') as HTMLElement;

    expect(frame.style.getPropertyValue('--ig-internal-frame-ratio')).toBeTruthy();
    expect(frame.style.aspectRatio).toBe('');
    expect(frame.style.borderRadius).toBe('');

    wrapper.unmount();
  });
});

/*
 * The bar's height is the one value the stage and the grid both need and neither
 * owns, so ImageGalleryOverlay measures the bar and publishes it.
 */
describe('the measured topbar height', () => {
  let observed: Element | null = null;
  let trigger: (() => void) | null = null;
  const realResizeObserver = globalThis.ResizeObserver;
  const realOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

  beforeEach(() => {
    observed = null;
    trigger = null;

    // jsdom lays nothing out, so the bar has to claim a height of its own.
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get(this: HTMLElement) {
        return this.classList.contains('image-gallery-topbar') ? barHeight : 0;
      }
    });

    globalThis.ResizeObserver = class {
      constructor(callback: () => void) {
        trigger = callback;
      }
      observe(element: Element) {
        observed = element;
      }
      disconnect() {}
      unobserve() {}
    } as unknown as typeof ResizeObserver;
  });

  afterEach(() => {
    globalThis.ResizeObserver = realResizeObserver;
    if (realOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', realOffsetHeight);
    }
  });

  let barHeight = 80;

  it('publishes the bar height on the shell, and observes the bar', async () => {
    barHeight = 80;
    const wrapper = mountRecomposed();
    await open(wrapper);

    const shell = document.querySelector('.image-gallery-shell') as HTMLElement;

    expect(shell.style.getPropertyValue('--ig-internal-topbar-height')).toBe('80px');
    expect((observed as unknown as HTMLElement)?.classList.contains('image-gallery-topbar')).toBe(true);

    wrapper.unmount();
  });

  it('publishes zero when the dialog is composed without a bar', async () => {
    barHeight = 80;
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: previewSlot(images, 2),
        // An overlay with a stage and no topbar: nothing to clear.
        dialog: () => h(ImageGalleryOverlay, null, { default: () => h(ImageGalleryStage) })
      },
      attachTo: document.body
    });
    await open(wrapper);

    const shell = document.querySelector('.image-gallery-shell') as HTMLElement;

    expect(shell.style.getPropertyValue('--ig-internal-topbar-height')).toBe('0px');

    wrapper.unmount();
  });

  it('republishes when the bar changes size', async () => {
    barHeight = 80;
    const wrapper = mountRecomposed();
    await open(wrapper);

    const shell = document.querySelector('.image-gallery-shell') as HTMLElement;

    barHeight = 128;
    trigger?.();

    expect(shell.style.getPropertyValue('--ig-internal-topbar-height')).toBe('128px');

    wrapper.unmount();
  });

  /*
   * The loop guard. Sizing the bar from the value measured off the bar makes
   * every write re-trigger the observation that produced it -- a cycle with no
   * fixed point, and a suite that never finishes.
   */
  it('never writes back to the bar it measured', async () => {
    barHeight = 80;
    const wrapper = mountRecomposed();
    await open(wrapper);

    const bar = document.querySelector('.image-gallery-topbar') as HTMLElement;

    trigger?.();
    trigger?.();

    expect(bar.getAttribute('style')).toBeNull();
    expect(bar.style.getPropertyValue('--ig-internal-topbar-height')).toBe('');

    wrapper.unmount();
  });
});

/*
 * The stage and the grid hand you a template rather than a loop, because the
 * turn's three roles and the grid's packing are theirs to decide. These pin what
 * that buys: one template styled once, applied to every instance the library
 * drives.
 */
describe('the driven templates', () => {
  it('applies one frame template to the active image and both neighbours', async () => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: previewSlot(images, 2),
        dialog: () =>
          h(ImageGalleryOverlay, null, {
            default: () =>
              h(ImageGalleryStage, null, {
                frame: ({ image, role }: { image: GalleryImage; role: 'active' | 'previous' | 'next' }) =>
                  h(
                    ImageGalleryStageFrame,
                    { image, role, class: 'my-frame' },
                    { default: () => h(ImageGalleryStageImage, { class: 'my-image' }) }
                  )
              })
          })
      },
      attachTo: document.body
    });
    await open(wrapper);

    // The active frame plus a previous and a next neighbour, all from one template.
    expect(document.querySelectorAll('.my-frame').length).toBe(3);
    expect(document.querySelectorAll('.my-image').length).toBe(3);
    expect(document.querySelectorAll('.my-frame[data-ig-slide]').length).toBe(2);

    wrapper.unmount();
  });

  it('applies one tile template to every packed entry', async () => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: previewSlot(images, 2),
        dialog: () =>
          h(ImageGalleryOverlay, null, {
            topbar: () => h(ImageGalleryTopbar, null, { start: () => h(ImageGalleryGridToggle) }),
            default: () =>
              h(ImageGalleryGrid, null, {
                tile: ({ image, index }: { image: GalleryImage; index: number }) =>
                  h(
                    ImageGalleryGridTile,
                    { image, index, class: 'my-tile' },
                    { image: () => h(ImageGalleryGridImage, { class: 'my-grid-image' }) }
                  )
              })
          })
      },
      attachTo: document.body
    });
    await open(wrapper);

    await (document.querySelector('button[aria-label="Toggle image grid"]') as HTMLElement).click();
    await new Promise((resolve) => setTimeout(resolve, 700));

    expect(document.querySelectorAll('.my-tile').length).toBe(images.length);
    expect(document.querySelectorAll('.my-grid-image').length).toBe(images.length);
    // Registered for the flight, even though the consumer rendered them.
    expect(document.querySelectorAll('.my-tile[data-bento-index]').length).toBe(images.length);

    wrapper.unmount();
  });

  // An empty slot removes the arrow rather than hiding it, so it costs no Tab stop.
  it('drops an arrow whose slot is empty', async () => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: previewSlot(images, 2),
        dialog: () =>
          h(ImageGalleryOverlay, null, {
            default: () => h(ImageGalleryStage, null, { previous: () => [], next: () => [] })
          })
      },
      attachTo: document.body
    });
    await open(wrapper);

    expect(document.querySelectorAll('.image-gallery-stage-arrow').length).toBe(0);

    wrapper.unmount();
  });
});

/*
 * The gesture is touch-only, so the arrows and the drag never contend and
 * neither has to be switched off for the other. `swipe` exists for the case
 * where the drag itself is unwanted -- a dialog inside something that pans
 * horizontally already.
 */
describe('the swipe prop', () => {
  function touch(type: string, clientX: number) {
    return Object.assign(new Event(type, { bubbles: true, cancelable: true }), {
      pointerId: 1,
      pointerType: 'touch',
      button: 0,
      clientX,
      clientY: 0
    }) as unknown as PointerEvent;
  }

  const frame = () => document.querySelector('.image-gallery-stage-frame');

  /*
   * jsdom lays nothing out, so the stage falls back to the window width of 1024
   * -- a 500px drag is comfortably past the 40% commit threshold, and short of it
   * the turn snaps back instead. The snap is animated frame by frame, so this
   * polls for the inline transform to go rather than guessing at a duration.
   */
  async function dragAcross() {
    const stage = document.querySelector('.image-gallery-stage') as HTMLElement;
    stage.dispatchEvent(touch('pointerdown', 0));
    window.dispatchEvent(touch('pointermove', -250));
    window.dispatchEvent(touch('pointermove', -500));
    window.dispatchEvent(touch('pointerup', -500));

    for (let attempt = 0; attempt < 80; attempt += 1) {
      const style = frame()?.getAttribute('style') ?? '';

      if (!/translate|opacity/.test(style)) {
        return;
      }

      // eslint-disable-next-line no-await-in-loop -- one frame at a time is the point
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      // eslint-disable-next-line no-await-in-loop
      await nextTick();
    }
  }

  function mountStage(swipe?: boolean) {
    return mount(ImageGallery, {
      props: { images },
      slots: {
        default: previewSlot(images, 2),
        dialog: () =>
          h(ImageGalleryOverlay, null, {
            topbar: () => h(ImageGalleryTopbar, null, { center: () => h(ImageGalleryCounter) }),
            default: () => h(ImageGalleryStage, swipe === undefined ? null : { swipe })
          })
      },
      attachTo: document.body
    });
  }

  const reading = () => document.querySelector('.image-gallery-counter')?.textContent?.trim();

  // The control: without the prop the drag turns the page, so a failure to turn
  // below cannot be the harness.
  it('turns the page by default', async () => {
    const wrapper = mountStage();
    await open(wrapper);
    expect(reading()).toContain('1 of');

    await dragAcross();
    expect(reading()).toContain('2 of');

    wrapper.unmount();
  });

  it('leaves the page alone when swipe is false', async () => {
    const wrapper = mountStage(false);
    await open(wrapper);
    expect(reading()).toContain('1 of');

    await dragAcross();
    expect(reading()).toContain('1 of');

    wrapper.unmount();
  });
});
