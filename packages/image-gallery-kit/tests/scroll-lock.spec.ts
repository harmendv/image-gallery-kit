import { mount } from '@vue/test-utils';
import ImageGallery from '@/components/ImageGallery.vue';
import { acquireScrollLock } from '@/utils/scrollLock';
import type { GalleryImage } from '@/types';
import { previewSlot } from './helpers';

const images: GalleryImage[] = Array.from({ length: 3 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: 1000,
  height: 1000
}));

function mountControlled() {
  return mount(ImageGallery, {
    props: { images, open: false },
    slots: { default: previewSlot(images, 1) },
    attachTo: document.body
  });
}

function settle() {
  return new Promise((resolve) => setTimeout(resolve, 60));
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
});

/*
 * The lock is page state, not gallery state: two dialogs open at once share
 * one body, so the page only thaws when the last of them lets go -- whatever
 * order they close in.
 */
describe('the body scroll lock across galleries', () => {
  it('holds until the last open dialog closes, then restores the original styles', async () => {
    document.body.style.overflow = 'scroll';

    const first = mountControlled();
    const second = mountControlled();

    await first.setProps({ open: true });
    await settle();
    await second.setProps({ open: true });
    await settle();

    expect(document.body.style.overflow).toBe('hidden');

    // Closed in opening order: the first to close must not thaw the page
    // under a dialog that is still open.
    await first.setProps({ open: false });
    await settle();
    expect(document.body.style.overflow).toBe('hidden');

    await second.setProps({ open: false });
    await settle();
    expect(document.body.style.overflow).toBe('scroll');

    first.unmount();
    second.unmount();
  });

  it('releases the lock when a gallery unmounts while its dialog is open', async () => {
    const first = mountControlled();
    const second = mountControlled();

    await first.setProps({ open: true });
    await settle();
    await second.setProps({ open: true });
    await settle();

    second.unmount();
    expect(document.body.style.overflow).toBe('hidden');

    // Closing after unmount-while-open must not count the second gallery twice.
    await first.setProps({ open: false });
    await settle();
    expect(document.body.style.overflow).toBe('');

    first.unmount();
  });
});

describe('acquireScrollLock', () => {
  it('saves the page styles on the first hold and restores them on the last release', () => {
    document.body.style.overflow = 'auto';
    document.body.style.position = 'relative';

    const releaseFirst = acquireScrollLock();
    const releaseSecond = acquireScrollLock();

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('fixed');
    expect(document.documentElement.style.overflow).toBe('hidden');

    releaseFirst();
    expect(document.body.style.position).toBe('fixed');

    releaseSecond();
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.style.position).toBe('relative');
    expect(document.documentElement.style.overflow).toBe('');
  });

  it('ignores a second release of the same hold', () => {
    const releaseFirst = acquireScrollLock();
    const releaseSecond = acquireScrollLock();

    releaseFirst();
    releaseFirst();
    expect(document.body.style.overflow).toBe('hidden');

    releaseSecond();
    expect(document.body.style.overflow).toBe('');
  });

  it('pins the body at the current scroll offset and scrolls back on release', () => {
    const scrollTo = vi.spyOn(window, 'scrollTo');
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 240 });

    const release = acquireScrollLock();
    expect(document.body.style.top).toBe('-240px');

    release();
    expect(document.body.style.top).toBe('');
    expect(scrollTo).toHaveBeenCalledWith(0, 240);

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 });
    scrollTo.mockRestore();
  });
});
