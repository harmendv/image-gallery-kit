import { mount } from '@vue/test-utils';
import { gsap } from 'gsap';
import ImageGalleryKit from '@/index';
import ImageGallery from '@/components/ImageGallery.vue';
import { cloneInFlight, holdFlights, landed, releaseFlights } from './flight';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 }
];

/*
 * gsap is only ever what the consumer hands over, so each way of handing it
 * over has to reach the flight: the prop on one gallery, or the plugin option
 * for every gallery in the app.
 */
const setups = {
  'the gsap prop': { props: { images, gsap } },
  'the plugin option': { props: { images }, global: { plugins: [[ImageGalleryKit, { gsap }]] } }
} as const;

describe('gsap transition path', () => {
  it.each(Object.entries(setups))(
    'flies a clone and resolves cleanly when gsap comes through %s',
    async (_, setup) => {
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

      const wrapper = mount(ImageGallery, {
        ...setup,
        slots: { default: previewSlot(images) },
        attachTo: document.body
      } as Parameters<typeof mount>[1]);

      // Held at take-off, so the clone is still there however late this looks.
      holdFlights();
      const open = wrapper.get('button[aria-label="Open image 1"]').trigger('click');

      try {
        await cloneInFlight();
        expect(document.querySelectorAll('[data-ig-flight="true"]')).toHaveLength(1);
      } finally {
        releaseFlights();
      }

      await open;
      await landed();

      Element.prototype.getBoundingClientRect = origRect;

      expect(document.querySelectorAll('[data-ig-flight="true"]')).toHaveLength(0);
      wrapper.unmount();
    }
  );
});
