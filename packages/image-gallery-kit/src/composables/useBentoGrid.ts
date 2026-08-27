import { computed, ref, watch } from 'vue';
import type { ComputedRef, Ref } from 'vue';
import type { GalleryImage } from '@/types';

export type BentoEntry = {
  image: GalleryImage;
  actualIndex: number;
};

interface BentoGridOptions {
  images: () => GalleryImage[];
  total: ComputedRef<number>;
  /* The height of an image in units of column width; the packing's only input. */
  ratioOf: (image: GalleryImage) => number;
  clampIndex: (index: number) => number;
}

/*
 * The all-images grid: shortest-column packing, the roving tabindex that keeps
 * a thousand tiles one Tab stop, and the frame registry the shared-element
 * flight measures. Everything here answers one question -- where a tile is --
 * whether the asker is the layout, the keyboard, or the transition.
 */
export function useBentoGrid(options: BentoGridOptions) {
  const gridRef = ref<HTMLElement | null>(null);
  const frameRefs = ref<(HTMLElement | null)[]>([]);
  const columnCount = ref(1);

  /*
   * The grid packs into explicit columns rather than riding CSS `column-count`.
   * Multi-column balances by splitting the flow into equal-height runs, so the
   * first fifth of a collection lands in column one -- a thousand images put
   * images 1-200 in a single column, which reads as sorted-by-column rather than
   * as a gallery. It also has to lay out every item to find that balance, which
   * rules out the per-tile containment that keeps a large grid cheap.
   *
   * Greedy shortest-column packing interleaves the sequence across columns and
   * needs no measurement: heights are compared in units of column width, so the
   * ratio alone orders them. Images without intrinsic dimensions fall back to the
   * gallery's configured ratio, which makes them uniform, which packs trivially.
   */
  const uniform = ref(false);

  const columns = computed(() => {
    const count = Math.max(1, columnCount.value);
    const packed = Array.from({ length: count }, () => ({ entries: [] as BentoEntry[], height: 0 }));

    options.images().forEach((image, index) => {
      const shortest = packed.reduce(
        (best, column) => (column.height < best.height ? column : best),
        packed[0]
      );

      shortest.entries.push({ image, actualIndex: index });
      /*
       * A uniform grid renders every tile at one shape, whatever ratio the image
       * itself has -- so the plan has to assume the same, or a column that drew
       * the portraits is planned tall, rendered short, and comes up tiles ragged
       * at the bottom. Constant heights turn shortest-column into round-robin,
       * which is also what puts the reading order back left-to-right.
       */
      shortest.height += uniform.value ? 1 : 1 / options.ratioOf(image);
    });

    return packed;
  });

  /*
   * The packing above needs the column count as a number, and the grid itself is
   * the authority on it: `grid-template-columns` resolves to one entry per track,
   * whoever declared it. Counting those is what lets the tracks be plain CSS, and
   * what makes a `md:grid-cols-6` of the consumer's own authoritative.
   *
   * Split at paren depth zero, because an untouched grid reports its tracks as
   * `minmax(0px, 1fr)` rather than as used pixel widths, and those parentheses
   * contain spaces of their own. Bento mode is only ever reached by a click, so
   * this never has to produce a value during SSR.
   */
  function countColumnTracks(value: string) {
    if (!value || value === 'none') {
      return 0;
    }

    let depth = 0;
    let tracks = 0;
    let inTrack = false;

    for (const character of value) {
      if (character === '(') {
        depth += 1;
      } else if (character === ')') {
        depth -= 1;
      }

      if (depth === 0 && /\s/.test(character)) {
        inTrack = false;
      } else if (!inTrack) {
        inTrack = true;
        tracks += 1;
      }
    }

    return tracks;
  }

  function syncColumnCount() {
    const container = gridRef.value;

    if (!container || typeof window === 'undefined') {
      return;
    }

    const tracks = countColumnTracks(getComputedStyle(container).gridTemplateColumns);

    columnCount.value = tracks > 0 ? tracks : 1;
  }

  /*
   * Keyed by index rather than pushed in render order, because the packing puts
   * image 7 in whichever column was shortest and that changes with the column
   * count. Both sides arrive as refs so a tile that moves column on a resize
   * updates the entry it already owns instead of stranding it.
   */
  function registerTile(index: Ref<number>, element: Ref<HTMLElement | null>) {
    watch(
      [index, element],
      ([nextIndex, nextElement], previous) => {
        const previousIndex = previous?.[0];

        if (previousIndex !== undefined && previousIndex !== nextIndex) {
          delete frameRefs.value[previousIndex];
        }

        frameRefs.value[nextIndex] = nextElement;
      },
      { immediate: true }
    );
  }

  function unregisterTile(index: number) {
    delete frameRefs.value[index];
  }

  /*
   * The grid's one Tab stop. Every tile is a button, so left to the browser a
   * thousand-image grid is a thousand Tab stops between the toggle and the close
   * button -- Tab has to march through all of them to leave. Roving tabindex is
   * the standard answer: one tile stays in the Tab order and the arrow keys move
   * *which* one, so Tab crosses the grid in a single step while every tile stays
   * reachable.
   */
  const focusIndex = ref(0);

  /*
   * The tile above or below, which only the packing can answer: shortest-column
   * packing decides which column an image lands in, so in a two-column grid the
   * vertical neighbour of image 4 may be image 6. Asking the packed columns keeps
   * the keyboard's idea of "up" identical to what is painted.
   */
  function columnNeighbor(index: number, delta: -1 | 1) {
    for (const column of columns.value) {
      const position = column.entries.findIndex((entry) => entry.actualIndex === index);

      if (position >= 0) {
        return column.entries[position + delta]?.actualIndex ?? null;
      }
    }

    return null;
  }

  function moveFocus(event: KeyboardEvent) {
    /*
     * Anchored on the tile the key was pressed in when there is one, not on the
     * roving state: a consumer's recomposed tile keeps its natural tabindex, so
     * focus can legitimately sit on a tile the state never followed.
     */
    const origin = event.target instanceof HTMLElement ? event.target.closest('[data-bento-index]') : null;
    const parsed = origin instanceof HTMLElement ? Number(origin.dataset.bentoIndex) : Number.NaN;
    const from = Number.isInteger(parsed) ? parsed : focusIndex.value;
    let target: number | null;

    switch (event.key) {
      case 'ArrowRight':
        target = from + 1 < options.total.value ? from + 1 : null;
        break;
      case 'ArrowLeft':
        target = from - 1 >= 0 ? from - 1 : null;
        break;
      case 'ArrowDown':
        target = columnNeighbor(from, 1);
        break;
      case 'ArrowUp':
        target = columnNeighbor(from, -1);
        break;
      case 'Home':
        target = 0;
        break;
      case 'End':
        target = options.total.value - 1;
        break;
      default:
        return;
    }

    // Claimed even at an edge, where target is null: a handled key must not fall
    // through to scrolling the grid, or the tiles and the scrollport drift apart.
    event.preventDefault();

    if (target === null || target === from) {
      return;
    }

    focusIndex.value = target;
    frameRefs.value[target]?.focus();
  }

  /*
   * Focus follows the view swap. The control that triggered it is gone the
   * moment the mode flips -- the toggle only renders in single mode, a selected
   * tile only in bento -- and focus on a removed element falls to <body>, from
   * where the next Tab escapes the dialog entirely. Landing on the active tile
   * also puts the arrow keys immediately in hand. preventScroll, because
   * revealFrame has already put the tile where the flight needs it.
   */
  function focusTile(index: number) {
    focusIndex.value = options.clampIndex(index);
    frameRefs.value[focusIndex.value]?.focus({ preventScroll: true });
  }

  /*
   * The grid is scrollable and opens wherever the active image happens to sit, so
   * for anything past the first screenful the tile the transition targets is
   * below the fold. animateBetween would then measure an off-screen rect and fly
   * the image out of view instead of into place. Scrolling lives here, in the
   * getter, because animateBetween reads the rect immediately after resolving it
   * -- revealing any earlier would be undone by the grid's own initial layout.
   * `instant` is explicit: a host page with scroll-behavior: smooth would
   * otherwise move the tile asynchronously, after the rect has been read.
   */
  function revealFrame(index: number) {
    const frame = frameRefs.value[index] ?? null;

    frame?.scrollIntoView?.({ block: 'center', inline: 'nearest', behavior: 'instant' });

    return frame;
  }

  function frameAt(index: number) {
    return frameRefs.value[index] ?? null;
  }

  function setGrid(element: HTMLElement | null) {
    gridRef.value = element;
  }

  function setUniform(value: boolean) {
    uniform.value = value;
  }

  /* The collection changed: the old frames and the roving position are stale. */
  function handleImagesChange() {
    frameRefs.value = [];
    focusIndex.value = options.clampIndex(focusIndex.value);
  }

  return {
    gridRef,
    columns,
    focusIndex,
    moveFocus,
    focusTile,
    revealFrame,
    frameAt,
    registerTile,
    unregisterTile,
    setGrid,
    setUniform,
    syncColumnCount,
    handleImagesChange
  };
}
