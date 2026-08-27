import { mount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import ImageGallery from '@/components/ImageGallery.vue';
import type { GalleryImage } from '@/types';
import { previewSlot as tiles } from './helpers';

// Tweens complete synchronously so the focus hand-off that follows the mode
// swap -- the thing under test -- arrives within a frame instead of a deadline.
vi.mock('gsap', () => ({
  gsap: {
    to: (_targets: unknown, vars: Record<string, any>) => {
      vars.onComplete?.();
      return {};
    }
  }
}));

const images: GalleryImage[] = Array.from({ length: 5 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: 1000,
  height: 1000
}));

function mountGallery(props: Record<string, unknown> = {}) {
  return mount(ImageGallery, {
    props: { images, ...props },
    slots: { default: tiles(images) },
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
  await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');
  await focusSettled(() => activeBentoIndex() !== undefined);
}

async function pressOnFocused(wrapper: ReturnType<typeof mountGallery>, key: string) {
  await wrapper.get('.image-gallery-bento').trigger('keydown', { key });
  await nextTick();
}

afterEach(() => {
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
    const wrapper = mountGallery();

    await openGrid(wrapper, 2);
    await pressOnFocused(wrapper, 'ArrowRight');

    expect(activeBentoIndex()).toBe('2');
    expect(wrapper.get('[data-bento-index="2"]').attributes('tabindex')).toBeUndefined();
    expect(wrapper.get('[data-bento-index="1"]').attributes('tabindex')).toBe('-1');

    await pressOnFocused(wrapper, 'ArrowLeft');

    expect(activeBentoIndex()).toBe('1');
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
