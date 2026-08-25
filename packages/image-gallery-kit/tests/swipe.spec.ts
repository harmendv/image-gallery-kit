import { mount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';
import { nextTick } from 'vue';
import ImageGallery from '@/components/ImageGallery.vue';
import type { GalleryImage } from '@/types';
import { previewSlot as tiles } from './helpers';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 },
  { src: '/three.jpg', alt: 'Three', width: 1000, height: 1000 }
];

/*
 * jsdom ships no PointerEvent constructor, and the component only ever reads the
 * handful of fields below -- so a plain Event carrying them is a faithful enough
 * stand-in, and the alternative (a MouseEvent shim per property) would test the
 * shim rather than the gesture.
 */
function pointerEvent(type: string, init: Partial<Record<'clientX' | 'clientY' | 'pointerId', number>> = {}) {
  const event = new Event(type, { bubbles: true, cancelable: true });

  return Object.assign(event, {
    pointerId: init.pointerId ?? 1,
    pointerType: 'touch',
    button: 0,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0
  }) as unknown as PointerEvent;
}

function flushFrame() {
  return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
}

/*
 * The snap after release is animated frame by frame, so the resting state only
 * arrives a few hundred milliseconds later. Polling for it keeps these specs
 * honest about that without paying the full duration in every one of them.
 */
/* eslint-disable no-await-in-loop -- polling waits for each frame in turn; that is the point */
async function settled(wrapper: ReturnType<typeof openDialog>) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const frame = wrapper.find('.image-gallery-stage-frame');

    if (!frame.exists() || !/translate|opacity/.test(frame.attributes('style') ?? '')) {
      return;
    }

    await flushFrame();
    await nextTick();
  }

  throw new Error('the turn never came to rest');
}
/* eslint-enable no-await-in-loop */

/* Drags and releases, then waits for the snap that follows to come to rest. */
async function swipe(wrapper: ReturnType<typeof openDialog>, { x = 0, y = 0, steps = 2 } = {}) {
  wrapper
    .get('.image-gallery-stage')
    .element.dispatchEvent(pointerEvent('pointerdown', { clientX: 0, clientY: 0 }));

  for (let step = 1; step <= steps; step += 1) {
    window.dispatchEvent(
      pointerEvent('pointermove', { clientX: (x / steps) * step, clientY: (y / steps) * step })
    );
  }

  window.dispatchEvent(pointerEvent('pointerup', { clientX: x, clientY: y }));
  await nextTick();
  await settled(wrapper);
}

/* Two positions a real interval apart, which is what a flick needs to be one. */
async function drag(stage: Element, from: number, to: number, overMs: number) {
  window.dispatchEvent(pointerEvent('pointermove', { clientX: from }));
  await new Promise((resolve) => setTimeout(resolve, overMs));
  window.dispatchEvent(pointerEvent('pointermove', { clientX: to }));
}

function openDialog(props: Record<string, unknown> = {}) {
  const collection = (props.images as GalleryImage[]) ?? images;

  return mount(ImageGallery, {
    props: { images: collection, open: true, ...props },
    slots: { default: tiles(collection) }
  });
}

function counter(wrapper: ReturnType<typeof openDialog>) {
  return wrapper.get('[role="dialog"]').attributes('aria-label');
}

function opacityOf(wrapper: ReturnType<typeof openDialog>, selector: string) {
  const style = wrapper.get(selector).attributes('style') ?? '';
  const match = /(?:^|;)\s*opacity:\s*([\d.]+)/.exec(style);

  return match ? Number(match[1]) : null;
}

/*
 * How far along its own width the element is translated, as a percentage and
 * signed; null when it carries no offset at all. The gap half of the offset is a
 * token this side cannot resolve, so the percentage is what gets asserted -- it
 * is the half that has to mirror.
 */
function offsetOf(wrapper: ReturnType<typeof openDialog>, selector: string) {
  const style = wrapper.get(selector).attributes('style') ?? '';
  const match = /translate(?:X)?\(calc\((-?[\d.]+)%/.exec(style);

  return match ? Number(match[1]) : null;
}

/*
 * The gap rides along with the percentage so the pair never overlaps: both halves
 * of the offset scale by the same factor, and this reads that factor back.
 */
function gapFactorOf(wrapper: ReturnType<typeof openDialog>, selector: string) {
  const style = wrapper.get(selector).attributes('style') ?? '';
  const match = /(-?[\d.]+) \* var\(--ig-dialog-slide-gap/.exec(style);

  return match ? Number(match[1]) : null;
}

/*
 * jsdom lays nothing out, so the stage measures 0 and the component falls back to
 * the window width. Progress is a fraction of that, which makes the numbers below
 * readable: a 1024px drag is a whole turn.
 */
const STAGE = 1024;

/* Mirrors SWIPE_SETTLE_MS + its deadline margin in the component. */
const SETTLE_DEADLINE_MS = 320 + 250;

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('dialog swipe', () => {
  it('advances on a leftward drag and goes back on a rightward one', async () => {
    const wrapper = openDialog();

    await swipe(wrapper, { x: -STAGE * 0.4 });
    expect(counter(wrapper)).toContain('2 of 3');

    await swipe(wrapper, { x: STAGE * 0.4 });
    expect(counter(wrapper)).toContain('1 of 3');
  });

  it('wraps around at both ends, like the arrows do', async () => {
    const wrapper = openDialog();

    await swipe(wrapper, { x: STAGE * 0.4 });
    expect(counter(wrapper)).toContain('3 of 3');

    await swipe(wrapper, { x: -STAGE * 0.4 });
    expect(counter(wrapper)).toContain('1 of 3');
  });

  it('emits change so a controlled consumer sees the swipe', async () => {
    const wrapper = openDialog();

    await swipe(wrapper, { x: -STAGE * 0.4 });

    expect(wrapper.emitted('change')).toEqual([[1]]);
    expect(wrapper.emitted('update:index')).toEqual([[1]]);
  });

  it('leaves a vertical drag alone so host content stays scrollable', async () => {
    const wrapper = openDialog();

    await swipe(wrapper, { x: -STAGE * 0.4, y: -STAGE * 0.6 });

    expect(counter(wrapper)).toContain('1 of 3');
    expect(wrapper.emitted('change')).toBeUndefined();
  });

  it('slides the pair as one, a whole image apart, with only a wash of fade', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: -STAGE / 4 }));
    await nextTick();

    /*
     * A quarter of the way through, the outgoing image is a quarter of a slide
     * out and the incoming one three quarters still to come -- which puts exactly
     * one slide between them, as it does at every other point in the turn. That
     * is the property that keeps them from ever overlapping.
     */
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(-25, 5);
    expect(offsetOf(wrapper, '[data-ig-slide="next"]')).toBeCloseTo(75, 5);
    expect(gapFactorOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(-0.25, 5);
    expect(gapFactorOf(wrapper, '[data-ig-slide="next"]')).toBeCloseTo(0.75, 5);

    // Neither image is anywhere near transparent: the fade is a wash, not a
    // dissolve, so the movement is what carries the gesture.
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(0.9125, 5);
    expect(opacityOf(wrapper, '[data-ig-slide="next"]')).toBeCloseTo(0.7375, 5);

    // The neighbour on the other side stays where the stylesheet put it.
    expect(opacityOf(wrapper, '[data-ig-slide="previous"]')).toBeNull();
    expect(offsetOf(wrapper, '[data-ig-slide="previous"]')).toBeNull();
  });

  it('turns exactly one image however far the drag runs on', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: -4 * STAGE }));
    await nextTick();

    // Held at fully in rather than running on into the image after it.
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBe(-100);
    expect(offsetOf(wrapper, '[data-ig-slide="next"]')).toBeNull();
    expect(opacityOf(wrapper, '[data-ig-slide="next"]')).toBe(1);

    window.dispatchEvent(pointerEvent('pointerup', { clientX: -4 * STAGE }));
    await nextTick();
    await flushFrame();
    await nextTick();

    expect(counter(wrapper)).toContain('2 of 3');
    expect(wrapper.emitted('change')).toEqual([[1]]);
  });

  it('snaps back over several frames when the drag stops short, rather than jumping', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage');

    stage.element.dispatchEvent(pointerEvent('pointerdown'));
    // Dragged a fifth of the way and held there past the velocity window, so what
    // it was let go at is a standstill: a short drag, not a flick.
    await drag(stage.element, -STAGE * 0.2, -STAGE * 0.2, 150);
    window.dispatchEvent(pointerEvent('pointerup', { clientX: -STAGE * 0.2 }));
    await nextTick();

    // Still exactly where the finger left it: the snap travels, it does not
    // teleport, so the frame after release is not the resting frame.
    expect(counter(wrapper)).toContain('1 of 3');
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(-20, 5);

    await flushFrame();
    await flushFrame();
    await nextTick();

    const partWay = offsetOf(wrapper, '.image-gallery-stage-frame');
    expect(partWay).not.toBeNull();
    expect(partWay!).toBeGreaterThan(-20);
    expect(partWay!).toBeLessThan(0);

    await settled(wrapper);

    expect(counter(wrapper)).toContain('1 of 3');
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
  });

  it('snaps in on a fast flick that never got far', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    // A tenth of the stage, well short of the distance rule -- but thrown: 51px
    // in 20ms is 2.5px/ms, six times the flick threshold.
    stage.dispatchEvent(pointerEvent('pointerdown'));
    await drag(stage, -STAGE * 0.05, -STAGE * 0.1, 20);
    window.dispatchEvent(pointerEvent('pointerup', { clientX: -STAGE * 0.1 }));
    await nextTick();
    await settled(wrapper);

    expect(counter(wrapper)).toContain('2 of 3');
  });

  it('ignores a flick thrown back the way it came', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    // Pulled a third of the way in, then thrown back: plainly a change of mind.
    stage.dispatchEvent(pointerEvent('pointerdown'));
    await drag(stage, -STAGE * 0.3, -STAGE * 0.1, 20);
    window.dispatchEvent(pointerEvent('pointerup', { clientX: -STAGE * 0.1 }));
    await nextTick();
    await settled(wrapper);

    expect(counter(wrapper)).toContain('1 of 3');
  });

  it('re-anchors the turn on commit so neither image jumps', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: -STAGE * 0.4 }));
    window.dispatchEvent(pointerEvent('pointerup', { clientX: -STAGE * 0.4 }));
    await nextTick();

    /*
     * The index has already moved, so the frame holds the image that was
     * arriving and the previous neighbour the one that was leaving -- each still
     * on the offset and opacity it had under the finger a moment ago, read from
     * the other side of the swap.
     */
    expect(counter(wrapper)).toContain('2 of 3');
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(60, 5);
    expect(offsetOf(wrapper, '[data-ig-slide="previous"]')).toBeCloseTo(-40, 5);
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(0.79, 5);
    expect(opacityOf(wrapper, '[data-ig-slide="previous"]')).toBeCloseTo(0.86, 5);
    expect(wrapper.get('[data-ig-slide="previous"] img').attributes('src')).toBe('/one.jpg');

    // The first frame only starts the clock; the second is the first to move.
    await flushFrame();
    await flushFrame();
    await nextTick();

    // And from there it travels the rest of the way in rather than arriving.
    const partWay = offsetOf(wrapper, '.image-gallery-stage-frame');
    expect(partWay).not.toBeNull();
    expect(partWay!).toBeLessThan(60);
    expect(partWay!).toBeGreaterThan(0);

    await settled(wrapper);

    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
    expect(opacityOf(wrapper, '[data-ig-slide="previous"]')).toBeNull();
  });

  it('lets a new drag take over from a snap still in flight', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: -STAGE * 0.4 }));
    window.dispatchEvent(pointerEvent('pointerup', { clientX: -STAGE * 0.4 }));
    await nextTick();

    // The second drag starts before the snap's frame runs: it must not be
    // re-zeroed underneath the finger, nor inherit the snap's own progress.
    stage.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2 }));
    await flushFrame();
    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 2, clientX: -STAGE / 2 }));
    await nextTick();

    // Half a stage dragged, from a standing start: half a slide out, not the
    // 0.6 the abandoned snap was sitting at.
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(-50, 5);
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(0.825, 5);

    window.dispatchEvent(pointerEvent('pointerup', { pointerId: 2, clientX: -STAGE / 2 }));
    await nextTick();
    await flushFrame();
    await nextTick();

    expect(counter(wrapper)).toContain('3 of 3');
  });

  it('still finishes the turn when no paint ever arrives', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    // A backgrounded tab pauses requestAnimationFrame: the callback is queued and
    // never runs. Without the deadline behind it, both images would sit stranded
    // mid-turn for as long as the reader stayed on another tab.
    const frozen = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 1);

    try {
      stage.dispatchEvent(pointerEvent('pointerdown'));
      window.dispatchEvent(pointerEvent('pointermove', { clientX: -STAGE * 0.4 }));
      window.dispatchEvent(pointerEvent('pointerup', { clientX: -STAGE * 0.4 }));
      await nextTick();

      expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeCloseTo(60, 5);

      await new Promise((resolve) => setTimeout(resolve, SETTLE_DEADLINE_MS + 120));
      await nextTick();
    } finally {
      frozen.mockRestore();
    }

    // Finished outright by the deadline rather than left stranded mid-turn.
    expect(counter(wrapper)).toContain('2 of 3');
    expect(offsetOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
  });

  it('keeps both neighbours mounted and hidden from readers', async () => {
    const wrapper = openDialog();

    const slides = wrapper.findAll('.image-gallery-stage-slide');
    expect(slides).toHaveLength(2);

    // Wrapping, like the arrows: at index 0 the previous image is the last one.
    expect(wrapper.get('[data-ig-slide="previous"] img').attributes('src')).toBe('/three.jpg');
    expect(wrapper.get('[data-ig-slide="next"] img').attributes('src')).toBe('/two.jpg');

    // Duplicates of an image the reader is already being told about.
    slides.forEach((slide) => {
      expect(slide.attributes('aria-hidden')).toBe('true');
      expect(slide.get('img').attributes('alt')).toBe('');
    });

    await swipe(wrapper, { x: -STAGE * 0.4 });

    expect(wrapper.get('[data-ig-slide="previous"] img').attributes('src')).toBe('/one.jpg');
    expect(wrapper.get('[data-ig-slide="next"] img').attributes('src')).toBe('/three.jpg');
  });

  it('abandons the gesture when a second finger joins, so a pinch never pages', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    stage.dispatchEvent(pointerEvent('pointerdown', { pointerId: 1 }));
    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: -40 }));
    stage.dispatchEvent(pointerEvent('pointerdown', { pointerId: 2, clientX: 200 }));
    window.dispatchEvent(pointerEvent('pointermove', { pointerId: 1, clientX: -STAGE }));
    window.dispatchEvent(pointerEvent('pointerup', { pointerId: 1, clientX: -STAGE }));
    await nextTick();

    expect(counter(wrapper)).toContain('1 of 3');
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
  });

  it('resets a drag in flight when a pointercancel arrives', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;

    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: -STAGE * 0.4 }));
    await nextTick();
    window.dispatchEvent(pointerEvent('pointercancel', { clientX: -STAGE * 0.4 }));
    await nextTick();
    await settled(wrapper);

    // Snapped back, not committed: a cancelled gesture is not a decision.
    expect(counter(wrapper)).toContain('1 of 3');
    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
  });

  it('does not page twice when a drag happens to end on an arrow', async () => {
    const wrapper = openDialog();
    const next = wrapper.get('button[aria-label="Next image"]');

    await swipe(wrapper, { x: -STAGE * 0.4 });
    expect(counter(wrapper)).toContain('2 of 3');

    // The browser still delivers the click the drag ended on; the stage eats it.
    await next.trigger('click');
    expect(counter(wrapper)).toContain('2 of 3');

    // And the arrow keeps working on a real click afterwards.
    await next.trigger('click');
    expect(counter(wrapper)).toContain('3 of 3');
  });

  it('eats only the click its own drag leaves behind, not the next press', async () => {
    const wrapper = openDialog();
    const stage = wrapper.get('.image-gallery-stage').element;
    const next = wrapper.get('button[aria-label="Next image"]');

    await swipe(wrapper, { x: -STAGE * 0.4 });
    expect(counter(wrapper)).toContain('2 of 3');

    /*
     * A touch drag often leaves no click at all, so the suppression cannot just
     * wait for one -- a press that comes later is a press, and pressing an arrow
     * after swiping has to work.
     */
    stage.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointerup'));
    await next.trigger('click');

    expect(counter(wrapper)).toContain('3 of 3');
  });

  it('has no swipe surface in the grid, and no neighbours for a single image', async () => {
    const wrapper = openDialog();

    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');
    expect(wrapper.find('.image-gallery-stage').exists()).toBe(false);

    const single = openDialog({ images: [images[0]] });

    expect(single.findAll('.image-gallery-stage-slide')).toHaveLength(0);

    await swipe(single, { x: -STAGE * 0.4 });
    expect(single.emitted('change')).toBeUndefined();
  });

  it('drops the turn when the dialog closes mid-drag', async () => {
    const wrapper = openDialog();

    wrapper.get('.image-gallery-stage').element.dispatchEvent(pointerEvent('pointerdown'));
    window.dispatchEvent(pointerEvent('pointermove', { clientX: -STAGE * 0.4 }));
    await nextTick();

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    expect(opacityOf(wrapper, '.image-gallery-stage-frame')).toBeNull();
  });
});
