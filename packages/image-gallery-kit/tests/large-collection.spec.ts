import { h } from 'vue';
import { mount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';
import ImageGallery from '@/components/ImageGallery.vue';
import ImageGalleryCloseButton from '@/components/ImageGalleryCloseButton.vue';
import ImageGalleryGrid from '@/components/ImageGalleryGrid.vue';
import ImageGalleryGridToggle from '@/components/ImageGalleryGridToggle.vue';
import ImageGalleryOverlay from '@/components/ImageGalleryOverlay.vue';
import ImageGalleryStage from '@/components/ImageGalleryStage.vue';
import ImageGalleryTopbar from '@/components/ImageGalleryTopbar.vue';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = Array.from({ length: 9 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: 1000,
  height: 1000
}));

const realGetComputedStyle = window.getComputedStyle.bind(window);

/*
 * The component counts the grid's own `grid-template-columns` tracks, and jsdom
 * resolves no stylesheets, so the declaration has to be injected. Everything
 * else delegates to the real implementation -- gsap leans on computed style
 * heavily and a wholesale fake would break the transition paths these specs
 * exercise.
 */
function stubResolvedColumns(count: number) {
  const tracks = Array.from({ length: count }, () => 'minmax(0px, 1fr)').join(' ');

  vi.spyOn(window, 'getComputedStyle').mockImplementation(((element: Element, pseudo?: string | null) => {
    const style = realGetComputedStyle(element, pseudo ?? undefined);

    return new Proxy(style, {
      get(target, property) {
        if (
          property === 'gridTemplateColumns' &&
          (element as HTMLElement).classList?.contains('image-gallery-bento')
        ) {
          return tracks;
        }

        const value = Reflect.get(target, property);
        return typeof value === 'function' ? value.bind(target) : value;
      }
    });
  }) as typeof window.getComputedStyle);
}

function stubRects(resolve: (element: Element) => Partial<DOMRect>) {
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function () {
    const rect = {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      ...resolve(this)
    };
    return { ...rect, toJSON: () => ({}) } as DOMRect;
  };

  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

async function openBento(props: Record<string, unknown> = {}) {
  const wrapper = mount(ImageGallery, {
    props: { images, ...props },
    slots: { default: previewSlot(images, 2) },
    attachTo: document.body
  });

  await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
  await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

  return wrapper;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('all-images grid at collection scale', () => {
  it('packs every image exactly once into the column count resolved from CSS', async () => {
    stubResolvedColumns(3);

    const wrapper = await openBento();

    expect(wrapper.findAll('.image-gallery-bento-column')).toHaveLength(3);

    const rendered = wrapper
      .findAll('[data-bento-item="true"]')
      .map((tile) => Number(tile.attributes('data-bento-index')))
      .sort((a, b) => a - b);

    expect(rendered).toEqual(images.map((_, index) => index));

    wrapper.unmount();
  });

  it('interleaves the sequence across columns instead of filling one at a time', async () => {
    stubResolvedColumns(3);

    const wrapper = await openBento();

    // CSS multi-column balancing would put 0,1,2 in the first column; greedy
    // shortest-column packing spreads the run across all three.
    const firstColumn = wrapper
      .findAll('.image-gallery-bento-column')[0]
      .findAll('[data-bento-item="true"]')
      .map((tile) => Number(tile.attributes('data-bento-index')));

    expect(firstColumn).toEqual([0, 3, 6]);

    wrapper.unmount();
  });

  it('repacks when a resize crosses a density breakpoint', async () => {
    stubResolvedColumns(2);

    const wrapper = await openBento();
    expect(wrapper.findAll('.image-gallery-bento-column')).toHaveLength(2);

    stubResolvedColumns(5);
    window.dispatchEvent(new Event('resize'));
    await wrapper.vm.$nextTick();

    expect(wrapper.findAll('.image-gallery-bento-column')).toHaveLength(5);

    wrapper.unmount();
  });

  it('scrolls the transition target into view so the image never flies off-screen', async () => {
    stubResolvedColumns(3);
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    const wrapper = mount(ImageGallery, {
      props: { images, index: 7 },
      slots: { default: previewSlot(images, 2) },
      attachTo: document.body
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(scrollIntoView).toHaveBeenCalled();
    // Smooth scrolling would settle after the rect has already been measured.
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ block: 'center', behavior: 'instant' });

    wrapper.unmount();
  });

  it('clones only the tiles on screen when leaving the grid', async () => {
    stubResolvedColumns(3);
    window.innerHeight = 800;
    window.innerWidth = 1200;

    // Tiles 1 and 2 sit in the scrollport; everything else is far below it, as
    // it would be part-way down a large collection.
    const restoreRects = stubRects((element) => {
      const index = (element as HTMLElement).dataset?.bentoIndex;

      if (index === undefined) {
        return {};
      }

      return Number(index) <= 2 ? { top: 100, bottom: 200 } : { top: 9000, bottom: 9100 };
    });

    const wrapper = await openBento();
    await wrapper.get('button[aria-label="Open image 1 from grid"]').trigger('click');

    // The exit clones carry z-index 9998; animateBetween's single flying clone
    // uses 9999 and is not part of this count.
    const exitClones = Array.from(document.querySelectorAll<HTMLElement>('[data-ig-flight="true"]')).filter(
      (clone) => clone.style.zIndex === '9998'
    );

    // Tiles 1 and 2 only: tile 0 is the active one and is always excluded.
    expect(exitClones).toHaveLength(2);

    restoreRects();
    await new Promise((resolve) => setTimeout(resolve, 700));
    wrapper.unmount();
  });

  it('does not rescan the dialog for focusable elements on every Tab', async () => {
    stubResolvedColumns(3);

    const wrapper = await openBento();
    const dialog = wrapper.get('[role="dialog"]').element;
    const querySelectorAll = vi.spyOn(dialog, 'querySelectorAll');

    for (let press = 0; press < 4; press += 1) {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    }

    expect(querySelectorAll).toHaveBeenCalledTimes(1);

    wrapper.unmount();
  });

  it('invalidates the focusable cache when the collection changes', async () => {
    stubResolvedColumns(3);

    const wrapper = await openBento();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));

    await wrapper.setProps({
      images: [...images, { src: '/10.jpg', alt: 'Image 10', width: 1000, height: 1000 }]
    });

    // Vue rebuilds the dialog subtree here, so the spy has to go on the element
    // that is now live -- the cache must not survive onto a detached root.
    const dialog = wrapper.get('[role="dialog"]').element;
    const querySelectorAll = vi.spyOn(dialog, 'querySelectorAll');

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab' }));
    expect(querySelectorAll).toHaveBeenCalledTimes(1);

    // ...and the recomputed set must cover the tile that was just added.
    expect(wrapper.findAll('[data-bento-item="true"]')).toHaveLength(10);

    wrapper.unmount();
  });
});

/*
 * `uniform` on ImageGalleryGrid: the packing plans columns from each image's
 * own ratio, but a grid whose tiles all render at one shape (an `aspect-*`
 * class on the tile) needs the plan to assume the same -- or the column that
 * drew the portraits is planned tall, rendered short, and comes up ragged.
 * Constant heights turn shortest-column into round-robin, which also puts the
 * reading order back left-to-right.
 */
describe('a uniform grid', () => {
  const mixed: GalleryImage[] = Array.from({ length: 9 }, (_, index) => ({
    src: `/${index + 1}.jpg`,
    alt: `Image ${index + 1}`,
    width: 1000,
    // Alternating extremes: ratio-aware packing would spread these unevenly.
    height: index % 2 === 0 ? 500 : 3000
  }));

  async function openUniformBento() {
    const wrapper = mount(ImageGallery, {
      props: { images: mixed },
      slots: {
        default: previewSlot(mixed, 2),
        dialog: () =>
          h(ImageGalleryOverlay, null, {
            topbar: () =>
              h(ImageGalleryTopbar, null, {
                start: () => h(ImageGalleryGridToggle),
                end: () => h(ImageGalleryCloseButton)
              }),
            default: () => [h(ImageGalleryStage), h(ImageGalleryGrid, { uniform: true })]
          })
      },
      attachTo: document.body
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

    return wrapper;
  }

  it("packs round-robin regardless of each image's own ratio", async () => {
    stubResolvedColumns(3);

    const wrapper = await openUniformBento();
    const columns = wrapper.findAll('.image-gallery-bento-column');

    expect(columns).toHaveLength(3);

    const indicesPerColumn = columns.map((column) =>
      column.findAll('[data-bento-item="true"]').map((tile) => Number(tile.attributes('data-bento-index')))
    );

    expect(indicesPerColumn).toEqual([
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8]
    ]);

    wrapper.unmount();
  });
});
