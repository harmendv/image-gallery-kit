<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { ImageGallery, type GalleryImage, type ImageFit, type MainImagePosition } from 'image-gallery-kit';
import { demoImages } from './imageFixtures';
import FieldHint from './FieldHint.vue';
import { Input } from '@docs/components/ui/input';
import { Label } from '@docs/components/ui/label';
import { NativeSelect, NativeSelectOption } from '@docs/components/ui/native-select';
import { Switch } from '@docs/components/ui/switch';

type MainImageSizeMode = 'fraction' | 'css';

type PlaygroundState = {
  imageCount: number;
  rows: number;
  columns: number;
  imageAspectRatio: string;
  useMainImageAspectRatio: boolean;
  mainImageAspectRatio: string;
  hasMainImage: boolean;
  mainImageIndex: number;
  mainImagePosition: MainImagePosition;
  mainImageSizeMode: MainImageSizeMode;
  mainImageSizeFraction: number;
  mainImageSizeCss: string;
  gap: string;
  imageFit: ImageFit;
  allowGridView: boolean;
  useHeight: boolean;
  height: string;
  useWidth: boolean;
  width: string;
  useImageRadius: boolean;
  imageRadius: string;
};

const defaults: PlaygroundState = {
  imageCount: 12,
  rows: 2,
  columns: 3,
  imageAspectRatio: '4 / 5',
  useMainImageAspectRatio: false,
  mainImageAspectRatio: '4 / 5',
  hasMainImage: true,
  mainImageIndex: 0,
  mainImagePosition: 'left',
  mainImageSizeMode: 'fraction',
  mainImageSizeFraction: 0.4,
  mainImageSizeCss: '18rem',
  gap: '1rem',
  imageFit: 'cover',
  allowGridView: true,
  useHeight: false,
  height: '24rem',
  useWidth: false,
  width: '100%',
  useImageRadius: false,
  imageRadius: '1.4rem'
};

const state = reactive<PlaygroundState>({ ...defaults });

const visibleImages = computed<GalleryImage[]>(() => demoImages.slice(0, Math.max(1, Math.min(state.imageCount, demoImages.length))));
const maxMainImageIndex = computed(() => Math.max(0, visibleImages.value.length - 1));
const imageCountOptions = computed(() => Array.from({ length: demoImages.length }, (_, index) => `${index + 1}`));
const gridSizeOptions = ['1', '2', '3', '4', '5', '6'];
const mainImageIndexOptions = computed(() => ['none', ...visibleImages.value.map((_, index) => `${index}`)]);
const supportsFractionalVerticalSize = computed(() => {
  return (state.mainImagePosition === 'left' || state.mainImagePosition === 'right') || state.useHeight;
});
const mainImageSizeModeOptions = computed(() =>
  supportsFractionalVerticalSize.value
    ? [
        { value: 'fraction', label: 'Fraction' },
        { value: 'css', label: 'CSS size' }
      ]
    : [
        { value: 'css', label: 'CSS size' }
      ]
);

const galleryProps = computed(() => ({
  images: visibleImages.value,
  rows: Math.max(1, Math.floor(state.rows || 1)),
  columns: Math.max(1, Math.floor(state.columns || 1)),
  imageAspectRatio: state.imageAspectRatio.trim() || '4 / 5',
  mainImageAspectRatio: state.useMainImageAspectRatio ? (state.mainImageAspectRatio.trim() || '4 / 5') : null,
  mainImageIndex: state.hasMainImage ? state.mainImageIndex : null,
  mainImagePosition: state.mainImagePosition,
  mainImageSize: state.mainImageSizeMode === 'fraction'
    ? Math.min(0.95, Math.max(0.05, state.mainImageSizeFraction || 0.4))
    : (state.mainImageSizeCss.trim() || '18rem'),
  gap: state.gap.trim() || '1rem',
  imageFit: state.imageFit,
  allowGridView: state.allowGridView,
  height: state.useHeight ? (state.height.trim() || '24rem') : null,
  width: state.useWidth ? (state.width.trim() || '100%') : null,
  imageRadius: state.useImageRadius ? (state.imageRadius.trim() || '1.4rem') : null
}));

const galleryCode = computed(() => {
  const lines = ['<ImageGallery', `  :images="images.slice(0, ${visibleImages.value.length})"`];

  lines.push('');
  lines.push('  <!-- Layout -->');
  lines.push(`  :rows="${galleryProps.value.rows}"`);
  lines.push(`  :columns="${galleryProps.value.columns}"`);
  lines.push(`  image-aspect-ratio="${galleryProps.value.imageAspectRatio}"`);

  lines.push('');
  lines.push('  <!-- Main image -->');
  if (galleryProps.value.mainImageIndex === null) {
    lines.push('  :main-image-index="null"');
  } else {
    lines.push(`  :main-image-index="${galleryProps.value.mainImageIndex}"`);
  }

  lines.push(`  main-image-position="${galleryProps.value.mainImagePosition}"`);
  if (galleryProps.value.mainImageAspectRatio === null) {
    lines.push('  :main-image-aspect-ratio="null"');
  } else {
    lines.push(`  main-image-aspect-ratio="${galleryProps.value.mainImageAspectRatio}"`);
  }

  if (typeof galleryProps.value.mainImageSize === 'number') {
    lines.push(`  :main-image-size="${galleryProps.value.mainImageSize}"`);
  } else {
    lines.push(`  main-image-size="${galleryProps.value.mainImageSize}"`);
  }

  lines.push('');
  lines.push('  <!-- Display -->');
  lines.push(`  gap="${galleryProps.value.gap}"`);
  lines.push(`  image-fit="${galleryProps.value.imageFit}"`);
  lines.push(`  :allow-grid-view="${galleryProps.value.allowGridView}"`);

  if (galleryProps.value.height === null) {
    lines.push('  :height="null"');
  } else {
    lines.push(`  height="${galleryProps.value.height}"`);
  }

  if (galleryProps.value.width === null) {
    lines.push('  :width="null"');
  } else {
    lines.push(`  width="${galleryProps.value.width}"`);
  }

  if (galleryProps.value.imageRadius === null) {
    lines.push('  :image-radius="null"');
  } else {
    lines.push(`  image-radius="${galleryProps.value.imageRadius}"`);
  }

  lines.push('/>');

  return lines.join('\n');
});

function updateImageCount(value: string) {
  state.imageCount = Number(value);
}

function updateRows(value: string) {
  state.rows = Number(value);
}

function updateColumns(value: string) {
  state.columns = Number(value);
}

function updateMainImageSelection(value: string) {
  state.hasMainImage = value !== 'none';
  state.mainImageIndex = value === 'none' ? 0 : Number(value);
}

watch(
  () => [state.mainImagePosition, state.useHeight] as const,
  () => {
    if (!supportsFractionalVerticalSize.value && state.mainImageSizeMode === 'fraction') {
      state.mainImageSizeMode = 'css';
    }
  },
  { immediate: true }
);
</script>

<template>
  <section class="docs-shadcn playground-shell">
    <hr class="playground-divider">

    <div class="playground-grid">
          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="imageCount">images</Label>
              <FieldHint text="Uses the shared fixture set and trims it to the selected number of active images." />
            </div>
            <NativeSelect id="imageCount" :model-value="String(state.imageCount)" @update:model-value="updateImageCount">
              <NativeSelectOption v-for="option in imageCountOptions" :key="option" :value="option">
                {{ option }}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="rows">rows</Label>
              <FieldHint text="Bounded to a sensible docs range so the preview stays readable and nobody can type absurd values." />
            </div>
            <NativeSelect id="rows" :model-value="String(state.rows)" @update:model-value="updateRows">
              <NativeSelectOption v-for="option in gridSizeOptions" :key="option" :value="option">
                {{ option }}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="columns">columns</Label>
              <FieldHint text="Uses the same bounded range as rows so the playground demonstrates realistic layouts." />
            </div>
            <NativeSelect id="columns" :model-value="String(state.columns)" @update:model-value="updateColumns">
              <NativeSelectOption v-for="option in gridSizeOptions" :key="option" :value="option">
                {{ option }}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="imageAspectRatio">imageAspectRatio</Label>
              <FieldHint text="Accepts a ratio string like 16 / 9 or a numeric value like 1.25." />
            </div>
            <Input id="imageAspectRatio" v-model="state.imageAspectRatio" type="text" placeholder="4 / 5" />
          </div>

          <div class="playground-field">
            <div class="playground-toggle-row">
              <div class="playground-label-row">
                <Label for="mainImageIndex">mainImageIndex</Label>
                <FieldHint text="Choose a valid featured image or none to fall back to the plain preview grid." />
              </div>
            </div>
            <NativeSelect id="mainImageIndex" :model-value="state.hasMainImage ? String(state.mainImageIndex) : 'none'" @update:model-value="updateMainImageSelection">
              <NativeSelectOption v-for="option in mainImageIndexOptions" :key="option" :value="option">
                {{ option }}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field">
            <div class="playground-toggle-row">
              <div class="playground-label-row">
                <Label for="mainImagePosition">mainImagePosition</Label>
                <FieldHint text="Places the featured image on one side of the supporting grid." />
              </div>
            </div>
            <NativeSelect id="mainImagePosition" v-model="state.mainImagePosition">
              <NativeSelectOption value="left">left</NativeSelectOption>
              <NativeSelectOption value="right">right</NativeSelectOption>
              <NativeSelectOption value="top">top</NativeSelectOption>
              <NativeSelectOption value="bottom">bottom</NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field playground-main-image-size-group">
            <div class="playground-label-row">
              <Label>mainImageSize</Label>
              <FieldHint text="Fraction mode is available for left and right layouts, or for top and bottom when an explicit height is enabled. Otherwise use a CSS size like 14rem." />
            </div>
            <NativeSelect v-model="state.mainImageSizeMode" class="playground-main-image-size-mode">
              <NativeSelectOption
                v-for="option in mainImageSizeModeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field playground-main-image-size-value">
            <Label class="playground-sr-only">mainImageSize value</Label>
            <Input
              v-if="state.mainImageSizeMode === 'fraction'"
              v-model.number="state.mainImageSizeFraction"
              type="number"
              min="0.05"
              max="0.95"
              step="0.05"
            />
            <Input
              v-else
              v-model="state.mainImageSizeCss"
              type="text"
              placeholder="18rem"
            />
          </div>

          <div class="playground-field">
            <div class="playground-toggle-row">
              <div class="playground-label-row">
                <Label for="useMainImageAspectRatio">mainImageAspectRatio</Label>
                <FieldHint text="Optional ratio for the featured image in top and bottom layouts when height is intrinsic. When set, it takes precedence over numeric mainImageSize." />
              </div>
              <div class="flex items-center gap-2">
                <span class="playground-switch-label">{{ state.useMainImageAspectRatio ? 'Custom' : 'null' }}</span>
                <Switch id="useMainImageAspectRatio" v-model="state.useMainImageAspectRatio" />
              </div>
            </div>
            <Input
              id="mainImageAspectRatio"
              v-model="state.mainImageAspectRatio"
              type="text"
              placeholder="4 / 5"
              :disabled="!state.useMainImageAspectRatio"
            />
          </div>

          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="gap">gap</Label>
              <FieldHint text="CSS spacing between preview items, such as 1rem or 12px." />
            </div>
            <Input id="gap" v-model="state.gap" type="text" placeholder="1rem" />
          </div>

          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="imageFit">imageFit</Label>
              <FieldHint text="Switches image rendering between cover and contain." />
            </div>
            <NativeSelect id="imageFit" v-model="state.imageFit">
              <NativeSelectOption value="cover">cover</NativeSelectOption>
              <NativeSelectOption value="contain">contain</NativeSelectOption>
            </NativeSelect>
          </div>

          <div class="playground-field">
            <div class="playground-toggle-row">
              <div class="playground-label-row">
                <Label for="useHeight">height</Label>
                <FieldHint text="When enabled, the gallery divides a fixed preview height evenly across the configured rows." />
              </div>
              <div class="flex items-center gap-2">
                <span class="playground-switch-label">{{ state.useHeight ? 'Custom' : 'null' }}</span>
                <Switch id="useHeight" v-model="state.useHeight" />
              </div>
            </div>
            <Input id="height" v-model="state.height" type="text" placeholder="24rem" :disabled="!state.useHeight" />
          </div>

          <div class="playground-field">
            <div class="playground-toggle-row">
              <div class="playground-label-row">
                <Label for="useWidth">width</Label>
                <FieldHint text="Controls the outer gallery width. Disable it to pass null." />
              </div>
              <div class="flex items-center gap-2">
                <span class="playground-switch-label">{{ state.useWidth ? 'Custom' : 'null' }}</span>
                <Switch id="useWidth" v-model="state.useWidth" />
              </div>
            </div>
            <Input id="width" v-model="state.width" type="text" placeholder="100%" :disabled="!state.useWidth" />
          </div>

          <div class="playground-field">
            <div class="playground-toggle-row">
              <div class="playground-label-row">
                <Label for="useImageRadius">imageRadius</Label>
                <FieldHint text="Overrides the gallery radius token with any CSS border-radius value." />
              </div>
              <div class="flex items-center gap-2">
                <span class="playground-switch-label">{{ state.useImageRadius ? 'Custom' : 'null' }}</span>
                <Switch id="useImageRadius" v-model="state.useImageRadius" />
              </div>
            </div>
            <Input id="imageRadius" v-model="state.imageRadius" type="text" placeholder="1.4rem" :disabled="!state.useImageRadius" />
          </div>

          <div class="playground-field">
            <div class="playground-label-row">
              <Label for="allowGridView">allowGridView</Label>
              <FieldHint text="Toggles the show-all preview affordance and the dialog grid switch." />
            </div>
            <div class="playground-switch-row">
              <Switch id="allowGridView" v-model="state.allowGridView" />
              <span class="playground-switch-label">Gridview {{ state.allowGridView ? 'Enabled' : 'Disabled' }}</span>
            </div>
          </div>
        </div>

    <div class="playground-preview">
      <ImageGallery v-bind="galleryProps" />
    </div>

    <div class="playground-code">
      <pre><code class="language-vue">{{ galleryCode }}</code></pre>
    </div>
  </section>
</template>
