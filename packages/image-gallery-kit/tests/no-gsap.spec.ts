import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import ImageGallery from '@/components/ImageGallery.vue';
import type { GalleryImage } from '@/types';

// gsap is an optional peer: simulate a consumer who has not installed it.
vi.mock('gsap', () => { throw new Error('Cannot find module gsap'); });

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 }
];

describe('without gsap installed', () => {
  it('still opens, navigates and closes the dialog', async () => {
    const wrapper = mount(ImageGallery, { props: { images, rows: 1, columns: 2 }, attachTo: document.body });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

    await wrapper.get('button[aria-label="Next image"]').trigger('click');
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 2');

    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    expect(document.querySelectorAll('body > [aria-hidden="true"]')).toHaveLength(0);
    wrapper.unmount();
  });
});
