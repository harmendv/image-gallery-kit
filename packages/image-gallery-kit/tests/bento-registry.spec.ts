import { computed, effectScope, nextTick, ref } from 'vue';
import { useBentoGrid } from '@/composables/useBentoGrid';
import type { GalleryImage } from '@/types';

const images: GalleryImage[] = Array.from({ length: 3 }, (_, index) => ({
  src: `/${index + 1}.jpg`,
  alt: `Image ${index + 1}`
}));

function createGrid() {
  return useBentoGrid({
    images: () => images,
    total: computed(() => images.length),
    ratioOf: () => 1,
    clampIndex: (index) => Math.min(Math.max(index, 0), images.length - 1),
    direction: ref('ltr')
  });
}

/*
 * A re-pack can move a tile into a column that is patched first, so the tile
 * that replaces it registers the same index before the one it replaces is
 * unmounted. These drive that ordering directly rather than through a resize.
 */
describe('bento tile registry', () => {
  it('keeps the entry of the tile that took over an index when the old tile unregisters', () => {
    const grid = createGrid();
    const previous = document.createElement('button');
    const next = document.createElement('button');

    grid.registerTile(ref(1), ref(previous));
    grid.registerTile(ref(1), ref(next));
    grid.unregisterTile(1, previous);

    expect(grid.frameAt(1)).toBe(next);
  });

  it('still removes the entry a tile owns when it unregisters', () => {
    const grid = createGrid();
    const element = document.createElement('button');

    grid.registerTile(ref(1), ref(element));
    grid.unregisterTile(1, element);

    expect(grid.frameAt(1)).toBeNull();
  });

  it('keeps the entry of the tile that took over an index when the old tile moves on', async () => {
    const grid = createGrid();
    const previous = document.createElement('button');
    const next = document.createElement('button');
    const previousIndex = ref(1);
    const scope = effectScope();

    scope.run(() => grid.registerTile(previousIndex, ref(previous)));
    grid.registerTile(ref(1), ref(next));
    previousIndex.value = 2;
    await nextTick();

    expect(grid.frameAt(1)).toBe(next);
    expect(grid.frameAt(2)).toBe(previous);

    scope.stop();
  });
});
