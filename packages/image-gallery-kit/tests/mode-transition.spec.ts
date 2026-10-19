import { mount } from '@vue/test-utils';
import { afterEach, vi } from 'vitest';
import { h, nextTick } from 'vue';
import type { GalleryImage } from '@/types';
import { previewSlot as tiles } from './helpers';

type Deferred = { promise: Promise<void>; resolve: () => void; reject: (error: Error) => void };

function deferred(): Deferred {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

// Each flight parks on a promise the test settles by hand, so a spec can act
// while a mode swap is still running -- or make one of its animations throw.
const flights: Deferred[] = [];
const entrances: Deferred[] = [];

vi.mock('@/composables/useSharedImageTransition', () => ({
  GSAP: Symbol('image-gallery-gsap'),
  useSharedImageTransition: () => ({
    animateBetween: () => {
      const flight = deferred();
      flights.push(flight);
      return flight.promise;
    },
    animateBentoEntrance: () => {
      const entrance = deferred();
      entrances.push(entrance);
      return entrance.promise;
    },
    animateBentoExit: () => Promise.resolve(),
    measureTransitionRadius: () => null
  })
}));

const { default: ImageGallery } = await import('@/components/ImageGallery.vue');

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 },
  { src: '/three.jpg', alt: 'Three', width: 1000, height: 1000 }
];

/*
 * The toolbar slot hands out the same toggleMode the built-in button calls, and
 * stays rendered in both modes -- the built-in toggle does not -- so a spec can
 * fire a second toggle mid-flight and read which mode it ended up in.
 */
function mountGallery() {
  const handles: { toggleMode?: () => Promise<void>; openGrid?: (index: number) => Promise<void> } = {};

  const wrapper = mount(ImageGallery, {
    props: { images },
    slots: {
      default: (props: { openGrid: (index: number) => Promise<void> }) => {
        handles.openGrid = props.openGrid;
        return tiles(images)();
      },
      'dialog-toolbar': (props: { mode: string; toggleMode: () => Promise<void> }) => {
        handles.toggleMode = props.toggleMode;
        return h('span', { 'data-test': 'mode' }, props.mode);
      }
    }
  });

  return { wrapper, handles };
}

function enteringTiles(wrapper: ReturnType<typeof mountGallery>['wrapper']) {
  return wrapper.findAll('[data-ig-entering="true"]');
}

afterEach(() => {
  flights.length = 0;
  entrances.length = 0;
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
});

describe('mode transitions', () => {
  it('shows the grid tiles again when the toggle entrance throws', async () => {
    const { wrapper, handles } = mountGallery();

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    flights.shift()?.resolve();
    await nextTick();

    const toggle = handles.toggleMode!();
    await nextTick();
    expect(enteringTiles(wrapper).length).toBeGreaterThan(0);

    flights.shift()!.resolve();
    await vi.waitFor(() => expect(entrances).toHaveLength(1));
    entrances[0].reject(new Error('animation failed'));

    await expect(toggle).rejects.toThrow('animation failed');
    await nextTick();
    expect(enteringTiles(wrapper)).toHaveLength(0);
  });

  it('shows the grid tiles again when the entrance from the preview throws', async () => {
    const { wrapper, handles } = mountGallery();

    const open = handles.openGrid!(1);
    await nextTick();
    expect(enteringTiles(wrapper).length).toBeGreaterThan(0);

    flights.shift()!.reject(new Error('flight failed'));

    await expect(open).rejects.toThrow('flight failed');
    await nextTick();
    expect(enteringTiles(wrapper)).toHaveLength(0);
  });

  it('ignores a toggle while a mode transition is still running', async () => {
    const { wrapper, handles } = mountGallery();

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    flights.shift()?.resolve();
    await nextTick();

    const first = handles.toggleMode!();
    await nextTick();
    expect(wrapper.get('[data-test="mode"]').text()).toBe('bento');

    // Mid-flight: without a guard this swaps straight back to single view while
    // the first toggle is still waiting to reveal the grid it just hid.
    const second = handles.toggleMode!();
    await nextTick();
    expect(wrapper.get('[data-test="mode"]').text()).toBe('bento');

    flights.shift()!.resolve();
    await vi.waitFor(() => expect(entrances).toHaveLength(1));
    entrances[0].resolve();
    await Promise.all([first, second]);
    await nextTick();

    expect(wrapper.get('[data-test="mode"]').text()).toBe('bento');
    expect(enteringTiles(wrapper)).toHaveLength(0);

    // Once it has settled, the next toggle goes through again.
    const back = handles.toggleMode!();
    await nextTick();
    expect(wrapper.get('[data-test="mode"]').text()).toBe('single');
    flights.shift()?.resolve();
    await back;
  });

  it('ignores a toggle while the grid is still opening from the preview', async () => {
    const { wrapper, handles } = mountGallery();

    const open = handles.openGrid!(0);
    await nextTick();

    const toggle = handles.toggleMode!();
    await nextTick();
    expect(wrapper.get('[data-test="mode"]').text()).toBe('bento');

    flights.shift()!.resolve();
    await vi.waitFor(() => expect(entrances).toHaveLength(1));
    entrances[0].resolve();
    await Promise.all([open, toggle]);
    await nextTick();

    expect(wrapper.get('[data-test="mode"]').text()).toBe('bento');
    expect(enteringTiles(wrapper)).toHaveLength(0);
  });
});
