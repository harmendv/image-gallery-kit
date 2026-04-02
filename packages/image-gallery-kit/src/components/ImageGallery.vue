<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useSharedImageTransition } from '@/composables/useSharedImageTransition';
import type { GalleryImage } from '@/types';

const props = withDefaults(
  defineProps<{
    images: GalleryImage[];
    previewCount?: number;
    previewAspectRatio?: number | string;
    mainImageIndex?: number | null;
    previewHeight?: string | null;
    width?: string | null;
    imageRadius?: string | null;
  }>(),
  {
    previewCount: 4,
    previewAspectRatio: '4 / 5',
    mainImageIndex: null,
    previewHeight: null,
    width: '100%',
    imageRadius: null
  }
);

const emit = defineEmits<{
  (event: 'open', index: number): void;
  (event: 'close'): void;
  (event: 'change', index: number): void;
}>();

type DialogMode = 'single' | 'bento';

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

const requestedPreviewCount = computed(() => Math.max(1, Math.min(9, props.previewCount)));
const totalImages = computed(() => props.images.length);
const requestedMainImage = computed(() => {
  if (props.mainImageIndex === null || props.mainImageIndex === undefined) {
    return false;
  }

  return props.mainImageIndex >= 0 && props.mainImageIndex < props.images.length;
});

function resolvePreviewCount(rawCount: number, withMainImage: boolean) {
  const allowed = withMainImage ? [1, 3, 5, 7, 9] : [1, 2, 3, 4, 6, 8, 9];

  for (let index = allowed.length - 1; index >= 0; index -= 1) {
    if (rawCount >= allowed[index]) {
      return allowed[index];
    }
  }

  return 1;
}

const safePreviewCount = computed(() => resolvePreviewCount(requestedPreviewCount.value, requestedMainImage.value));
const hasOverflow = computed(() => totalImages.value > safePreviewCount.value);
const hasMainImage = computed(() => {
  if (!requestedMainImage.value) {
    return false;
  }

  return safePreviewCount.value > 1;
});

const previewEntries = computed(() => {
  if (!hasMainImage.value) {
    return props.images.slice(0, safePreviewCount.value).map((image, index) => ({
      image,
      actualIndex: index,
      featured: false
    }));
  }

  const featuredIndex = props.mainImageIndex as number;
  const remaining = props.images
    .map((image, index) => ({ image, index }))
    .filter((entry) => entry.index !== featuredIndex)
    .slice(0, safePreviewCount.value - 1);

  return [
    {
      image: props.images[featuredIndex],
      actualIndex: featuredIndex,
      featured: true
    },
    ...remaining.map((entry) => ({
      image: entry.image,
      actualIndex: entry.index,
      featured: false
    }))
  ];
});

const featuredPreviewEntry = computed(() => previewEntries.value.find((entry) => entry.featured) ?? null);
const featuredPreviewActualIndex = computed(() => featuredPreviewEntry.value?.actualIndex ?? -1);
const secondaryPreviewEntries = computed(() => previewEntries.value.filter((entry) => !entry.featured));
const lastPreviewEntry = computed(() => previewEntries.value[previewEntries.value.length - 1] ?? null);

const previewAspectRatioValue = computed(() => {
  if (typeof props.previewAspectRatio === 'number') {
    return `${props.previewAspectRatio}`;
  }

  return props.previewAspectRatio;
});

const previewHeightValue = computed(() => props.previewHeight);
const galleryStyle = computed(() => ({
  width: props.width ?? '100%',
  '--ig-radius': props.imageRadius ?? undefined
}));

const previewAspectRatioNumber = computed(() => {
  if (typeof props.previewAspectRatio === 'number') {
    return props.previewAspectRatio;
  }

  const normalized = props.previewAspectRatio.replace(/\s+/g, '');
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

const featuredPreviewColumns = computed(() => {
  if (previewHeightValue.value) {
    const ratio = previewAspectRatioNumber.value;
    const rows = mainLayoutRowCount.value;
    const cols = mainLayoutColumns.value;
    const gap = '1rem';
    const tileHeight = `((${previewHeightValue.value}) - (${Math.max(rows - 1, 0)} * ${gap})) / ${rows}`;
    const sideWidth = `${cols} * (${tileHeight}) * ${ratio} + (${Math.max(cols - 1, 0)} * ${gap})`;

    return `minmax(0, 1fr) minmax(0, calc(${sideWidth}))`;
  }

  const ratio = previewAspectRatioNumber.value;
  const gapRem = 1;
  const rowCount = Math.max(1, Math.ceil(mainLayoutEntries.value.length / 2));
  return `minmax(0, calc((100% - (${gapRem}rem * ${(rowCount - 1) * ratio + 1})) / ${rowCount + 2} * ${rowCount} + ${gapRem}rem * ${(rowCount - 1) * ratio})) minmax(0, calc((100% - (${gapRem}rem * ${(rowCount - 1) * ratio + 1})) / ${rowCount + 2} * 2))`;
});

const mainLayoutEntries = computed(() => secondaryPreviewEntries.value);
const mainLayoutColumns = computed(() => {
  if (mainLayoutEntries.value.length <= 2) {
    return 1;
  }

  return 2;
});
const mainLayoutRowCount = computed(() => Math.max(1, Math.ceil(mainLayoutEntries.value.length / mainLayoutColumns.value)));
const previewGridColumns = computed(() => {
  const count = Math.min(previewEntries.value.length, safePreviewCount.value);

  if (count === 1) {
    return 1;
  }

  if (count === 2 || count === 3) {
    return count;
  }

  if (count === 4 || count === 6 || count === 8) {
    if (count === 8) {
      return 4;
    }

    return 2;
  }

  return 3;
});
const previewGridRows = computed(() => Math.max(1, Math.ceil(previewEntries.value.length / previewGridColumns.value)));

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
  const fromFrame = previewFrameRefs.value[index] ?? null;
  const fromRect = getElementRect(fromFrame);

  activeIndex.value = Math.min(index, totalImages.value - 1);
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
      v-if="hasMainImage && featuredPreviewEntry"
      class="image-gallery-featured grid gap-3 sm:gap-4"
      :data-fixed-height="previewHeightValue ? 'true' : 'false'"
      :style="{
        '--ig-featured-columns': featuredPreviewColumns,
        '--ig-featured-height': previewHeightValue ?? 'auto',
        '--ig-preview-aspect-ratio': previewAspectRatioValue
      }"
    >
      <div
        class="image-gallery-featured-main group relative min-h-0 overflow-hidden rounded-[var(--ig-radius)] bg-white text-left lg:self-start"
      >
        <button
          type="button"
          class="image-gallery-featured-trigger relative block w-full focus-visible:outline-none"
          :aria-label="`Open image ${featuredPreviewActualIndex + 1}`"
          @click="openSingle(featuredPreviewActualIndex)"
        >
          <div
            :ref="(element) => setPreviewFrameRef(featuredPreviewActualIndex, element as HTMLDivElement | null)"
            class="image-gallery-featured-frame relative w-full overflow-hidden rounded-[var(--ig-radius)] bg-slate-100"
          >
            <img
              :src="featuredPreviewEntry.image.src"
              :alt="featuredPreviewEntry.image.alt"
              class="absolute inset-0 block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
              loading="lazy"
            />
          </div>
        </button>
      </div>

      <div
        class="image-gallery-featured-side grid items-start gap-3 sm:gap-4"
        :style="{
          gridTemplateColumns: `repeat(${mainLayoutColumns}, minmax(0, 1fr))`,
          gridTemplateRows: previewHeightValue ? `repeat(${mainLayoutRowCount}, minmax(0, 1fr))` : undefined
        }"
      >
        <div
          v-for="entry in mainLayoutEntries"
          :key="entry.image.src"
          class="image-gallery-featured-item group relative min-h-0 overflow-hidden rounded-[var(--ig-radius)] bg-white text-left"
        >
          <button
            type="button"
            class="image-gallery-featured-trigger relative block w-full focus-visible:outline-none"
            :aria-label="`Open image ${entry.actualIndex + 1}`"
            @click="openSingle(entry.actualIndex)"
          >
            <div
              :ref="(element) => setPreviewFrameRef(entry.actualIndex, element as HTMLDivElement | null)"
              class="image-gallery-featured-frame relative w-full overflow-hidden rounded-[var(--ig-radius)] bg-slate-100"
            >
              <img
                :src="entry.image.src"
                :alt="entry.image.alt"
                class="absolute inset-0 block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
                loading="lazy"
              />
            </div>
          </button>

          <button
            v-if="hasOverflow && lastPreviewEntry && entry.actualIndex === lastPreviewEntry.actualIndex"
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

    <div
      v-else
      class="grid gap-3 sm:gap-4"
      :style="{
        gridTemplateColumns: `repeat(${previewGridColumns}, minmax(0, 1fr))`,
        gridTemplateRows: previewHeightValue ? `repeat(${previewGridRows}, minmax(0, 1fr))` : undefined,
        height: previewHeightValue ?? undefined
      }"
    >
        <div
          v-for="entry in previewEntries"
          :key="entry.image.src"
          class="group relative min-h-0 h-full overflow-hidden rounded-[var(--ig-radius)] bg-white text-left"
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
            :style="
              previewHeightValue
                ? undefined
                : {
                    aspectRatio: previewAspectRatioValue
                  }
            "
          >
            <img
              :src="entry.image.src"
              :alt="entry.image.alt"
              class="absolute inset-0 block h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
              :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
              loading="lazy"
            />
          </div>
        </button>

        <button
          v-if="hasOverflow && lastPreviewEntry && entry.actualIndex === lastPreviewEntry.actualIndex"
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
            v-if="dialogMode === 'single'"
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
                  class="absolute inset-0 block h-full w-full rounded-[var(--ig-radius)] object-cover"
                  :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
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
                  class="absolute inset-0 block h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  :style="{ width: '100%', height: '100%', objectFit: 'cover' }"
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
