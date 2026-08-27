import { mount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import ImageGallery from '@/components/ImageGallery.vue';
import type { GalleryImage } from '@/types';
import { previewSlot as tiles } from './helpers';

// The flight animation is not under test here; completing tweens synchronously
// keeps each spec from waiting out the real deadline timers.
vi.mock('gsap', () => ({
  gsap: {
    to: (_targets: unknown, vars: Record<string, any>) => {
      vars.onComplete?.();
      return {};
    }
  }
}));

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 },
  { src: '/three.jpg', alt: 'Three', width: 1000, height: 1000 }
];

function mountGallery(props: Record<string, unknown> = {}) {
  return mount(ImageGallery, {
    props: { images, ...props },
    slots: { default: tiles(images) },
    attachTo: document.body
  });
}

async function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  await nextTick();
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('loop', () => {
  it('wraps at the ends by default', async () => {
    const wrapper = mountGallery();

    await wrapper.get('button[aria-label="Open image 3"]').trigger('click');
    await pressKey('ArrowRight');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('1 of 3');

    await pressKey('ArrowLeft');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 3');
    // Wrapping has no ends, so neither arrow ever disables.
    expect(wrapper.get('button[aria-label="Next image"]').attributes('disabled')).toBeUndefined();
    expect(wrapper.get('button[aria-label="Previous image"]').attributes('disabled')).toBeUndefined();
  });

  it('stops at the last image when loop is off', async () => {
    const wrapper = mountGallery({ loop: false });

    await wrapper.get('button[aria-label="Open image 3"]').trigger('click');
    await pressKey('ArrowRight');

    // The key and the arrow route through the same guard, so the counter
    // holding still is the arrow being disabled, observed from the other side.
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 3');
    expect(wrapper.get('button[aria-label="Next image"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[aria-label="Previous image"]').attributes('disabled')).toBeUndefined();
  });

  it('stops at the first image when loop is off', async () => {
    const wrapper = mountGallery({ loop: false });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await pressKey('ArrowLeft');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('1 of 3');
    expect(wrapper.get('button[aria-label="Previous image"]').attributes('disabled')).toBeDefined();
    expect(wrapper.get('button[aria-label="Next image"]').attributes('disabled')).toBeUndefined();
  });

  it('parks no neighbour slide beyond an end when loop is off', async () => {
    const wrapper = mountGallery({ loop: false });

    await wrapper.get('button[aria-label="Open image 3"]').trigger('click');

    // A slide only exists to be revealed by a swipe; past the end there is
    // nothing to reveal, so decoding one would be a download for nothing.
    expect(wrapper.find('[data-ig-slide="next"]').exists()).toBe(false);
    expect(wrapper.find('[data-ig-slide="previous"]').exists()).toBe(true);
  });

  it('parks both neighbour slides when wrapping', async () => {
    const wrapper = mountGallery();

    await wrapper.get('button[aria-label="Open image 3"]').trigger('click');

    expect(wrapper.find('[data-ig-slide="next"]').exists()).toBe(true);
    expect(wrapper.find('[data-ig-slide="previous"]').exists()).toBe(true);
  });
});
