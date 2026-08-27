import { inject } from 'vue';
import type { InjectionKey, Ref } from 'vue';
import type { GalleryDialogMode, GalleryImage, GalleryLabels } from '@/types';

/*
 * What the dialog's own parts need in order to be components rather than
 * markup buried in ImageGallery. They read state and call actions from here, so
 * a consumer recomposing the dialog gets working parts without wiring anything
 * up -- and without ImageGallery handing them props, which is the whole point:
 * appearance is theirs, behaviour stays here.
 */
export interface GalleryDialogContext {
  mode: Ref<GalleryDialogMode>;
  activeImage: Ref<GalleryImage | null>;
  previousImage: Ref<GalleryImage | null>;
  nextImage: Ref<GalleryImage | null>;
  index: Ref<number>;
  counterLabel: Ref<string>;
  close: () => void;
  toggleMode: () => void;
  next: () => void;
  previous: () => void;
  /*
   * Where the ends are, if the gallery has any (`loop` off). The arrows read
   * these to disable rather than deciding for themselves, so a recomposed
   * arrow shows the same edge the keys and the swipe already respect.
   */
  canGoNext: Ref<boolean>;
  canGoPrevious: Ref<boolean>;
  /*
   * The close button announces itself because it is the dialog's initial focus
   * target. A recomposed dialog that leaves it out simply falls back to the
   * first focusable element, which is why this registers rather than being
   * required.
   */
  registerCloseButton: (element: Ref<HTMLElement | null>) => void;
  /*
   * The overlay announces itself because the focus trap, the Tab cycle and the
   * scroll lock all key on the dialog's root element. A recomposed dialog that
   * omits ImageGalleryOverlay therefore gets no trap -- which is why this is a
   * registration and not a prop: the part that provides the root is the part
   * that declares it.
   */
  registerRoot: (element: Ref<HTMLElement | null>) => void;
  /*
   * The stage's moving parts. The gesture and the transition still live in
   * ImageGallery -- they are behaviour, not appearance -- and are published
   * here so the markup can move out without the logic following it.
   */
  stage: {
    isSwiping: Ref<boolean>;
    onSwipeStart: (event: PointerEvent) => void;
    swallowClick: (event: MouseEvent) => void;
    frameTransform: () => string | undefined;
    frameOpacity: () => number | undefined;
    slideTransform: (side: 'previous' | 'next') => string | undefined;
    slideOpacity: (side: 'previous' | 'next') => number | undefined;
    /*
     * The active frame announces itself, because it is what the shared-element
     * flight flies into and out of. A ref rather than an element: the frame is
     * replaced when the active image changes.
     */
    registerFrame: (element: Ref<HTMLElement | null>) => void;
    setStack: (element: HTMLElement | null) => void;
  };
  grid: {
    columns: Ref<{ entries: { image: GalleryImage; actualIndex: number }[] }[]>;
    isEntering: Ref<boolean>;
    /*
     * The roving tabindex: the one tile currently in the Tab order. The tiles
     * read it to set their own tabindex, and moveFocus -- bound to keydown on
     * the grid container -- moves it with the arrow keys, Home and End.
     */
    focusIndex: Ref<number>;
    moveFocus: (event: KeyboardEvent) => void;
    setGrid: (element: HTMLElement | null) => void;
    /*
     * A tile announces the element the flight should measure. Index and element
     * both arrive as refs: the packing can move an image to a different column
     * on a resize, and the element only exists after mount.
     */
    registerTile: (index: Ref<number>, element: Ref<HTMLElement | null>) => void;
    unregisterTile: (index: number) => void;
    select: (index: number) => void;
    /*
     * The grid announces that its tiles share one shape (an `aspect-*` class on
     * the tile beats each image's own ratio). The packing has to know, because
     * it plans columns from the ratios that would otherwise render: uniform
     * tiles pack round-robin, which keeps the columns even and the reading
     * order left-to-right.
     */
    setUniform: (value: boolean) => void;
  };
  aspectRatio: (image: GalleryImage | null, fallback?: string) => string;
  imageKey: (image: GalleryImage, index: number) => string | number;
  dialogImageLoading: (image: GalleryImage) => 'eager' | 'lazy';
  previewImageSrc: (image: GalleryImage) => string;
  previewImageLoading: (image: GalleryImage) => 'eager' | 'lazy';
}

export interface GalleryContext {
  /*
   * A child announces which image it draws and the element the flight
   * animation should measure. The frame arrives as a ref rather than an
   * element because a child registers on mount, and the parent reads the
   * element later -- at click time -- by which point v-if or a keyed update may
   * have swapped it.
   */
  registerPreview: (image: GalleryImage, frame: Ref<HTMLElement | null>) => void;
  unregisterPreview: (image: GalleryImage) => void;
  /*
   * Position in `images`, which is the collection's source of truth. Deriving
   * it here rather than from registration order is what lets the preview show
   * an arbitrary subset in an arbitrary order: the dialog counter, the arrow
   * keys and the shared-element transition all key on the real index, not on
   * whichever tile happened to mount first.
   */
  resolveIndex: (image: GalleryImage) => number;
  openImage: (index: number) => void;
  openGrid: (index: number) => void;
  labels: Ref<GalleryLabels>;
  overflowCount: Ref<number>;
  total: Ref<number>;
  /*
   * Gates every route into the grid view, so a gallery configured without it
   * cannot be pushed there by a stray trigger in the consumer's markup.
   */
  allowGridView: Ref<boolean>;
  lastPreviewedIndex: Ref<number>;
  /*
   * Everything the teleported dialog's parts need. Grouped rather than spread
   * across the top level so a preview-only child is not looking at two dozen
   * members that have nothing to do with it.
   */
  dialog: GalleryDialogContext;
}

export const GALLERY_CONTEXT: InjectionKey<GalleryContext> = Symbol('image-gallery-context');

/*
 * One place for the "you used a part outside the gallery" error, so every part
 * fails the same way and names itself while doing it. The narrowed return is
 * the other half of the point: a bare `throw` does not narrow an injected value
 * for a template, so every component would otherwise need its own alias.
 */
export function useGallery(component: string): GalleryContext {
  const gallery = inject(GALLERY_CONTEXT, null);

  if (!gallery) {
    throw new Error(`[image-gallery-kit] <${component}> must be rendered inside <ImageGallery>.`);
  }

  return gallery;
}

/*
 * The dialog's parts additionally have to be inside the dialog, and the message
 * says so -- put one in the preview and the wording points at the `dialog` slot
 * rather than leaving you to wonder which gallery it wanted.
 */
export function useDialogContext(component: string): GalleryContext {
  const gallery = inject(GALLERY_CONTEXT, null);

  if (!gallery) {
    throw new Error(
      `[image-gallery-kit] <${component}> must be rendered inside the \`dialog\` slot of <ImageGallery>.`
    );
  }

  return gallery;
}

/*
 * A grid tile tells the image inside it which image to draw, so that <img> needs
 * no props of its own, and `object-fit` is a class you put on it.
 */
export interface GalleryGridTileContext {
  image: Ref<GalleryImage>;
}

export const GRID_TILE: InjectionKey<GalleryGridTileContext> = Symbol('image-gallery-grid-tile');

/*
 * A stage frame tells the image inside it which image to draw, and in which of
 * the three roles, so that <img> needs no props of its own.
 */
export interface GalleryStageFrameContext {
  image: Ref<GalleryImage>;
  role: Ref<'active' | 'previous' | 'next'>;
}

export const STAGE_FRAME: InjectionKey<GalleryStageFrameContext> = Symbol('image-gallery-stage-frame');
