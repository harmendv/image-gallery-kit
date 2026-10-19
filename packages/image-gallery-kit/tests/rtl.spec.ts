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

const images: GalleryImage[] = Array.from({ length: 5 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: 1000,
  height: 1000
}));

/*
 * The direction comes from around the gallery, not from the document: a host
 * element carries `dir="rtl"` and <body> stays left-to-right, which is exactly the
 * case where the teleported dialog would otherwise read the wrong one.
 */
function mountGallery(dir: 'ltr' | 'rtl', props: Record<string, unknown> = {}, teleport = true) {
  const host = document.createElement('div');
  host.dir = dir;
  document.body.append(host);

  return mount(ImageGallery, {
    props: { images, ...props },
    slots: { default: tiles(images) },
    attachTo: host,
    global: teleport ? {} : { stubs: { teleport: false } }
  });
}

async function openAt(wrapper: ReturnType<typeof mountGallery>, at: number) {
  await wrapper.get(`button[aria-label="Open image ${at}"]`).trigger('click');
  await nextTick();
}

function counter() {
  return document.querySelector('[role="dialog"]')?.getAttribute('aria-label') ?? '';
}

async function pressKey(key: string) {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
  await nextTick();
}

/* Same stand-in as swipe.spec.ts: jsdom has no PointerEvent constructor. */
function pointerEvent(type: string, clientX = 0) {
  const event = new Event(type, { bubbles: true, cancelable: true });

  return Object.assign(event, {
    pointerId: 1,
    pointerType: 'touch',
    button: 0,
    clientX,
    clientY: 0
  }) as unknown as PointerEvent;
}

function offsetOf(wrapper: ReturnType<typeof mountGallery>, selector: string) {
  const style = wrapper.get(selector).attributes('style') ?? '';
  const match = /translate(?:X)?\(calc\((-?[\d.]+)%/.exec(style);

  return match ? Number(match[1]) : null;
}

/* jsdom lays nothing out, so the stage falls back to the window width. */
const STAGE = 1024;

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('right-to-left', () => {
  it('gives the teleported dialog the gallery’s direction rather than the document’s', async () => {
    const wrapper = mountGallery('rtl', {}, false);

    await openAt(wrapper, 2);

    const overlay = document.body.querySelector(':scope > [role="dialog"]');
    expect(overlay?.getAttribute('dir')).toBe('rtl');

    wrapper.unmount();
  });

  it('keeps left-to-right galleries as they were', async () => {
    const wrapper = mountGallery('ltr');

    await openAt(wrapper, 2);
    expect(wrapper.get('[role="dialog"]').attributes('dir')).toBe('ltr');

    await pressKey('ArrowRight');
    expect(counter()).toContain('3 of 5');
  });

  it('reads ArrowLeft as next and ArrowRight as previous', async () => {
    const wrapper = mountGallery('rtl');

    await openAt(wrapper, 2);
    await pressKey('ArrowLeft');
    expect(counter()).toContain('3 of 5');

    await pressKey('ArrowRight');
    await pressKey('ArrowRight');
    expect(counter()).toContain('1 of 5');
    expect(wrapper.emitted('change')).toEqual([[2], [1], [0]]);
  });

  it('respects the ends with loop off, in reading order', async () => {
    const wrapper = mountGallery('rtl', { loop: false });

    await openAt(wrapper, 1);
    // → is "previous" here, and there is none before the first image.
    await pressKey('ArrowRight');
    expect(counter()).toContain('1 of 5');
  });

  it('keeps the arrow buttons bound to previous and next', async () => {
    const wrapper = mountGallery('rtl');

    await openAt(wrapper, 2);
    await wrapper.get('.image-gallery-stage-arrow-next').trigger('click');
    expect(counter()).toContain('3 of 5');

    await wrapper.get('.image-gallery-stage-arrow-previous').trigger('click');
    expect(counter()).toContain('2 of 5');
  });

  it('pulls the next image in from the left on a rightward drag', async () => {
    const wrapper = mountGallery('rtl');

    await openAt(wrapper, 2);

    const stage = wrapper.get('.image-gallery-stage').element;
    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', STAGE / 4));
    await nextTick();

    // The mirror of the left-to-right turn: the frame leaves to the right and the
    // next image arrives from the left, still exactly one slide apart.
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(25, 5);
    expect(offsetOf(wrapper, '[data-ig-slide="next"]')).toBeCloseTo(-75, 5);
    expect(offsetOf(wrapper, '[data-ig-slide="previous"]')).toBeNull();

    window.dispatchEvent(pointerEvent('pointermove', STAGE * 0.5));
    window.dispatchEvent(pointerEvent('pointerup', STAGE * 0.5));
    await nextTick();

    expect(counter()).toContain('3 of 5');
    expect(wrapper.emitted('change')).toEqual([[2]]);
  });

  it('goes back on a leftward drag', async () => {
    const wrapper = mountGallery('rtl');

    await openAt(wrapper, 2);

    const stage = wrapper.get('.image-gallery-stage').element;
    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', -STAGE / 4));
    await nextTick();

    expect(offsetOf(wrapper, '[data-ig-slide="previous"]')).toBeCloseTo(75, 5);

    window.dispatchEvent(pointerEvent('pointermove', -STAGE * 0.5));
    window.dispatchEvent(pointerEvent('pointerup', -STAGE * 0.5));
    await nextTick();

    expect(counter()).toContain('1 of 5');
  });

  it('steps forward through the grid with ArrowLeft', async () => {
    const wrapper = mountGallery('rtl');

    await openAt(wrapper, 2);
    await wrapper.get('button[aria-label="All images"]').trigger('click');
    await nextTick();

    const tile = wrapper.get('[data-bento-index="1"]');
    (tile.element as HTMLElement).focus();

    await tile.trigger('keydown', { key: 'ArrowLeft' });
    expect((document.activeElement as HTMLElement | null)?.dataset.bentoIndex).toBe('2');

    await wrapper.get('[data-bento-index="2"]').trigger('keydown', { key: 'ArrowRight' });
    expect((document.activeElement as HTMLElement | null)?.dataset.bentoIndex).toBe('1');
  });
});
