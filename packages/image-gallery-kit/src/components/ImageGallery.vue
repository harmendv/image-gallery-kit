<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue';
import { useSharedImageTransition } from '@/composables/useSharedImageTransition';
import type { GalleryImage, ImageFit, MainImagePosition, MainImageSize } from '@/types';

type DialogMode = 'single' | 'bento';
type PreviewEntry = {
  image: GalleryImage;
  actualIndex: number;
};

const props = withDefaults(
  defineProps<{
    images: GalleryImage[];
    open?: boolean | null;
    index?: number | null;
    rows?: number;
    columns?: number;
    imageAspectRatio?: number | string;
    mainImageAspectRatio?: number | string | null;
    mainImageIndex?: number | null;
    mainImagePosition?: MainImagePosition;
    mainImageSize?: MainImageSize | null;
    gap?: string;
    imageFit?: ImageFit;
    allowGridView?: boolean;
    height?: string | null;
    width?: string | null;
    imageRadius?: string | null;
  }>(),
  {
    open: null,
    index: null,
    rows: 2,
    columns: 2,
    imageAspectRatio: '4 / 5',
    mainImageAspectRatio: null,
    mainImageIndex: null,
    mainImagePosition: 'left',
    mainImageSize: 0.4,
    gap: '1rem',
    imageFit: 'cover',
    allowGridView: true,
    height: null,
    width: '100%',
    imageRadius: null
  }
);

const emit = defineEmits<{
  (event: 'open', index: number): void;
  (event: 'close'): void;
  (event: 'change', index: number): void;
  (event: 'update:open', value: boolean): void;
  (event: 'update:index', value: number): void;
}>();

const slots = useSlots();
const isMounted = ref(false);
const internalOpen = ref(props.open ?? false);
const internalIndex = ref(props.index ?? 0);
const dialogMode = ref<DialogMode>('single');
const previewFrameRefs = ref<(HTMLDivElement | null)[]>([]);
const bentoFrameRefs = ref<(HTMLDivElement | null)[]>([]);
const carouselFrameRef = ref<HTMLDivElement | null>(null);
const bentoGridRef = ref<HTMLDivElement | null>(null);
const dialogRef = ref<HTMLDivElement | null>(null);
const closeButtonRef = ref<HTMLButtonElement | null>(null);
const isBentoEntering = ref(false);
const lastFocusedElement = ref<HTMLElement | null>(null);
const previousBodyOverflow = ref<string | null>(null);
const previousBodyPaddingRight = ref<string | null>(null);

const { animateBetween, animateBentoEntrance, animateBentoExit } = useSharedImageTransition();

const isOpenControlled = computed(() => props.open !== null);
const isIndexControlled = computed(() => props.index !== null);
const rowCount = computed(() => Math.max(1, Math.floor(props.rows)));
const columnCount = computed(() => Math.max(1, Math.floor(props.columns)));
const secondaryCapacity = computed(() => rowCount.value * columnCount.value);
const totalImages = computed(() => props.images.length);
const heightValue = computed(() => props.height);
const imageAspectRatioValue = computed(() => {
  if (typeof props.imageAspectRatio === 'number') {
    return `${props.imageAspectRatio}`;
  }

  return props.imageAspectRatio;
});
const imageAspectRatioNumber = computed(() => {
  if (typeof props.imageAspectRatio === 'number') {
    return props.imageAspectRatio > 0 ? props.imageAspectRatio : 1;
  }

  const normalized = props.imageAspectRatio.replace(/\s+/g, '');
  if (!normalized.includes('/')) {
    const numeric = Number(normalized);
    return Number.isFinite(numeric) && numeric > 0 ? numeric : 1;
  }

  const [width, height] = normalized.split('/').map(Number);
  if (!width || !height) {
    return 1;
  }

  return width / height;
});
const mainImageAspectRatioValue = computed(() => {
  if (props.mainImageAspectRatio === null || props.mainImageAspectRatio === undefined) {
    return null;
  }

  if (typeof props.mainImageAspectRatio === 'number') {
    return props.mainImageAspectRatio > 0 ? `${props.mainImageAspectRatio}` : null;
  }

  const value = props.mainImageAspectRatio.trim();
  return value.length ? value : null;
});
const useCustomMainImageAspectRatio = computed(() => {
  const isHorizontal = props.mainImagePosition === 'left' || props.mainImagePosition === 'right';
  return !isHorizontal && !heightValue.value && !!mainImageAspectRatioValue.value;
});
const validMainImageIndex = computed(() => {
  if (props.mainImageIndex === null || props.mainImageIndex === undefined) {
    return null;
  }

  return props.mainImageIndex >= 0 && props.mainImageIndex < props.images.length ? props.mainImageIndex : null;
});
const hasMainImage = computed(() => validMainImageIndex.value !== null);
const mainImageEntry = computed<PreviewEntry | null>(() => {
  if (validMainImageIndex.value === null) {
    return null;
  }

  return {
    image: props.images[validMainImageIndex.value],
    actualIndex: validMainImageIndex.value
  };
});
const mainImageActualIndex = computed(() => mainImageEntry.value?.actualIndex ?? -1);
const secondaryEntries = computed<PreviewEntry[]>(() =>
  props.images
    .map((image, index) => ({ image, actualIndex: index }))
    .filter((entry) => entry.actualIndex !== validMainImageIndex.value)
);
const visibleSecondaryEntries = computed(() => secondaryEntries.value.slice(0, secondaryCapacity.value));
const hiddenSecondaryCount = computed(() => Math.max(0, secondaryEntries.value.length - visibleSecondaryEntries.value.length));
const hasOverflow = computed(() => props.allowGridView && hiddenSecondaryCount.value > 0);
const plainGridItemCount = computed(() => visibleSecondaryEntries.value.length);
const plainGridRows = computed(() => Math.max(1, Math.ceil(plainGridItemCount.value / columnCount.value)));

const normalizedMainImageSize = computed(() => {
  if (props.mainImageSize === null || props.mainImageSize === undefined) {
    return null;
  }

  if (typeof props.mainImageSize === 'number') {
    return Math.min(0.95, Math.max(0.05, props.mainImageSize));
  }

  return props.mainImageSize.trim();
});
const previewGap = computed(() => props.gap);
const objectFitValue = computed(() => props.imageFit);
const transitionRadius = computed(() => props.imageRadius?.trim() || '1.5rem');
const galleryStyle = computed(() => ({
  width: props.width ?? '100%',
  '--ig-radius': props.imageRadius ?? undefined
}));
const masonryTileRadius = computed(() => {
  const baseRadius = props.imageRadius?.trim() || 'var(--ig-radius, 1.5rem)';
  return `max(0px, calc(${baseRadius} - 0.4rem))`;
});

function clampIndex(index: number) {
  if (!totalImages.value) {
    return 0;
  }

  return Math.min(Math.max(0, Math.floor(index)), totalImages.value - 1);
}

const currentIndex = computed(() => {
  const value = isIndexControlled.value ? props.index ?? 0 : internalIndex.value;
  return clampIndex(value);
});
const isDialogOpen = computed(() => (isOpenControlled.value ? !!props.open : internalOpen.value));
const activeImage = computed(() => props.images[currentIndex.value] ?? null);
const dialogIsVisible = computed(() => isDialogOpen.value && activeImage.value !== null);
const counterLabel = computed(() => `${currentIndex.value + 1} of ${totalImages.value}`);
const hasDialogToolbarSlot = computed(() => Boolean(slots['dialog-toolbar']));
const hasDialogCaptionSlot = computed(() => Boolean(slots['dialog-caption']));

function getSecondaryHeightTerm() {
  const ratio = imageAspectRatioNumber.value;
  const columns = columnCount.value;
  const rows = rowCount.value;
  const gap = previewGap.value;
  const cellWidth = `((100% - (${Math.max(columns - 1, 0)} * ${gap})) / ${columns})`;
  const cellHeight = `(${cellWidth} / ${ratio})`;

  return `((${rows} * ${cellHeight}) + (${Math.max(rows - 1, 0)} * ${gap}))`;
}

function getMainImageHeightExpression() {
  const secondaryHeightTerm = getSecondaryHeightTerm();
  const mainSize = typeof normalizedMainImageSize.value === 'number' ? normalizedMainImageSize.value : null;

  if (mainSize === null) {
    return null;
  }

  const mainFactor = mainSize / (1 - mainSize);
  return `calc((${secondaryHeightTerm}) * ${mainFactor})`;
}

const featuredLayoutStyle = computed(() => {
  if (!hasMainImage.value) {
    return null;
  }

  const gap = previewGap.value;
  const isHorizontal = props.mainImagePosition === 'left' || props.mainImagePosition === 'right';
  const baseStyle: Record<string, string> = {
    display: 'grid',
    gap
  };

  if (isHorizontal) {
    let mainTrack = '';
    let secondaryTrack = '';

    if (typeof normalizedMainImageSize.value === 'number') {
      const mainFraction = normalizedMainImageSize.value;
      const secondaryFraction = 1 - mainFraction;
      mainTrack = `minmax(0, calc((100% - ${gap}) * ${mainFraction}))`;
      secondaryTrack = `minmax(0, calc((100% - ${gap}) * ${secondaryFraction}))`;
    } else if (typeof normalizedMainImageSize.value === 'string') {
      mainTrack = `minmax(0, ${normalizedMainImageSize.value})`;
      secondaryTrack = 'minmax(0, 1fr)';
    } else {
      mainTrack = 'minmax(0, auto)';
      secondaryTrack = 'minmax(0, 1fr)';
    }

    baseStyle.gridTemplateColumns =
      props.mainImagePosition === 'left'
        ? `${mainTrack} ${secondaryTrack}`
        : `${secondaryTrack} ${mainTrack}`;

    if (heightValue.value) {
      baseStyle.height = heightValue.value;
      baseStyle.alignItems = 'stretch';
    } else {
      baseStyle.alignItems = 'start';
    }

    return baseStyle;
  }

  let mainTrack = '';
  let secondaryTrack = '';
  const shouldUseCustomMainAspectRatio = useCustomMainImageAspectRatio.value;

  if (shouldUseCustomMainAspectRatio) {
    mainTrack = 'auto';
    secondaryTrack = 'auto';
  } else if (typeof normalizedMainImageSize.value === 'number') {
    if (heightValue.value) {
      const mainFraction = normalizedMainImageSize.value;
      const secondaryFraction = 1 - mainFraction;
      mainTrack = `minmax(0, calc((100% - ${gap}) * ${mainFraction}))`;
      secondaryTrack = `minmax(0, calc((100% - ${gap}) * ${secondaryFraction}))`;
      baseStyle.height = heightValue.value;
    } else {
      mainTrack = `minmax(0, ${getMainImageHeightExpression()})`;
      secondaryTrack = 'auto';
    }
  } else if (typeof normalizedMainImageSize.value === 'string') {
    mainTrack = `minmax(0, ${normalizedMainImageSize.value})`;
    secondaryTrack = heightValue.value ? 'minmax(0, 1fr)' : 'auto';

    if (heightValue.value) {
      baseStyle.height = heightValue.value;
    }
  } else {
    mainTrack = 'auto';
    secondaryTrack = 'auto';
  }

  baseStyle.gridTemplateRows =
    props.mainImagePosition === 'top'
      ? `${mainTrack} ${secondaryTrack}`
      : `${secondaryTrack} ${mainTrack}`;

  return baseStyle;
});

const secondaryGridStyle = computed(() => {
  const isHorizontal = props.mainImagePosition === 'left' || props.mainImagePosition === 'right';

  return {
    display: 'grid',
    gap: previewGap.value,
    gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))`,
    gridTemplateRows: heightValue.value ? `repeat(${rowCount.value}, minmax(0, 1fr))` : undefined,
    height: hasMainImage.value && (isHorizontal || !!heightValue.value) ? '100%' : heightValue.value ?? undefined,
    alignContent: 'start'
  };
});

const plainGridStyle = computed(() => ({
  display: 'grid',
  gap: previewGap.value,
  gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))`,
  gridTemplateRows: heightValue.value ? `repeat(${plainGridRows.value}, minmax(0, 1fr))` : undefined,
  height: heightValue.value ?? undefined,
  alignContent: 'start'
}));

const mainImageItemStyle = computed(() => {
  const isHorizontal = props.mainImagePosition === 'left' || props.mainImagePosition === 'right';
  const hasCustomMainAspectRatio = useCustomMainImageAspectRatio.value;
  const intrinsicHeight = !isHorizontal && !heightValue.value && typeof normalizedMainImageSize.value === 'number'
    ? (hasCustomMainAspectRatio ? undefined : getMainImageHeightExpression() ?? undefined)
    : undefined;

  return {
    minHeight: 0,
    height: isHorizontal ? '100%' : intrinsicHeight,
    gridColumn: isHorizontal ? (props.mainImagePosition === 'right' ? '2' : '1') : '1',
    gridRow: isHorizontal ? '1' : (props.mainImagePosition === 'bottom' ? '2' : '1')
  };
});

const secondaryWrapperStyle = computed(() => {
  const isHorizontal = props.mainImagePosition === 'left' || props.mainImagePosition === 'right';

  return {
    gridColumn: isHorizontal ? (props.mainImagePosition === 'right' ? '1' : '2') : '1',
    gridRow: isHorizontal ? '1' : (props.mainImagePosition === 'bottom' ? '1' : '2')
  };
});

const mainImageFrameStyle = computed(() => {
  const isHorizontal = props.mainImagePosition === 'left' || props.mainImagePosition === 'right';
  const hasCustomMainAspectRatio = useCustomMainImageAspectRatio.value;
  const shouldUseSizeForHeight = !hasCustomMainAspectRatio;

  if (isHorizontal || heightValue.value) {
    return {
      width: '100%',
      height: '100%',
      aspectRatio: 'auto'
    };
  }

  if (typeof normalizedMainImageSize.value === 'string') {
    if (hasCustomMainAspectRatio) {
      return {
        width: '100%',
        height: 'auto',
        aspectRatio: mainImageAspectRatioValue.value
      };
    }

    return {
      width: '100%',
      height: normalizedMainImageSize.value,
      aspectRatio: 'auto'
    };
  }

  if (hasCustomMainAspectRatio) {
    return {
      width: '100%',
      height: 'auto',
      aspectRatio: mainImageAspectRatioValue.value
    };
  }

  const mainImageHeight = shouldUseSizeForHeight ? getMainImageHeightExpression() : null;

  return {
    width: '100%',
    height: mainImageHeight ?? '100%',
    aspectRatio: 'auto'
  };
});

function getImageAspectRatio(image: GalleryImage | null) {
  if (!image?.width || !image?.height) {
    return 'auto';
  }

  return `${image.width} / ${image.height}`;
}

function getImageKey(image: GalleryImage, index: number) {
  return image.id ?? `${image.src}-${index}`;
}

function getPreviewImageSrc(image: GalleryImage) {
  return image.thumbnailSrc ?? image.src;
}

function getPreviewImageLoading(image: GalleryImage) {
  return image.loading ?? 'lazy';
}

function getDialogImageLoading(image: GalleryImage) {
  return image.loading ?? 'eager';
}

function setPreviewFrameRef(index: number, element: HTMLDivElement | null) {
  previewFrameRefs.value[index] = element;
}

function setBentoFrameRef(index: number, element: HTMLDivElement | null) {
  bentoFrameRefs.value[index] = element;
}

function getElementRect(element: HTMLElement | null) {
  if (!element || typeof window === 'undefined') {
    return null;
  }

  const rect = element.getBoundingClientRect();
  return new DOMRect(rect.x, rect.y, rect.width, rect.height);
}

function setDialogOpen(nextOpen: boolean) {
  if (!isOpenControlled.value) {
    internalOpen.value = nextOpen;
  }

  emit('update:open', nextOpen);
}

function setCurrentIndex(nextIndex: number, options: { emitChange?: boolean } = {}) {
  if (!totalImages.value) {
    return 0;
  }

  const normalizedIndex = clampIndex(nextIndex);

  if (!isIndexControlled.value) {
    internalIndex.value = normalizedIndex;
  }

  emit('update:index', normalizedIndex);

  if (options.emitChange) {
    emit('change', normalizedIndex);
  }

  return normalizedIndex;
}

async function openSingle(index: number) {
  if (!props.images[index]) {
    return;
  }

  const fromFrame = previewFrameRefs.value[index] ?? null;
  const fromRect = getElementRect(fromFrame);

  const nextIndex = setCurrentIndex(index);
  dialogMode.value = 'single';
  setDialogOpen(true);
  emit('open', nextIndex);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect }
    );
  }
}

async function openBentoFromPreview(index: number) {
  const targetIndex = Math.min(index, totalImages.value - 1);
  const fromFrame = previewFrameRefs.value[targetIndex] ?? null;
  const fromRect = getElementRect(fromFrame);

  const nextIndex = setCurrentIndex(Math.max(0, targetIndex));
  isBentoEntering.value = true;
  dialogMode.value = 'bento';
  setDialogOpen(true);
  emit('open', nextIndex);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => bentoFrameRefs.value[currentIndex.value] ?? null,
      { fromRect }
    );
    await animateBentoEntrance(() => bentoGridRef.value);
    isBentoEntering.value = false;
  } else {
    isBentoEntering.value = false;
  }
}

function closeDialog() {
  setDialogOpen(false);
  dialogMode.value = 'single';
  emit('close');
}

function goNext() {
  if (!totalImages.value) {
    return;
  }

  setCurrentIndex((currentIndex.value + 1) % totalImages.value, { emitChange: true });
}

function goPrevious() {
  if (!totalImages.value) {
    return;
  }

  setCurrentIndex((currentIndex.value - 1 + totalImages.value) % totalImages.value, { emitChange: true });
}

async function toggleDialogMode() {
  if (!dialogIsVisible.value) {
    return;
  }

  if (dialogMode.value === 'single') {
    const fromFrame = carouselFrameRef.value;
    const fromRect = getElementRect(fromFrame);

    isBentoEntering.value = true;
    dialogMode.value = 'bento';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => bentoFrameRefs.value[currentIndex.value] ?? null,
        { fromRect }
      );
      await animateBentoEntrance(() => bentoGridRef.value);
      isBentoEntering.value = false;
    } else {
      isBentoEntering.value = false;
    }
  } else {
    const fromFrame = bentoFrameRefs.value[currentIndex.value] ?? null;
    const fromRect = getElementRect(fromFrame);

    if (isMounted.value) {
      void animateBentoExit(() => bentoGridRef.value, { activeIndex: currentIndex.value });
    }

    dialogMode.value = 'single';

    if (isMounted.value) {
      await animateBetween(
        () => fromFrame,
        () => carouselFrameRef.value,
        { fromRect }
      );
    }
  }
}

async function selectBentoImage(index: number) {
  const fromFrame = bentoFrameRefs.value[index] ?? null;
  const fromRect = getElementRect(fromFrame);

  if (isMounted.value) {
    void animateBentoExit(() => bentoGridRef.value, { activeIndex: index });
  }

  setCurrentIndex(index, { emitChange: true });
  dialogMode.value = 'single';

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect }
    );
  }
}

function getFocusableElements() {
  if (!dialogRef.value) {
    return [];
  }

  return Array.from(
    dialogRef.value.querySelectorAll<HTMLElement>(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )
  ).filter((element) => !element.hasAttribute('disabled') && element.getAttribute('aria-hidden') !== 'true');
}

function focusInitialDialogElement() {
  const focusTarget = closeButtonRef.value ?? getFocusableElements()[0] ?? dialogRef.value;
  focusTarget?.focus();
}

function trapFocus(event: KeyboardEvent) {
  const focusableElements = getFocusableElements();

  if (!focusableElements.length) {
    event.preventDefault();
    dialogRef.value?.focus();
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement as HTMLElement | null;

  if (event.shiftKey && activeElement === firstElement) {
    event.preventDefault();
    lastElement.focus();
    return;
  }

  if (!event.shiftKey && activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

function lockBodyScroll() {
  if (typeof document === 'undefined' || previousBodyOverflow.value !== null) {
    return;
  }

  previousBodyOverflow.value = document.body.style.overflow;
  previousBodyPaddingRight.value = document.body.style.paddingRight;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  document.body.style.overflow = 'hidden';

  if (scrollbarWidth > 0) {
    document.body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function unlockBodyScroll() {
  if (typeof document === 'undefined' || previousBodyOverflow.value === null) {
    return;
  }

  document.body.style.overflow = previousBodyOverflow.value;
  document.body.style.paddingRight = previousBodyPaddingRight.value ?? '';
  previousBodyOverflow.value = null;
  previousBodyPaddingRight.value = null;
}

function onKeydown(event: KeyboardEvent) {
  if (!dialogIsVisible.value) {
    return;
  }

  if (event.key === 'Tab') {
    trapFocus(event);
    return;
  }

  if (event.key === 'Escape') {
    event.preventDefault();
    closeDialog();
    return;
  }

  if (dialogMode.value === 'single' && event.key === 'ArrowRight') {
    event.preventDefault();
    goNext();
    return;
  }

  if (dialogMode.value === 'single' && event.key === 'ArrowLeft') {
    event.preventDefault();
    goPrevious();
  }
}

onMounted(() => {
  isMounted.value = true;
  window.addEventListener('keydown', onKeydown);
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onKeydown);
  }

  unlockBodyScroll();
});

watch(
  () => props.images,
  () => {
    if (!isIndexControlled.value && internalIndex.value > props.images.length - 1) {
      internalIndex.value = Math.max(0, props.images.length - 1);
    }
  }
);

watch(dialogIsVisible, async (open) => {
  if (typeof document === 'undefined') {
    return;
  }

  if (open) {
    lastFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
    await nextTick();
    focusInitialDialogElement();
    return;
  }

  unlockBodyScroll();
  lastFocusedElement.value?.focus();
  lastFocusedElement.value = null;
});
</script>

<template>
  <section class="image-gallery-theme w-full" :style="galleryStyle">
    <div
      v-if="hasMainImage && mainImageEntry && featuredLayoutStyle"
      class="image-gallery-featured"
      :style="featuredLayoutStyle"
    >
      <div class="group relative overflow-hidden rounded-[var(--ig-radius)] bg-white text-left" :style="mainImageItemStyle">
        <button
          type="button"
          class="relative block h-full w-full focus-visible:outline-none"
          :aria-label="`Open image ${mainImageActualIndex + 1}`"
          @click="openSingle(mainImageActualIndex)"
        >
          <div
            :ref="(element) => setPreviewFrameRef(mainImageActualIndex, element as HTMLDivElement | null)"
            class="relative overflow-hidden rounded-[var(--ig-radius)] bg-slate-100"
            :data-transition-radius="transitionRadius"
            :style="mainImageFrameStyle"
          >
            <img
              :src="getPreviewImageSrc(mainImageEntry.image)"
              :alt="mainImageEntry.image.alt"
              :srcset="mainImageEntry.image.srcset"
              :sizes="mainImageEntry.image.sizes"
              :decoding="mainImageEntry.image.decoding"
              class="absolute inset-0 block h-full w-full transition duration-500 group-hover:scale-[1.03]"
              :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
              :loading="getPreviewImageLoading(mainImageEntry.image)"
            />
          </div>
        </button>
      </div>

      <div class="image-gallery-secondary" :style="[secondaryGridStyle, secondaryWrapperStyle]">
        <div
          v-for="entry in visibleSecondaryEntries"
          :key="getImageKey(entry.image, entry.actualIndex)"
          class="group relative min-h-0 overflow-hidden rounded-[var(--ig-radius)] bg-white text-left"
        >
          <button
            type="button"
            class="relative block h-full w-full focus-visible:outline-none"
            :aria-label="`Open image ${entry.actualIndex + 1}`"
            @click="openSingle(entry.actualIndex)"
          >
            <div
              :ref="(element) => setPreviewFrameRef(entry.actualIndex, element as HTMLDivElement | null)"
              class="relative h-full w-full overflow-hidden rounded-[var(--ig-radius)] bg-slate-100"
              :data-transition-radius="transitionRadius"
              :style="heightValue ? undefined : { aspectRatio: imageAspectRatioValue }"
            >
              <img
                :src="getPreviewImageSrc(entry.image)"
                :alt="entry.image.alt"
                :srcset="entry.image.srcset"
                :sizes="entry.image.sizes"
                :decoding="entry.image.decoding"
                class="absolute inset-0 block h-full w-full transition duration-500 group-hover:scale-[1.03]"
                :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
                :loading="getPreviewImageLoading(entry.image)"
              />
            </div>
          </button>

          <button
            v-if="hasOverflow && entry.actualIndex === visibleSecondaryEntries[visibleSecondaryEntries.length - 1]?.actualIndex"
            type="button"
            class="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white/88 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
            :aria-label="`Show all ${totalImages} images`"
            @click.stop="openBentoFromPreview(entry.actualIndex)"
          >
            <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <div v-else class="image-gallery-secondary" :style="plainGridStyle">
      <div
        v-for="entry in visibleSecondaryEntries"
        :key="getImageKey(entry.image, entry.actualIndex)"
        class="group relative min-h-0 overflow-hidden rounded-[var(--ig-radius)] bg-white text-left"
      >
        <button
          type="button"
          class="relative block h-full w-full focus-visible:outline-none"
          :aria-label="`Open image ${entry.actualIndex + 1}`"
          @click="openSingle(entry.actualIndex)"
        >
          <div
            :ref="(element) => setPreviewFrameRef(entry.actualIndex, element as HTMLDivElement | null)"
            class="relative h-full w-full overflow-hidden rounded-[var(--ig-radius)] bg-slate-100"
            :data-transition-radius="transitionRadius"
            :style="heightValue ? undefined : { aspectRatio: imageAspectRatioValue }"
          >
            <img
              :src="getPreviewImageSrc(entry.image)"
              :alt="entry.image.alt"
              :srcset="entry.image.srcset"
              :sizes="entry.image.sizes"
              :decoding="entry.image.decoding"
              class="absolute inset-0 block h-full w-full transition duration-500 group-hover:scale-[1.03]"
              :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
              :loading="getPreviewImageLoading(entry.image)"
            />
          </div>
        </button>

        <button
          v-if="hasOverflow && entry.actualIndex === visibleSecondaryEntries[visibleSecondaryEntries.length - 1]?.actualIndex"
          type="button"
          class="absolute bottom-4 right-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-black/8 bg-white/88 text-slate-700 shadow-lg backdrop-blur transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
          :aria-label="`Show all ${totalImages} images`"
          @click.stop="openBentoFromPreview(entry.actualIndex)"
        >
          <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
            <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
            <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
            <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
          </svg>
        </button>
      </div>
    </div>

    <div
      v-if="dialogIsVisible && activeImage"
      ref="dialogRef"
      class="fixed inset-0 z-50 bg-[var(--ig-overlay)]"
      role="dialog"
      aria-modal="true"
      :aria-label="`Image dialog. ${counterLabel}`"
      tabindex="-1"
    >
      <div class="relative z-10 flex h-screen w-screen flex-col overflow-hidden bg-white">
        <div class="grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[var(--ig-border)] px-4 py-3 text-[var(--ig-text)] sm:px-6">
          <div class="flex min-w-0 items-center gap-3">
            <button
              v-if="dialogMode === 'single' && props.allowGridView"
              type="button"
              aria-label="Toggle image grid"
              class="inline-flex items-center gap-2 rounded-full bg-[var(--ig-button)] px-3 py-2 text-sm font-medium text-[var(--ig-text)] transition hover:bg-[var(--ig-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
              @click="toggleDialogMode"
            >
              <svg viewBox="0 0 24 24" class="h-4 w-4 fill-none stroke-current" stroke-width="1.7">
                <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
                <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
                <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
                <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
              </svg>
              <span>All images</span>
            </button>

            <slot
              v-if="hasDialogToolbarSlot"
              name="dialog-toolbar"
              :image="activeImage"
              :index="currentIndex"
              :total="totalImages"
              :mode="dialogMode"
              :close="closeDialog"
              :toggleMode="toggleDialogMode"
            />
          </div>

          <div
            v-if="dialogMode === 'single'"
            class="text-center text-[11px] font-medium tracking-[0.18em] text-[var(--ig-muted)] uppercase"
          >
            {{ counterLabel }}
          </div>
          <div v-else />

          <div class="flex justify-end">
            <button
              ref="closeButtonRef"
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--ig-button)] text-[var(--ig-text)] transition hover:bg-[var(--ig-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
              aria-label="Close dialog"
              @click="closeDialog"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>

        <div class="relative flex-1 overflow-hidden bg-[var(--ig-panel)]">
          <div v-if="dialogMode === 'single'" class="flex h-full items-center justify-center">
            <button
              type="button"
              class="absolute left-4 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ig-button)] text-[var(--ig-text)] transition hover:bg-[var(--ig-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
              aria-label="Previous image"
              @click="goPrevious"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                <path d="m14.5 5.5-6 6 6 6" />
              </svg>
            </button>

            <div class="flex h-full w-full flex-col items-center justify-center px-10 py-6 sm:px-20">
              <div
                ref="carouselFrameRef"
                class="relative overflow-hidden rounded-[var(--ig-radius)]"
                :data-transition-radius="transitionRadius"
                :style="{ aspectRatio: getImageAspectRatio(activeImage), width: 'min(100%, 56rem)', maxHeight: 'calc(100vh - 8rem)' }"
              >
                <img
                  :key="getImageKey(activeImage, currentIndex)"
                  :src="activeImage.src"
                  :alt="activeImage.alt"
                  :srcset="activeImage.srcset"
                  :sizes="activeImage.sizes"
                  :decoding="activeImage.decoding"
                  :loading="getDialogImageLoading(activeImage)"
                  class="absolute inset-0 block h-full w-full rounded-[var(--ig-radius)]"
                  :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
                />
              </div>

              <div
                v-if="hasDialogCaptionSlot || activeImage.caption"
                class="mt-4 w-full max-w-3xl text-center text-sm leading-6 text-[var(--ig-muted)]"
              >
                <slot
                  name="dialog-caption"
                  :image="activeImage"
                  :index="currentIndex"
                  :total="totalImages"
                >
                  {{ activeImage.caption }}
                </slot>
              </div>
            </div>

            <button
              type="button"
              class="absolute right-4 top-1/2 z-20 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-[var(--ig-button)] text-[var(--ig-text)] transition hover:bg-[var(--ig-button-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]"
              aria-label="Next image"
              @click="goNext"
            >
              <svg viewBox="0 0 24 24" class="h-5 w-5 fill-none stroke-current" stroke-width="1.7">
                <path d="m9.5 5.5 6 6-6 6" />
              </svg>
            </button>
          </div>

          <div v-else class="h-full overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
            <div ref="bentoGridRef" class="image-gallery-masonry">
              <button
                v-for="(image, index) in props.images"
                :key="getImageKey(image, index)"
                type="button"
                data-bento-item="true"
                :data-bento-index="index"
                :data-bento-active="index === currentIndex ? 'true' : 'false'"
                :class="[
                  'group relative block w-full overflow-hidden text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]',
                  isBentoEntering && index !== currentIndex ? 'opacity-0 translate-y-5 scale-[0.98]' : ''
                ]"
                :style="{ borderRadius: masonryTileRadius }"
                :aria-label="`Open image ${index + 1} from grid`"
                @click="selectBentoImage(index)"
              >
                <div
                  :ref="(element) => setBentoFrameRef(index, element as HTMLDivElement | null)"
                  class="relative w-full overflow-hidden"
                  :data-transition-radius="transitionRadius"
                  :style="{ aspectRatio: getImageAspectRatio(image), borderRadius: masonryTileRadius }"
                >
                  <img
                    :src="getPreviewImageSrc(image)"
                    :alt="image.alt"
                    :srcset="image.srcset"
                    :sizes="image.sizes"
                    :decoding="image.decoding"
                    :loading="getPreviewImageLoading(image)"
                    class="absolute inset-0 block h-full w-full transition duration-300 group-hover:scale-[1.02]"
                    :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
                  />
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>
