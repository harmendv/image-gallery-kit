import { mount } from '@vue/test-utils';
import { afterEach } from 'vitest';
import { createSSRApp, h, nextTick } from 'vue';
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

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('ImageGallery', () => {
  it('uses rows and columns as sparse grid capacity', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 3,
        allowGridView: false
      }
    });

    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(3);
    expect(wrapper.find('.image-gallery-featured').exists()).toBe(false);
  });

  it('keeps a single image to one slot in a multi-column grid', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: [images[0]],
        rows: 1,
        columns: 3
      }
    });

    const grid = wrapper.get('.image-gallery-secondary');
    expect(grid.attributes('style')).toContain('grid-template-columns: repeat(3, minmax(0, 1fr))');
    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(1);
  });

  it('opens the clicked image in single-image mode', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 2"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 4');
    expect(wrapper.find('img[alt="Two"]').exists()).toBe(true);
  });

  it('opens bento mode from the replace-last-tile overflow trigger', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 2
      }
    });

    await wrapper.get('button[aria-label="Show all 4 images"]').trigger('click');

    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    expect(wrapper.findAll('button[aria-label$="from grid"]')).toHaveLength(4);
  });

  it('keeps all configured image slots visible in replace-last-tile mode', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 2,
        columns: 2,
        mainImageIndex: 0,
        mainImagePosition: 'left'
      }
    });

    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(5);
    expect(wrapper.find('button[aria-label="Show all 9 images"]').exists()).toBe(true);
  });

  it('hides the overflow trigger when grid view is disabled', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 2,
        allowGridView: false
      }
    });

    expect(wrapper.find('button[aria-label^="Show all"]').exists()).toBe(false);
  });

  it('keeps the dialog carousel-only when grid view is disabled', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 2,
        allowGridView: false
      }
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    expect(wrapper.find('button[aria-label="Toggle image grid"]').exists()).toBe(false);
  });

  it('supports a left-docked featured layout that excludes the main image from the secondary grid', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 2,
        columns: 2,
        mainImageIndex: 2,
        mainImagePosition: 'left',
        mainImageSize: 0.35,
        allowGridView: false
      }
    });

    const featuredLayout = wrapper.get('.image-gallery-featured');
    expect(featuredLayout.attributes('style')).toContain('grid-template-columns');
    expect(wrapper.find('button[aria-label="Open image 3"]').exists()).toBe(true);
    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(5);
  });

  it('supports top-docked main image sizing via a CSS length', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 2,
        columns: 2,
        mainImageIndex: 0,
        mainImagePosition: 'top',
        mainImageSize: '14rem'
      }
    });

    const featuredLayout = wrapper.get('.image-gallery-featured');
    expect(featuredLayout.attributes('style')).toContain('grid-template-rows');
    expect(featuredLayout.attributes('style')).toContain('14rem');
  });

  it('gives top-docked fractional main images an intrinsic height when no explicit gallery height is set', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 4,
        columns: 4,
        mainImageIndex: 0,
        mainImagePosition: 'top',
        mainImageSize: 0.4
      }
    });

    const mainItem = wrapper.get('button[aria-label="Open image 1"]').element.parentElement;
    const mainFrame = wrapper.get('button[aria-label="Open image 1"] > div');
    expect(mainItem?.getAttribute('style')).toContain('height: calc(');
    expect(mainFrame.attributes('style')).toContain('height: calc(');
  });

  it('places a right-docked main image in the second column', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 2,
        columns: 2,
        mainImageIndex: 2,
        mainImagePosition: 'right',
        mainImageSize: 0.42
      }
    });

    const mainImage = wrapper.get('button[aria-label="Open image 3"]').element.parentElement;
    expect(mainImage?.getAttribute('style')).toContain('grid-column: 2');
  });

  it('places a bottom-docked main image in the second row', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 2,
        columns: 3,
        mainImageIndex: 4,
        mainImagePosition: 'bottom',
        mainImageSize: '12rem'
      }
    });

    const mainImage = wrapper.get('button[aria-label="Open image 5"]').element.parentElement;
    expect(mainImage?.getAttribute('style')).toContain('grid-row: 2');
  });

  it('does not force the secondary grid to 100% height for bottom-docked layouts without an explicit height', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 4,
        columns: 4,
        mainImageIndex: 0,
        mainImagePosition: 'bottom',
        mainImageSize: 0.4,
        width: '800px'
      }
    });

    const secondaryGrid = wrapper.get('.image-gallery-secondary');
    expect(secondaryGrid.attributes('style')).not.toContain('height: 100%');
    expect(wrapper.find('button[aria-label="Open image 1"]').exists()).toBe(true);
  });

  it('gives bottom-docked fractional main images an intrinsic height when no explicit gallery height is set', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: manyImages,
        rows: 4,
        columns: 4,
        mainImageIndex: 0,
        mainImagePosition: 'bottom',
        mainImageSize: 0.4
      }
    });

    const mainItem = wrapper.get('button[aria-label="Open image 1"]').element.parentElement;
    const mainFrame = wrapper.get('button[aria-label="Open image 1"] > div');
    expect(mainItem?.getAttribute('style')).toContain('height: calc(');
    expect(mainFrame.attributes('style')).toContain('height: calc(');
  });

  it('falls back to a plain grid when mainImageIndex is invalid', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 2,
        columns: 2,
        mainImageIndex: 99
      }
    });

    expect(wrapper.find('.image-gallery-featured').exists()).toBe(false);
    expect(wrapper.findAll('button[aria-label^="Open image "]:not([aria-label$="from grid"])')).toHaveLength(4);
  });

  it('divides fixed-height grids into explicit rows', () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 2,
        columns: 2,
        height: '24rem'
      }
    });

    const grid = wrapper.get('.image-gallery-secondary');
    expect(grid.attributes('style')).toContain('height: 24rem');
    expect(grid.attributes('style')).toContain('grid-template-rows: repeat(2, minmax(0, 1fr))');
  });

  it('toggles between single view and bento view and returns to the chosen image', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');
    await wrapper.get('button[aria-label="Open image 3 from grid"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 4');
    expect(wrapper.find('img[alt="Three"]').exists()).toBe(true);
  });

  it('hides single-view header controls in masonry mode', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

    expect(wrapper.find('button[aria-label="Toggle image grid"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('1 of 4');
    expect(wrapper.find('button[aria-label="Open image 2 from grid"]').exists()).toBe(true);
  });

  it('renders on the server without touching browser globals', async () => {
    const app = createSSRApp({
      render: () =>
        h(ImageGallery, {
          images,
          rows: 1,
          columns: 3,
          itemAspectRatio: '4 / 5'
        })
    });

    const html = await renderToString(app);

    expect(html).toContain('Open image 1');
    expect(html).not.toContain('role="dialog"');
  });

  it('supports controlled open and index props', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        open: true,
        index: 1,
        rows: 1,
        columns: 3
      }
    });

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 4');
    expect(wrapper.find('img[alt="Two"]').exists()).toBe(true);

    await wrapper.setProps({ index: 3 });

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('4 of 4');
    expect(wrapper.find('img[alt="Four"]').exists()).toBe(true);
  });

  it('emits v-model updates for open and index', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images,
        rows: 1,
        columns: 3
      }
    });

    await wrapper.get('button[aria-label="Open image 2"]').trigger('click');
    await wrapper.get('button[aria-label="Next image"]').trigger('click');
    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
    expect(wrapper.emitted('update:index')).toEqual([[1], [2]]);
  });

  it('locks body scroll while the dialog is open and restores focus when it closes', async () => {
    const wrapper = mount(ImageGallery, {
      attachTo: document.body,
      props: {
        images,
        rows: 1,
        columns: 3
      }
    });

    const trigger = wrapper.get('button[aria-label="Open image 1"]');
    (trigger.element as HTMLButtonElement).focus();

    await trigger.trigger('click');
    await nextTick();

    expect(document.body.style.overflow).toBe('hidden');
    expect(document.activeElement?.getAttribute('aria-label')).toBe('Close dialog');

    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');
    await nextTick();

    expect(document.body.style.overflow).toBe('');
    expect(document.activeElement).toBe(trigger.element);

    wrapper.unmount();
  });

  it('uses thumbnail sources in previews and renders custom toolbar and caption slots', async () => {
    const wrapper = mount(ImageGallery, {
      props: {
        images: [
          {
            ...images[0],
            id: 'hero',
            thumbnailSrc: '/one-thumb.jpg',
            caption: 'Fresh pastry notes'
          },
          images[1]
        ],
        rows: 1,
        columns: 2
      },
      slots: {
        'dialog-toolbar': ({ index }) => h('span', { 'data-test': 'toolbar-slot' }, `Toolbar ${index + 1}`),
        'dialog-caption': ({ image }) => h('p', { 'data-test': 'caption-slot' }, image.caption)
      }
    });

    expect(wrapper.get('button[aria-label="Open image 1"] img').attributes('src')).toBe('/one-thumb.jpg');

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    expect(wrapper.get('[data-test="toolbar-slot"]').text()).toBe('Toolbar 1');
    expect(wrapper.get('[data-test="caption-slot"]').text()).toBe('Fresh pastry notes');
    expect(wrapper.find('.image-gallery-secondary img[alt="One"]').attributes('src')).toBe('/one-thumb.jpg');
    expect(wrapper.find('[role="dialog"] img[alt="One"]').attributes('src')).toBe('/one.jpg');
  });
});
