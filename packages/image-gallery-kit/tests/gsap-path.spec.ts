import { mount } from '@vue/test-utils';
import ImageGallery from '@/components/ImageGallery.vue';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 }
];

describe('gsap transition path', () => {
  it('creates a flying clone and resolves cleanly when gsap is available', async () => {
    // jsdom reports zero-size rects, so give the frames real geometry.
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        toJSON: () => ({})
      } as DOMRect;
    };

    const wrapper = mount(ImageGallery, { props: { images, rows: 1, columns: 2 }, attachTo: document.body });
    const gsap = await import('gsap');
    expect(gsap.gsap).toBeTruthy();

    const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await new Promise((r) => setTimeout(r, 60));
    const cloneDuringFlight = document.querySelectorAll('body > [aria-hidden="true"]').length;

    await open;
    await new Promise((r) => setTimeout(r, 1200));

    Element.prototype.getBoundingClientRect = origRect;

    expect(cloneDuringFlight).toBeGreaterThan(0);
    expect(document.querySelectorAll('body > [aria-hidden="true"]')).toHaveLength(0);
    wrapper.unmount();
  });
});
