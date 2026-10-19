import { mount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';
import { h, nextTick } from 'vue';
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

// A consumer control in the toolbar, the case the issue reports: the dialog's
// window listener must leave keys alone while they belong to the field.
async function mountWithToolbar(toolbar: () => unknown = () => null) {
  const wrapper = mount(ImageGallery, {
    props: { images },
    slots: { default: tiles(images), 'dialog-toolbar': toolbar },
    attachTo: document.body
  });

  await wrapper.get('button[aria-label="Open image 2"]').trigger('click');
  await nextTick();

  return wrapper;
}

// Dispatched on the element, not on window, so the listener sees the real
// target and whatever the element's own handlers did on the way up.
async function press(target: EventTarget, key: string, init: KeyboardEventInit = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init });
  target.dispatchEvent(event);
  await nextTick();
  return event;
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('dialog keyboard', () => {
  it('steps through images with the bare arrow keys', async () => {
    const wrapper = await mountWithToolbar();

    const next = await press(document.body, 'ArrowRight');
    const previous = await press(document.body, 'ArrowLeft');

    expect(next.defaultPrevented).toBe(true);
    expect(previous.defaultPrevented).toBe(true);
    expect(wrapper.emitted('update:index')).toEqual([[1], [2], [1]]);

    wrapper.unmount();
  });

  it.each([
    ['an input', () => h('input', { 'data-test': 'field', type: 'text' })],
    ['a textarea', () => h('textarea', { 'data-test': 'field' })],
    ['a select', () => h('select', { 'data-test': 'field' }, [h('option', 'a'), h('option', 'b')])],
    ['a contenteditable element', () => h('div', { 'data-test': 'field', contenteditable: 'true' })]
  ])('leaves the arrow keys to %s in the dialog', async (_name, toolbar) => {
    const wrapper = await mountWithToolbar(toolbar);
    const field = wrapper.get('[data-test="field"]').element as HTMLElement;
    field.focus();

    const right = await press(field, 'ArrowRight');
    const left = await press(field, 'ArrowLeft');

    expect(right.defaultPrevented).toBe(false);
    expect(left.defaultPrevented).toBe(false);
    expect(wrapper.emitted('update:index')).toEqual([[1]]);

    wrapper.unmount();
  });

  it.each(['altKey', 'ctrlKey', 'metaKey', 'shiftKey'] as const)(
    'leaves an arrow key with %s held to the browser',
    async (modifier) => {
      const wrapper = await mountWithToolbar();

      const event = await press(document.body, 'ArrowLeft', { [modifier]: true });

      expect(event.defaultPrevented).toBe(false);
      expect(wrapper.emitted('update:index')).toEqual([[1]]);

      wrapper.unmount();
    }
  );

  it('ignores keys another handler already claimed', async () => {
    const wrapper = await mountWithToolbar(() => h('button', { 'data-test': 'claimer' }, 'Menu'));
    const claimer = wrapper.get('[data-test="claimer"]').element as HTMLElement;
    claimer.addEventListener('keydown', (event) => event.preventDefault());

    await press(claimer, 'ArrowRight');
    await press(claimer, 'Escape');

    expect(wrapper.emitted('update:index')).toEqual([[1]]);
    expect(wrapper.emitted('update:open')).toEqual([[true]]);

    wrapper.unmount();
  });

  it('still closes on Escape from a text field', async () => {
    const wrapper = await mountWithToolbar(() => h('input', { 'data-test': 'field', type: 'text' }));
    const field = wrapper.get('[data-test="field"]').element as HTMLElement;
    field.focus();

    const event = await press(field, 'Escape');

    expect(event.defaultPrevented).toBe(true);
    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);

    wrapper.unmount();
  });

  it('does not close on the Escape that ends an IME composition', async () => {
    const wrapper = await mountWithToolbar(() => h('input', { 'data-test': 'field', type: 'text' }));
    const field = wrapper.get('[data-test="field"]').element as HTMLElement;
    field.focus();

    await press(field, 'Escape', { isComposing: true });

    expect(wrapper.emitted('update:open')).toEqual([[true]]);

    wrapper.unmount();
  });
});
