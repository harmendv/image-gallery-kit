<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
    rows?: number;
    columns?: number;
    itemAspectRatio?: number | string;
    mainImageIndex?: number | null;
    mainImagePosition?: MainImagePosition;
    mainImageSize?: MainImageSize;
    gap?: string;
    imageFit?: ImageFit;
    allowGridView?: boolean;
    height?: string | null;
    width?: string | null;
    imageRadius?: string | null;
  }>(),
  {
    rows: 2,
    columns: 2,
    itemAspectRatio: '4 / 5',
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
}>();

const isMounted = ref(false);
const isDialogOpen = ref(false);
const dialogMode = ref<DialogMode>('single');
const activeIndex = ref(0);
const previewFrameRefs = ref<(HTMLDivElement | null)[]>([]);
const bentoFrameRefs = ref<(HTMLDivElement | null)[]>([]);
const carouselFrameRef = ref<HTMLDivElement | null>(null);
const bentoGridRef = ref<HTMLDivElement | null>(null);
const isBentoEntering = ref(false);

const { animateBetween, animateBentoEntrance } = useSharedImageTransition();

const rowCount = computed(() => Math.max(1, Math.floor(props.rows)));
const columnCount = computed(() => Math.max(1, Math.floor(props.columns)));
const secondaryCapacity = computed(() => rowCount.value * columnCount.value);
const totalImages = computed(() => props.images.length);
const heightValue = computed(() => props.height);
const itemAspectRatioValue = computed(() => {
  if (typeof props.itemAspectRatio === 'number') {
    return `${props.itemAspectRatio}`;
  }

  return props.itemAspectRatio;
});
const itemAspectRatioNumber = computed(() => {
  if (typeof props.itemAspectRatio === 'number') {
    return props.itemAspectRatio > 0 ? props.itemAspectRatio : 1;
  }

  const normalized = props.itemAspectRatio.replace(/\s+/g, '');
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

const visibleSecondaryImageCount = computed(() => secondaryCapacity.value);
const visibleSecondaryEntries = computed(() => secondaryEntries.value.slice(0, visibleSecondaryImageCount.value));
const hiddenSecondaryCount = computed(() => Math.max(0, secondaryEntries.value.length - visibleSecondaryEntries.value.length));
const hasOverflow = computed(() => props.allowGridView && hiddenSecondaryCount.value > 0);
const overflowAnchorIndex = computed(() => {
  return visibleSecondaryEntries.value[visibleSecondaryEntries.value.length - 1]?.actualIndex
    ?? mainImageEntry.value?.actualIndex
    ?? 0;
});
const plainGridItemCount = computed(() => visibleSecondaryEntries.value.length);
const plainGridRows = computed(() => Math.max(1, Math.ceil(plainGridItemCount.value / columnCount.value)));
const secondaryGridItemCount = computed(() => visibleSecondaryEntries.value.length);
const actualSecondaryRows = computed(() => Math.max(1, Math.ceil(secondaryGridItemCount.value / columnCount.value)));

const normalizedMainImageSize = computed(() => {
  if (typeof props.mainImageSize === 'number') {
    return Math.min(0.95, Math.max(0.05, props.mainImageSize));
  }

  return props.mainImageSize.trim();
});
const previewGap = computed(() => props.gap);
const objectFitValue = computed(() => props.imageFit);
const galleryStyle = computed(() => ({
  width: props.width ?? '100%',
  '--ig-radius': props.imageRadius ?? undefined
}));

function getSecondaryHeightExpression() {
  const ratio = itemAspectRatioNumber.value;
  const columns = columnCount.value;
  const rows = rowCount.value;
  const gap = previewGap.value;
  const cellWidth = `((100% - (${Math.max(columns - 1, 0)} * ${gap})) / ${columns})`;
  const cellHeight = `(${cellWidth} / ${ratio})`;

  return `calc((${rows} * ${cellHeight}) + (${Math.max(rows - 1, 0)} * ${gap}))`;
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
    } else {
      mainTrack = `minmax(0, ${normalizedMainImageSize.value})`;
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

  if (typeof normalizedMainImageSize.value === 'number') {
    if (heightValue.value) {
      const mainFraction = normalizedMainImageSize.value;
      const secondaryFraction = 1 - mainFraction;
      mainTrack = `minmax(0, calc((100% - ${gap}) * ${mainFraction}))`;
      secondaryTrack = `minmax(0, calc((100% - ${gap}) * ${secondaryFraction}))`;
      baseStyle.height = heightValue.value;
    } else {
      const secondaryHeight = getSecondaryHeightExpression();
      const mainFactor = normalizedMainImageSize.value / (1 - normalizedMainImageSize.value);
      mainTrack = `minmax(0, calc(${secondaryHeight} * ${mainFactor}))`;
      secondaryTrack = 'auto';
    }
  } else {
    mainTrack = `minmax(0, ${normalizedMainImageSize.value})`;
    secondaryTrack = heightValue.value ? 'minmax(0, 1fr)' : 'auto';

    if (heightValue.value) {
      baseStyle.height = heightValue.value;
    }
  }

  baseStyle.gridTemplateRows =
    props.mainImagePosition === 'top'
      ? `${mainTrack} ${secondaryTrack}`
      : `${secondaryTrack} ${mainTrack}`;

  return baseStyle;
});

const secondaryGridStyle = computed(() => ({
  display: 'grid',
  gap: previewGap.value,
  gridTemplateColumns: `repeat(${columnCount.value}, minmax(0, 1fr))`,
  gridTemplateRows: heightValue.value ? `repeat(${rowCount.value}, minmax(0, 1fr))` : undefined,
  height: hasMainImage.value ? '100%' : heightValue.value ?? undefined,
  alignContent: 'start'
}));

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
  return {
    minHeight: 0,
    height: isHorizontal ? '100%' : undefined,
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

  if (isHorizontal || heightValue.value) {
    return {
      width: '100%',
      height: '100%',
      aspectRatio: 'auto'
    };
  }

  if (typeof normalizedMainImageSize.value === 'string') {
    return {
      width: '100%',
      height: normalizedMainImageSize.value,
      aspectRatio: 'auto'
    };
  }

  return {
    width: '100%',
    height: '100%',
    aspectRatio: 'auto'
  };
});

const activeImage = computed(() => props.images[activeIndex.value] ?? null);
const counterLabel = computed(() => `${activeIndex.value + 1} of ${totalImages.value}`);

function getImageAspectRatio(image: GalleryImage | null) {
  if (!image?.width || !image?.height) {
    return 'auto';
  }

  return `${image.width} / ${image.height}`;
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

async function openSingle(index: number) {
  if (!props.images[index]) {
    return;
  }

  const fromFrame = previewFrameRefs.value[index] ?? null;
  const fromRect = getElementRect(fromFrame);

  activeIndex.value = index;
  dialogMode.value = 'single';
  isDialogOpen.value = true;
  emit('open', index);

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

  activeIndex.value = Math.max(0, targetIndex);
  isBentoEntering.value = true;
  dialogMode.value = 'bento';
  isDialogOpen.value = true;
  emit('open', activeIndex.value);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => bentoFrameRefs.value[activeIndex.value] ?? null,
      { fromRect }
    );
    await animateBentoEntrance(() => bentoGridRef.value);
    isBentoEntering.value = false;
  } else {
    isBentoEntering.value = false;
  }
}

function closeDialog() {
  isDialogOpen.value = false;
  dialogMode.value = 'single';
  emit('close');
}

function goTo(index: number) {
  if (!props.images[index]) {
    return;
  }

  activeIndex.value = index;
  emit('change', index);
}

function goNext() {
  if (!totalImages.value) {
    return;
  }

  activeIndex.value = (activeIndex.value + 1) % totalImages.value;
  emit('change', activeIndex.value);
}

function goPrevious() {
  if (!totalImages.value) {
    return;
  }

  activeIndex.value = (activeIndex.value - 1 + totalImages.value) % totalImages.value;
  emit('change', activeIndex.value);
}

async function toggleDialogMode() {
  if (!isDialogOpen.value) {
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
        () => bentoFrameRefs.value[activeIndex.value] ?? null,
        { fromRect }
      );
      await animateBentoEntrance(() => bentoGridRef.value);
      isBentoEntering.value = false;
    } else {
      isBentoEntering.value = false;
    }
  } else {
    const fromFrame = bentoFrameRefs.value[activeIndex.value] ?? null;
    const fromRect = getElementRect(fromFrame);

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

  activeIndex.value = index;
  dialogMode.value = 'single';
  emit('change', index);

  if (isMounted.value) {
    await animateBetween(
      () => fromFrame,
      () => carouselFrameRef.value,
      { fromRect }
    );
  }
}

function onKeydown(event: KeyboardEvent) {
  if (!isDialogOpen.value) {
    return;
  }

  if (event.key === 'Escape') {
    closeDialog();
  }

  if (dialogMode.value === 'single' && event.key === 'ArrowRight') {
    goNext();
  }

  if (dialogMode.value === 'single' && event.key === 'ArrowLeft') {
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
});

watch(
  () => props.images,
  () => {
    if (activeIndex.value > props.images.length - 1) {
      activeIndex.value = Math.max(0, props.images.length - 1);
    }
  }
);

watch(isDialogOpen, async (open) => {
  if (open) {
    await nextTick();
  }
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
            :style="mainImageFrameStyle"
          >
            <img
              :src="mainImageEntry.image.src"
              :alt="mainImageEntry.image.alt"
              class="absolute inset-0 block h-full w-full transition duration-500 group-hover:scale-[1.03]"
              :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
              loading="lazy"
            />
          </div>
        </button>
      </div>

      <div class="image-gallery-secondary" :style="[secondaryGridStyle, secondaryWrapperStyle]">
        <div
          v-for="entry in visibleSecondaryEntries"
          :key="entry.image.src"
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
              :style="heightValue ? undefined : { aspectRatio: itemAspectRatioValue }"
            >
              <img
                :src="entry.image.src"
                :alt="entry.image.alt"
                class="absolute inset-0 block h-full w-full transition duration-500 group-hover:scale-[1.03]"
                :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
                loading="lazy"
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
        :key="entry.image.src"
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
            :style="heightValue ? undefined : { aspectRatio: itemAspectRatioValue }"
          >
            <img
              :src="entry.image.src"
              :alt="entry.image.alt"
              class="absolute inset-0 block h-full w-full transition duration-500 group-hover:scale-[1.03]"
              :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
              loading="lazy"
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
      v-if="isDialogOpen && activeImage"
      class="fixed inset-0 z-50 bg-[var(--ig-overlay)]"
      role="dialog"
      aria-modal="true"
      :aria-label="`Image dialog. ${counterLabel}`"
    >
      <div class="relative z-10 flex h-screen w-screen flex-col overflow-hidden bg-white">
        <div
          class="flex items-center gap-4 border-b border-[var(--ig-border)] px-4 py-3 text-[var(--ig-text)] sm:px-6"
          :class="dialogMode === 'single' ? 'justify-between' : 'justify-end'"
        >
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

          <div
            v-if="dialogMode === 'single'"
            class="text-center text-[11px] font-medium tracking-[0.18em] text-[var(--ig-muted)] uppercase"
          >
            {{ counterLabel }}
          </div>

          <button
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

            <div class="flex h-full w-full items-center justify-center px-10 py-6 sm:px-20">
              <div
                ref="carouselFrameRef"
                class="relative overflow-hidden rounded-[var(--ig-radius)]"
                :style="{ aspectRatio: getImageAspectRatio(activeImage), width: 'min(100%, 56rem)', maxHeight: 'calc(100vh - 8rem)' }"
              >
                <img
                  :key="activeImage.src"
                  :src="activeImage.src"
                  :alt="activeImage.alt"
                  class="absolute inset-0 block h-full w-full rounded-[var(--ig-radius)]"
                  :style="{ width: '100%', height: '100%', objectFit: objectFitValue }"
                />
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
                :key="`${image.src}-${index}`"
                type="button"
                data-bento-item="true"
                :data-bento-active="index === activeIndex ? 'true' : 'false'"
                :class="[
                  'group relative block w-full overflow-hidden rounded-[calc(var(--ig-radius)-0.4rem)] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ig-ring)]',
                  isBentoEntering && index !== activeIndex ? 'opacity-0 translate-y-5 scale-[0.98]' : ''
                ]"
                :aria-label="`Open image ${index + 1} from grid`"
                @click="selectBentoImage(index)"
              >
                <div
                  :ref="(element) => setBentoFrameRef(index, element as HTMLDivElement | null)"
                  class="relative w-full overflow-hidden rounded-[calc(var(--ig-radius)-0.4rem)]"
                  :style="{ aspectRatio: getImageAspectRatio(image) }"
                >
                  <img
                    :src="image.src"
                    :alt="image.alt"
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
