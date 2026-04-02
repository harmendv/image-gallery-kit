import { mount } from '@vue/test-utils';
import { createSSRApp, h } from 'vue';
import { renderToString } from '@vue/server-renderer';
import ImageGallery from '@/components/ImageGallery.vue';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 },
  { src: '/three.jpg', alt: 'Three', width: 1000, height: 1000 },
  { src: '/four.jpg', alt: 'Four', width: 900, height: 1200 }
];

const manyImages: GalleryImage[] = Array.from({ length: 9 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`,
  width: index % 2 === 0 ? 1200 : 900,
  height: index % 2 === 0 ? 900 : 1200
}));

describe('ImageGallery', () => {
  it('uses four visible preview items by default without a featured main image', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages
      }
    });

    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(4);
  });

  it('limits preview items and shows the all-images trigger on the final tile', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    const openButtons = wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])');
    expect(openButtons).toHaveLength(3);
    expect(wrapper.get('button[aria-label="Show all 4 images"]').exists()).toBe(true);
  });

  it('opens the clicked image in single-image mode', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 2"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 4');
    expect(wrapper.get('img[alt="Two"]').exists()).toBe(true);
  });

  it('keeps the last preview image clickable for single mode while the icon opens bento mode', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 3"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 4');

    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');
    await wrapper.get('button[aria-label="Show all 4 images"]').trigger('click');

    expect(wrapper.findAll('button[aria-label$="from grid"]')).toHaveLength(4);
  });

  it('opens bento mode from the preview overflow trigger', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    await wrapper.get('button[aria-label="Show all 4 images"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.findAll('button[aria-label$="from grid"]')).toHaveLength(4);
  });

  it('renders bento items with their own aspect ratios', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    await wrapper.get('button[aria-label="Show all 4 images"]').trigger('click');

    const bentoFrames = wrapper.findAll('[aria-label$="from grid"] > div');
    expect(bentoFrames[0].attributes('style')).toContain('aspect-ratio: 800 / 1200');
    expect(bentoFrames[1].attributes('style')).toContain('aspect-ratio: 1200 / 800');
  });

  it('supports a featured main image layout in the preview', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        previewCount: 5,
        mainImageIndex: 2
      }
    });

    expect(wrapper.get('button[aria-label="Open image 3"]').exists()).toBe(true);
    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])').length).toBe(5);
  });

  it('keeps an intrinsic aspect ratio for the featured main image when height is set', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        previewCount: 5,
        mainImageIndex: 2,
        height: '25rem',
        previewAspectRatio: '4 / 5'
      }
    });

    const featuredLayout = wrapper.get('.image-gallery-featured');
    expect(featuredLayout.attributes('style')).toContain('--ig-preview-aspect-ratio: 4 / 5');
    expect(featuredLayout.attributes('data-fixed-height')).toBe('true');
  });

  it('normalizes unsupported preview counts without main image', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        previewCount: 5
      }
    });

    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(4);
  });

  it('normalizes unsupported preview counts with main image', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        previewCount: 8,
        mainImageIndex: 0
      }
    });

    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(7);
  });

  it('toggles between single view and bento view and returns to the chosen image', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');
    await wrapper.get('button[aria-label="Open image 3 from grid"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 4');
    expect(wrapper.get('img[alt="Three"]').exists()).toBe(true);
  });

  it('hides single-view header controls in masonry mode', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        previewCount: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

    expect(wrapper.find('button[aria-label="Toggle image grid"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('1 of 4');
    expect(wrapper.get('button[aria-label="Open image 2 from grid"]').exists()).toBe(true);
  });

  it('renders on the server without touching browser globals', async () => {
    const app = createSSRApp({
      render: () =>
        h(ImageGallery, {
          images,
          previewCount: 3,
          previewAspectRatio: '4 / 5'
        })
    });

    const html = await renderToString(app);

    expect(html).toContain('Open image 1');
    expect(html).not.toContain('role="dialog"');
  });
});
