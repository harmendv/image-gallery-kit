import { mount } from '@vue/test-utils';
import { afterEach } from 'vitest';
import { computed, nextTick, ref } from 'vue';
import ImageGallery from '@/components/ImageGallery.vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import type { GalleryImage } from '@/types';
import { reportGridTracks, previewSlot as tiles } from './helpers';

// Tweens complete synchronously so the focus hand-off that follows the mode
// swap -- the thing under test -- arrives within a frame instead of a deadline.
const gsap = {
  to: (_targets: unknown, vars: Record<string, any>) => {
    vars.onComplete?.();
    return {};
  }
};

const images: GalleryImage[] = Array.from({ length: 5 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: 1000,
  height: 1000
}));

function mountGallery(props: Record<string, unknown> = {}, collection = images) {
  return mount(ImageGallery, {
    props: { images: collection, gsap, ...props },
    slots: { default: tiles(collection) },
    attachTo: document.body
  });
}

function flushFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/*
 * Focus lands on the active tile only after the mode swap's animations resolve,
 * which takes a couple of paint waits even with gsap completing synchronously.
 * Polling keeps these specs honest about that without hardcoding frame counts.
 */
/* eslint-disable no-await-in-loop -- polling waits for each frame in turn; that is the point */
async function focusSettled(check: () => boolean) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (check()) {
      return;
    }

    await flushFrame();
    await nextTick();
  }

  throw new Error('focus never arrived where the spec expected it');
}
/* eslint-enable no-await-in-loop */

function activeBentoIndex() {
  const active = document.activeElement;

  return active instanceof HTMLElement ? active.dataset.bentoIndex : undefined;
}

async function openGrid(wrapper: ReturnType<typeof mountGallery>, at = 1) {
  await wrapper.get(`button[aria-label="Open image ${at}"]`).trigger('click');
  await wrapper.get('button[aria-label="All images"]').trigger('click');
  await focusSettled(() => activeBentoIndex() !== undefined);
}

async function pressOnFocused(wrapper: ReturnType<typeof mountGallery>, key: string) {
  await wrapper.get('.image-gallery-bento').trigger('keydown', { key });
  await nextTick();
}

let restoreTracks = () => {};

afterEach(() => {
  restoreTracks();
  restoreTracks = () => {};
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('grid keyboard navigation', () => {
  it('enters the grid with focus on the active tile, the only Tab stop', async () => {
    const wrapper = mountGallery();

    await openGrid(wrapper, 2);

    expect(activeBentoIndex()).toBe('1');
    // Roving tabindex: every other tile is parked at -1, so Tab crosses the
    // grid in one step instead of one stop per image.
    expect(document.querySelectorAll('[data-bento-item][tabindex="-1"]')).toHaveLength(4);
    expect(wrapper.get('[data-bento-index="1"]').attributes('tabindex')).toBeUndefined();
  });

  it('moves the focus and the Tab stop with the horizontal arrows', async () => {
    restoreTracks = reportGridTracks(2);
    const wrapper = mountGallery();

    await openGrid(wrapper, 1);
    await pressOnFocused(wrapper, 'ArrowRight');

    expect(activeBentoIndex()).toBe('1');
    expect(wrapper.get('[data-bento-index="1"]').attributes('tabindex')).toBeUndefined();
    expect(wrapper.get('[data-bento-index="0"]').attributes('tabindex')).toBe('-1');

    await pressOnFocused(wrapper, 'ArrowLeft');

    expect(activeBentoIndex()).toBe('0');
  });

  /*
   * Three columns, packed shortest-first from these heights (in column widths):
   *
   *   column 0: 0 [0, 2]                 6 [2, 3]
   *   column 1: 1 [0, .5]  3 [.5, 1]     4 [1, 2]
   *   column 2: 2 [0, 1]                 5 [1, 2]
   *
   * Below the top row image order no longer runs across: 3's right-hand
   * neighbour is 2, not 4, and 4's left-hand one is 0, not 3.
   */
  const mixed: GalleryImage[] = [
    [1000, 2000],
    [2000, 1000],
    [1000, 1000],
    [2000, 1000],
    [1000, 1000],
    [1000, 1000],
    [1000, 1000]
  ].map(([width, height], index) => ({
    src: `/mixed-${index + 1}.jpg`,
    alt: `Mixed ${index + 1}`,
    width,
    height
  }));

  it.each([
    [4, 'ArrowLeft', '0'],
    [4, 'ArrowRight', '5'],
    [3, 'ArrowRight', '2'],
    [3, 'ArrowLeft', '0'],
    [6, 'ArrowRight', '4'],
    [5, 'ArrowLeft', '4']
  ])('moves from %i on %s to the tile beside it in a mixed-ratio grid', async (from, key, expected) => {
    restoreTracks = reportGridTracks(3);
    const wrapper = mountGallery({}, mixed);

    await openGrid(wrapper, from + 1);
    await pressOnFocused(wrapper, key);

    expect(activeBentoIndex()).toBe(expected);
  });

  it.each([
    [0, 'ArrowLeft'],
    [2, 'ArrowRight'],
    [5, 'ArrowRight']
  ])('holds %i on %s at the outer column, and still claims the key', async (from, key) => {
    restoreTracks = reportGridTracks(3);
    const wrapper = mountGallery({}, mixed);

    await openGrid(wrapper, from + 1);

    const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
    wrapper.get('.image-gallery-bento').element.dispatchEvent(event);
    await nextTick();

    expect(activeBentoIndex()).toBe(String(from));
    expect(event.defaultPrevented).toBe(true);
  });

  it('walks the packed column with the vertical arrows', async () => {
    const wrapper = mountGallery();

    // jsdom reports no grid tracks, so the packing resolves to one column and
    // the vertical neighbours are simply the adjacent images.
    await openGrid(wrapper, 2);
    await pressOnFocused(wrapper, 'ArrowDown');

    expect(activeBentoIndex()).toBe('2');

    await pressOnFocused(wrapper, 'ArrowUp');

    expect(activeBentoIndex()).toBe('1');
  });

  it('jumps to the ends with Home and End, and holds at the edges', async () => {
    const wrapper = mountGallery();

    await openGrid(wrapper, 2);
    await pressOnFocused(wrapper, 'End');

    expect(activeBentoIndex()).toBe('4');

    // The edge holds rather than wrapping: a grid is a surface, not a cycle.
    await pressOnFocused(wrapper, 'ArrowRight');

    expect(activeBentoIndex()).toBe('4');

    await pressOnFocused(wrapper, 'Home');

    expect(activeBentoIndex()).toBe('0');
  });

  it('keeps every tile reachable after a resize re-packs the columns', async () => {
    const wrapper = mountGallery();

    await openGrid(wrapper, 1);

    /*
     * jsdom reports no grid tracks, so the grid opens as one column. Reporting
     * two and resizing re-packs it round-robin: images 2 and 4 move into the new
     * column as fresh tiles, which mount before the tiles they replace unmount.
     */
    const originalGetComputedStyle = window.getComputedStyle;
    window.getComputedStyle = (element: Element) =>
      ({ ...originalGetComputedStyle(element), gridTemplateColumns: '1fr 1fr' }) as CSSStyleDeclaration;

    window.dispatchEvent(new Event('resize'));
    await nextTick();
    await nextTick();

    window.getComputedStyle = originalGetComputedStyle;

    expect(wrapper.findAll('.image-gallery-bento-column')).toHaveLength(2);

    // A moved tile whose registry entry was dropped would be skipped here.
    /* eslint-disable no-await-in-loop -- each key press depends on the last */
    for (const [key, expected] of [
      ['ArrowRight', '1'],
      ['ArrowDown', '3'],
      ['ArrowLeft', '2'],
      ['ArrowDown', '4']
    ]) {
      await pressOnFocused(wrapper, key);

      expect(activeBentoIndex()).toBe(expected);
    }
    /* eslint-enable no-await-in-loop */
  });

  it('keeps parked tiles out of the focus trap', async () => {
    // The trap counts only rendered elements, and jsdom lays nothing out -- so
    // every element must report a box for the focusable set to exist at all.
    const originalGetClientRects = Element.prototype.getClientRects;
    Element.prototype.getClientRects = function () {
      return [{}] as unknown as DOMRectList;
    };

    const wrapper = mountGallery();

    await openGrid(wrapper, 2);

    /*
     * The focused tile is the last element of the reduced focusable set, so a
     * Tab from it must wrap to the dialog's first control. With parked tiles
     * still counted, the "last element" would be a tile the browser's own Tab
     * can never reach, the wrap would never trigger, and Tab would walk out of
     * the dialog.
     */
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', cancelable: true }));
    await nextTick();

    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close dialog');

    Element.prototype.getClientRects = originalGetClientRects;
  });
});

describe('grid horizontal neighbours', () => {
  function createGrid(collection: GalleryImage[], uniform = false) {
    const grid = useBentoGrid({
      images: () => collection,
      total: computed(() => collection.length),
      ratioOf: (image) => image.width! / image.height!,
      clampIndex: (index) => Math.min(Math.max(index, 0), collection.length - 1),
      direction: ref('ltr')
    });

    restoreTracks = reportGridTracks(2);
    grid.setGrid(document.createElement('div'));
    grid.setUniform(uniform);
    grid.syncColumnCount();

    return grid;
  }

  function press(grid: ReturnType<typeof createGrid>, from: number, key: string) {
    grid.focusIndex.value = from;
    grid.moveFocus(new KeyboardEvent('keydown', { key, cancelable: true }));

    return grid.focusIndex.value;
  }

  // Portrait, then squares: packed, 0 [0, 2] | 1 [0, 1], 2 [1, 2], and 3 [2, 3] under 0.
  const collection: GalleryImage[] = [
    [1000, 2000],
    [1000, 1000],
    [1000, 1000],
    [1000, 1000]
  ].map(([width, height], index) => ({ src: `/${index + 1}.jpg`, alt: `Image ${index + 1}`, width, height }));

  it('keeps round-robin rows when the grid is uniform', () => {
    // Uniform packs 0, 2 | 1, 3 whatever the ratios, so across is +1 / -1 again.
    const grid = createGrid(collection, true);

    expect(press(grid, 2, 'ArrowRight')).toBe(3);
    expect(press(grid, 3, 'ArrowLeft')).toBe(2);
    expect(press(grid, 1, 'ArrowRight')).toBe(1);
  });

  it('follows the rendered rects over the packed heights once laid out', () => {
    const grid = createGrid(collection);

    // From the ratios alone, 2 [1, 2] sits beside the portrait.
    expect(press(grid, 2, 'ArrowLeft')).toBe(0);

    /*
     * A consumer's aspect-square renders the portrait square too, so painted
     * with a gap, 2 lines up with 3 instead -- which is what the reader sees.
     */
    const painted: Record<number, [number, number]> = {
      0: [0, 100],
      1: [0, 100],
      2: [110, 210],
      3: [110, 210]
    };

    Object.entries(painted).forEach(([index, [top, bottom]]) => {
      const element = document.createElement('button');
      element.getBoundingClientRect = () => ({ top, bottom, height: bottom - top }) as DOMRect;
      grid.registerTile(ref(Number(index)), ref(element));
    });

    expect(press(grid, 2, 'ArrowLeft')).toBe(3);
  });
});
