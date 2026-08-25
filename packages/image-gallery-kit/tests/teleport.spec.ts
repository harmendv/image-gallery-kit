import { mount } from '@vue/test-utils';
import { afterEach } from 'vitest';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import ImageGallery from '@/components/ImageGallery.vue';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 }
];

// These specs opt out of the global teleport stub: the point is where the
// dialog actually lands in the document.
const realTeleport = { global: { stubs: { teleport: false } } };

afterEach(() => {
  document.body.innerHTML = '';
});

describe('dialog teleport', () => {
  it('escapes an ancestor that would otherwise contain the fixed overlay', async () => {
    // A transform on any ancestor makes it the containing block for position:
    // fixed, so an in-place dialog is clipped by the host instead of covering
    // the viewport.
    const host = document.createElement('div');
    host.style.transform = 'translateZ(0)';
    host.style.overflow = 'hidden';
    document.body.appendChild(host);

    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: { default: previewSlot(images) },
      attachTo: host,
      ...realTeleport
    });
    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog!.parentElement).toBe(document.body);
    expect(host.contains(dialog)).toBe(false);

    wrapper.unmount();
  });

  it('removes the teleported dialog on close and on unmount', async () => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: { default: previewSlot(images) },
      attachTo: document.body,
      ...realTeleport
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);

    const close = document.querySelector<HTMLButtonElement>('button[aria-label="Close dialog"]');
    expect(close).not.toBeNull();
    close!.click();
    await wrapper.vm.$nextTick();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);

    // Unmounting while open must not orphan the dialog in <body>.
    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(1);
    wrapper.unmount();
    expect(document.querySelectorAll('[role="dialog"]')).toHaveLength(0);
  });

  it('renders the open dialog in place during SSR, where there is no body to teleport to', async () => {
    const app = createSSRApp({
      render: () => h(ImageGallery, { images, rows: 1, columns: 2, open: true, index: 0 })
    });

    const html = await renderToString(app);

    expect(html).toContain('role="dialog"');
  });
});
