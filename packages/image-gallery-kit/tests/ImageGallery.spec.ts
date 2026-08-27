import { mount } from '@vue/test-utils';
import { afterEach } from 'vitest';
import { createSSRApp, defineComponent, h, nextTick } from 'vue';
import { renderToString } from '@vue/server-renderer';
import ImageGallery from '@/components/ImageGallery.vue';
import ImageGalleryImage from '@/components/ImageGalleryImage.vue';
import ImageGalleryOverflowTrigger from '@/components/ImageGalleryOverflowTrigger.vue';
import type { GalleryImage } from '@/types';
import { previewSlot as tiles } from './helpers';

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 },
  { src: '/three.jpg', alt: 'Three', width: 1000, height: 1000 },
  { src: '/four.jpg', alt: 'Four', width: 900, height: 1200 }
];

function mountGallery(
  props: Record<string, unknown> = {},
  slotFactory?: () => unknown,
  mountOptions: Record<string, unknown> = {}
) {
  const collection = (props.images as GalleryImage[]) ?? images;

  return mount(ImageGallery, {
    props: { images: collection, ...props },
    slots: { default: slotFactory ?? tiles(collection) },
    ...mountOptions
  });
}

afterEach(() => {
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('ImageGallery', () => {
  it('renders exactly the tiles the slot provides and nothing around them', () => {
    const wrapper = mountGallery({}, tiles(images, 3));

    expect(wrapper.findAll('.image-gallery-tile')).toHaveLength(3);
    // No built-in layout is emitted: the section wraps the slot directly.
    expect(wrapper.find('.image-gallery-secondary').exists()).toBe(false);
    expect(wrapper.find('.image-gallery-featured').exists()).toBe(false);
  });

  it('adds no sizing of its own to a tile', () => {
    const wrapper = mountGallery({}, tiles(images, 1));
    const tile = wrapper.get('.image-gallery-tile');

    // No inline style at all: an inline value would beat a consumer class
    // outright, which is the one thing nothing structural here may do.
    expect(tile.attributes('style')).toBeUndefined();
    expect(tile.classes()).toContain('image-gallery-tile');
  });

  it('passes the consumer classes through to the tile element', () => {
    const wrapper = mountGallery({}, () => [
      h(ImageGalleryImage, { image: images[0], class: 'h-24 md:h-40 rounded-xl' })
    ]);

    expect(wrapper.get('.image-gallery-tile').classes()).toEqual(
      expect.arrayContaining(['h-24', 'md:h-40', 'rounded-xl'])
    );
  });

  it('opens the clicked image in single-image mode', async () => {
    const wrapper = mountGallery();

    await wrapper.get('button[aria-label="Open image 2"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 4');
    expect(wrapper.find('[role="dialog"] img[alt="Two"]').exists()).toBe(true);
  });

  it('resolves a tile to its index in the full collection, not its position in the preview', async () => {
    // Preview starts at the third image, so the second tile is collection index 3.
    const wrapper = mountGallery({}, () =>
      images.slice(2).map((image) => h(ImageGalleryImage, { image, key: image.src }))
    );

    const tileButtons = wrapper.findAll('.image-gallery-tile');
    expect(tileButtons[0].attributes('aria-label')).toBe('Open image 3');
    expect(tileButtons[1].attributes('aria-label')).toBe('Open image 4');

    await tileButtons[1].trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('4 of 4');
  });

  it('resolves an image by id when identity does not match', async () => {
    const collection = images.map((image, index) => ({ ...image, id: index }));
    // A fresh object with a matching id, as a computed `.map()` would produce.
    const wrapper = mountGallery({ images: collection }, () => [
      h(ImageGalleryImage, { image: { ...collection[2] } })
    ]);

    expect(wrapper.get('.image-gallery-tile').attributes('aria-label')).toBe('Open image 3');

    await wrapper.get('.image-gallery-tile').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 4');
  });

  it('resolves an image by src when neither identity nor id match', () => {
    const wrapper = mountGallery({}, () => [
      h(ImageGalleryImage, { image: { src: '/two.jpg', alt: 'Two' } })
    ]);

    expect(wrapper.get('.image-gallery-tile').attributes('aria-label')).toBe('Open image 2');
  });

  it('reports the collection through slot props', () => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: ({ images: collection, total }) => [
          h('span', { 'data-test': 'counts' }, `${collection.length}/${total}`),
          ...images.slice(0, 2).map((image) => h(ImageGalleryImage, { image, key: image.src }))
        ]
      }
    });

    expect(wrapper.get('[data-test="counts"]').text()).toBe('4/4');
  });

  /*
   * The count deliberately reaches the consumer through the trigger rather than
   * through slot props: children register during setup, inside the parent's
   * render, so a slot prop carrying the count would make the parent's render
   * invalidate itself on every registration.
   */
  it('does not loop when a tile remounts without a key', async () => {
    const Host = defineComponent({
      props: { flip: { type: Boolean, required: true } },
      setup(hostProps) {
        return () =>
          h(
            ImageGallery,
            { images },
            {
              default: () => [
                h(ImageGalleryImage, { image: hostProps.flip ? images[1] : images[0] }),
                h(ImageGalleryOverflowTrigger, null, {
                  default: ({ count }: { count: number }) => `+${count}`
                })
              ]
            }
          );
      }
    });

    const wrapper = mount(Host, { props: { flip: false } });
    expect(wrapper.get('.image-gallery-overflow-trigger').text()).toBe('+3');

    await wrapper.setProps({ flip: true });
    await nextTick();

    expect(wrapper.get('.image-gallery-tile').attributes('aria-label')).toBe('Open image 2');
    expect(wrapper.get('.image-gallery-overflow-trigger').text()).toBe('+3');
  });

  it('derives the overflow trigger count and follows a changing preview subset', async () => {
    const Host = defineComponent({
      props: { count: { type: Number, required: true } },
      setup(hostProps) {
        return () =>
          h(
            ImageGallery,
            { images },
            {
              default: () => [
                ...images
                  .slice(0, hostProps.count)
                  .map((image) => h(ImageGalleryImage, { image, key: image.src })),
                h(ImageGalleryOverflowTrigger, null, {
                  default: ({ count }: { count: number }) => `+${count}`
                })
              ]
            }
          );
      }
    });

    const wrapper = mount(Host, { props: { count: 2 } });
    expect(wrapper.get('.image-gallery-overflow-trigger').text()).toBe('+2');

    await wrapper.setProps({ count: 3 });
    expect(wrapper.get('.image-gallery-overflow-trigger').text()).toBe('+1');

    await wrapper.setProps({ count: 4 });
    expect(wrapper.find('.image-gallery-overflow-trigger').exists()).toBe(false);
  });

  it('opens the grid from the overflow trigger', async () => {
    const wrapper = mountGallery({}, () => [
      ...images.slice(0, 2).map((image) => h(ImageGalleryImage, { image, key: image.src })),
      h(ImageGalleryOverflowTrigger)
    ]);

    await wrapper.get('.image-gallery-overflow-trigger').trigger('click');

    expect(wrapper.findAll('button[aria-label$="from grid"]')).toHaveLength(4);
  });

  it('labels the overflow trigger with the collection total, not the overflow count', () => {
    const wrapper = mountGallery({}, () => [
      h(ImageGalleryImage, { image: images[0] }),
      h(ImageGalleryOverflowTrigger)
    ]);

    expect(wrapper.get('.image-gallery-overflow-trigger').attributes('aria-label')).toBe('Show all 4 images');
  });

  it('withholds the overflow trigger and the dialog grid toggle when grid view is disabled', async () => {
    const wrapper = mountGallery({ allowGridView: false }, () => [
      ...images.slice(0, 2).map((image) => h(ImageGalleryImage, { image, key: image.src })),
      h(ImageGalleryOverflowTrigger)
    ]);

    expect(wrapper.find('.image-gallery-overflow-trigger').exists()).toBe(false);

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    expect(wrapper.find('button[aria-label="Toggle image grid"]').exists()).toBe(false);
  });

  it('exposes open and openGrid through slot props', async () => {
    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: {
        default: ({ open, openGrid }) => [
          h('button', { 'data-test': 'open-third', onClick: () => open(2) }, 'open'),
          h('button', { 'data-test': 'browse', onClick: () => openGrid(0) }, 'browse')
        ]
      }
    });

    await wrapper.get('[data-test="open-third"]').trigger('click');
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 4');

    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');
    await wrapper.get('[data-test="browse"]').trigger('click');
    expect(wrapper.findAll('button[aria-label$="from grid"]')).toHaveLength(4);
  });

  it('throws a descriptive error when a tile is rendered outside the gallery', () => {
    expect(() => mount(ImageGalleryImage, { props: { image: images[0] } })).toThrow(
      /must be rendered inside the default slot of <ImageGallery>/
    );
  });

  it('throws a descriptive error when the overflow trigger is rendered outside the gallery', () => {
    expect(() => mount(ImageGalleryOverflowTrigger)).toThrow(
      /must be rendered inside the default slot of <ImageGallery>/
    );
  });

  it('toggles between single view and bento view and returns to the chosen image', async () => {
    const wrapper = mountGallery();

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

    expect(wrapper.findAll('button[aria-label$="from grid"]')).toHaveLength(4);

    await wrapper.get('button[aria-label="Open image 3 from grid"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('3 of 4');
  });

  it('hides single-view header controls in bento mode', async () => {
    const wrapper = mountGallery();

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

    expect(wrapper.find('button[aria-label="Toggle image grid"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('1 of 4');
  });

  it('hides the grid toggle when there is only one image', async () => {
    const single = [images[0]];
    const wrapper = mountGallery({ images: single });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    expect(wrapper.find('button[aria-label="Toggle image grid"]').exists()).toBe(false);
  });

  it('renders on the server without touching browser globals', async () => {
    const app = createSSRApp({
      render: () =>
        h(ImageGallery, { images }, { default: () => [h(ImageGalleryImage, { image: images[0] })] })
    });

    const html = await renderToString(app);

    expect(html).toContain('Open image 1');
    expect(html).not.toContain('role="dialog"');
  });

  it('counts overflow correctly during server rendering', async () => {
    const app = createSSRApp({
      render: () =>
        h(
          ImageGallery,
          { images },
          {
            default: () => [
              h(ImageGalleryImage, { image: images[0] }),
              h(ImageGalleryOverflowTrigger, null, { default: ({ count }: { count: number }) => `+${count}` })
            ]
          }
        )
    });

    // Registration happens in setup, not onMounted, so the server already knows
    // one of four tiles was drawn. Were it deferred, this would read "+4" and
    // the client would silently correct it after hydration.
    expect(await renderToString(app)).toContain('+3');
  });

  it('supports controlled open and index props', async () => {
    const wrapper = mountGallery({ open: true, index: 1 });

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 4');
    expect(wrapper.find('[role="dialog"] img[alt="Two"]').exists()).toBe(true);

    await wrapper.setProps({ index: 3 });

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('4 of 4');
    expect(wrapper.find('[role="dialog"] img[alt="Four"]').exists()).toBe(true);
  });

  it('emits v-model updates for open and index', async () => {
    const wrapper = mountGallery();

    await wrapper.get('button[aria-label="Open image 2"]').trigger('click');
    await wrapper.get('button[aria-label="Next image"]').trigger('click');
    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');

    expect(wrapper.emitted('update:open')).toEqual([[true], [false]]);
    expect(wrapper.emitted('update:index')).toEqual([[1], [2]]);
  });

  it('locks body scroll while the dialog is open and restores focus when it closes', async () => {
    const wrapper = mountGallery({}, undefined, { attachTo: document.body });

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

  it('uses thumbnail sources in tiles and full sources in the dialog', async () => {
    const collection = [
      { ...images[0], id: 'hero', thumbnailSrc: '/one-thumb.jpg', caption: 'Fresh pastry notes' },
      images[1]
    ];
    const wrapper = mount(ImageGallery, {
      props: { images: collection },
      slots: {
        default: () => collection.map((image) => h(ImageGalleryImage, { image, key: image.src })),
        'dialog-toolbar': ({ index }) => h('span', { 'data-test': 'toolbar-slot' }, `Toolbar ${index + 1}`),
        'dialog-caption': ({ image }) => h('p', { 'data-test': 'caption-slot' }, image.caption)
      }
    });

    expect(wrapper.get('button[aria-label="Open image 1"] img').attributes('src')).toBe('/one-thumb.jpg');

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    expect(wrapper.get('[data-test="toolbar-slot"]').text()).toBe('Toolbar 1');
    expect(wrapper.get('[data-test="caption-slot"]').text()).toBe('Fresh pastry notes');
    expect(wrapper.find('[role="dialog"] img[alt="One"]').attributes('src')).toBe('/one.jpg');
  });

  it('renders a tile overlay slot inside the tile', () => {
    const wrapper = mountGallery({}, () => [
      h(
        ImageGalleryImage,
        { image: images[1] },
        { default: ({ index }: { index: number }) => h('span', {}, `#${index}`) }
      )
    ]);

    expect(wrapper.get('.image-gallery-tile').text()).toBe('#1');
  });

  it('closes an open dialog when images are emptied', async () => {
    const wrapper = mountGallery({}, undefined, { attachTo: document.body });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);

    await wrapper.setProps({ images: [] });
    await nextTick();

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.emitted('close')).toBeTruthy();

    wrapper.unmount();
  });

  it('falls back to imageAspectRatio in the grid for images without intrinsic dimensions', async () => {
    const bare: GalleryImage[] = [
      { src: '/a.jpg', alt: 'A' },
      { src: '/b.jpg', alt: 'B' },
      { src: '/c.jpg', alt: 'C' }
    ];
    const wrapper = mountGallery({ images: bare, imageAspectRatio: '3 / 2' });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    await wrapper.get('button[aria-label="Toggle image grid"]').trigger('click');

    const gridTile = wrapper.get('button[aria-label="Open image 1 from grid"]');
    // Published as a custom property, so an `aspect-*` class of the consumer's
    // wins over it -- the CSS reads this with a 4 / 5 fallback.
    expect(gridTile.attributes('style')).toContain('--ig-internal-tile-ratio: 3 / 2');
  });

  it('applies a partial labels override and keeps English defaults elsewhere', async () => {
    const wrapper = mountGallery({
      labels: {
        openImage: (index: number) => `Foto ${index} openen`,
        counter: (current: number, total: number) => `${current} van ${total}`
      }
    });

    await wrapper.get('button[aria-label="Foto 1 openen"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('1 van 4');
    expect(wrapper.find('button[aria-label="Close dialog"]').exists()).toBe(true);
  });

  it('ignores explicitly undefined label overrides', () => {
    const wrapper = mountGallery({ labels: { openImage: undefined } });

    expect(wrapper.find('button[aria-label="Open image 1"]').exists()).toBe(true);
  });

  /*
   * There is no colour-scheme prop, and no scheme class, because there is no
   * palette to switch: the dialog paints in CSS system colours, which follow the
   * reader's platform on their own. What the gallery must not do is put a colour
   * on its root -- the preview below it is the consumer's markup and inherits
   * their text colour.
   */
  it('brings no colour of its own to the gallery root', async () => {
    const wrapper = mountGallery();

    expect(wrapper.get('.image-gallery-theme').classes().sort()).toEqual(
      ['image-gallery-theme', 'w-full'].sort()
    );

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');

    expect(wrapper.get('[role="dialog"]').classes()).toEqual(['image-gallery-overlay']);
  });

  it('passes imageClass to the image rather than the tile', () => {
    const wrapper = mountGallery({}, () => [
      h(ImageGalleryImage, {
        image: images[0],
        class: 'h-24',
        imageClass: 'object-contain group-hover:scale-105'
      })
    ]);

    const tile = wrapper.get('.image-gallery-tile');
    const img = wrapper.get('.image-gallery-image');

    expect(tile.classes()).toContain('h-24');
    expect(tile.classes()).not.toContain('object-contain');
    expect(img.classes()).toEqual(expect.arrayContaining(['object-contain', 'group-hover:scale-105']));
  });

  /*
   * `group` is the contract that makes `group-hover:` usable from imageClass.
   * Without it a consumer's hover class silently never fires.
   */
  it('keeps the group class on the tile so imageClass can react to tile hover', () => {
    const wrapper = mountGallery({}, tiles(images, 1));

    expect(wrapper.get('.image-gallery-tile').classes()).toContain('group');
  });

  it('adds no appearance of its own to a tile or the overflow trigger', () => {
    const wrapper = mountGallery({}, () => [
      h(ImageGalleryImage, { image: images[0] }),
      h(ImageGalleryOverflowTrigger)
    ]);

    /*
     * The structure lives in .image-gallery-tile, in @layer components, where a
     * consumer utility beats it whatever the source order. That is the point of
     * this assertion: a raw `relative block overflow-hidden` on the element
     * would sit in the same layer as their override and win or lose by
     * accident, so the element carries no utility of ours at all.
     */
    expect(wrapper.get('.image-gallery-tile').classes().sort()).toEqual(
      ['group', 'image-gallery-tile'].sort()
    );
    expect(wrapper.get('.image-gallery-overflow-trigger').classes().sort()).toEqual(
      ['image-gallery-overflow-trigger', 'inline-flex', 'items-center', 'justify-center'].sort()
    );
  });

  it('emits no scheme class at all', () => {
    const classes = mountGallery().get('.image-gallery-theme').classes();

    expect(classes).not.toContain('ig-scheme-dark');
    expect(classes).not.toContain('ig-scheme-light');
  });
});
