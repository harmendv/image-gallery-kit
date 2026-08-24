<script setup lang="ts">
import { computed, reactive, watch } from 'vue';
import { ImageGallery, type GalleryImage, type MainImagePosition } from 'image-gallery-kit';
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
  allowGridView: boolean;
  useHeight: boolean;
  height: string;
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
  allowGridView: true,
  useHeight: false,
  height: '24rem'
};

const state = reactive<PlaygroundState>({ ...defaults });

const visibleImages = computed<GalleryImage[]>(() => demoImages.slice(0, Math.max(0, Math.min(state.imageCount, demoImages.length))));
const maxMainImageIndex = computed(() => Math.max(0, visibleImages.value.length - 1));
const mainImageIndexOptions = computed(() => ['none', ...visibleImages.value.map((_, index) => `${index}`)]);
const imageCountOptions = computed(() => ['0', ...Array.from({ length: demoImages.length }, (_, index) => `${index + 1}`)]);
const gridSizeOptions = ['1', '2', '3', '4', '5', '6', '7', '8'];

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
  allowGridView: state.allowGridView,
  height: state.useHeight ? (state.height.trim() || '24rem') : null
}));

const galleryCode = computed(() => {
  const lines = ['<ImageGallery', `  :images="images.slice(0, ${visibleImages.value.length})"`];

  lines.push('');
  lines.push('  <!-- Layout -->');
  lines.push(`  :rows="${galleryProps.value.rows}"`);
  lines.push(`  :columns="${galleryProps.value.columns}"`);
  lines.push(`  image-aspect-ratio="${galleryProps.value.imageAspectRatio}"`);
  lines.push(`  gap="${galleryProps.value.gap}"`);

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
  lines.push(`  :allow-grid-view="${galleryProps.value.allowGridView}"`);

  if (galleryProps.value.height === null) {
    lines.push('  :height="null"');
  } else {
    lines.push(`  height="${galleryProps.value.height}"`);
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
  () => visibleImages.value.length,
  (count) => {
    if (!count) {
      state.hasMainImage = false;
      state.mainImageIndex = 0;
      return;
    }

    if (state.mainImageIndex > maxMainImageIndex.value) {
      state.mainImageIndex = maxMainImageIndex.value;
    }
  },
  { immediate: true }
);

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

    <div class="playground-panel">
      <div class="playground-grid">
        <div class="playground-field">
          <div class="playground-label-row">
            <Label for="imageCount">images</Label>
            <FieldHint text="Uses the shared fixture set and trims it to the selected number of active images. Pick 0 to see the empty state." />
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
            <FieldHint text="Maximum rows in the secondary preview grid. Together with columns this sets the grid capacity, which excludes the featured image." />
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
            <FieldHint text="Maximum columns in the secondary preview grid. The grid is sparse, so fewer images than slots simply render fewer tiles." />
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
          <div class="playground-label-row">
            <Label for="gap">gap</Label>
            <FieldHint text="Any CSS length used as the spacing between preview tiles." />
          </div>
          <Input id="gap" v-model="state.gap" type="text" placeholder="1rem" />
        </div>

        <div class="playground-field">
          <div class="playground-label-row">
            <Label for="mainImageIndex">mainImageIndex</Label>
            <FieldHint text="Choose a valid featured image or none to fall back to the plain preview grid." />
          </div>
          <NativeSelect id="mainImageIndex" :model-value="state.hasMainImage ? String(state.mainImageIndex) : 'none'" @update:model-value="updateMainImageSelection">
            <NativeSelectOption v-for="option in mainImageIndexOptions" :key="option" :value="option">
              {{ option }}
            </NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="playground-field">
          <div class="playground-label-row">
            <Label for="mainImagePosition">mainImagePosition</Label>
            <FieldHint text="Places the featured image on one side of the supporting grid." />
          </div>
          <NativeSelect id="mainImagePosition" v-model="state.mainImagePosition">
            <NativeSelectOption value="left">left</NativeSelectOption>
            <NativeSelectOption value="right">right</NativeSelectOption>
            <NativeSelectOption value="top">top</NativeSelectOption>
            <NativeSelectOption value="bottom">bottom</NativeSelectOption>
          </NativeSelect>
        </div>

        <div class="playground-field playground-field-wide">
          <div class="playground-label-row">
            <Label>mainImageSize</Label>
            <FieldHint text="Fraction mode is available for left and right layouts, or for top and bottom when an explicit height is enabled. Otherwise use a CSS size like 14rem." />
          </div>
          <div class="playground-split">
            <NativeSelect v-model="state.mainImageSizeMode">
              <NativeSelectOption
                v-for="option in mainImageSizeModeOptions"
                :key="option.value"
                :value="option.value"
              >
                {{ option.label }}
              </NativeSelectOption>
            </NativeSelect>
            <Input
              v-if="state.mainImageSizeMode === 'fraction'"
              v-model.number="state.mainImageSizeFraction"
              type="number"
              min="0.05"
              max="0.95"
              step="0.05"
              aria-label="mainImageSize value"
            />
            <Input
              v-else
              v-model="state.mainImageSizeCss"
              type="text"
              placeholder="18rem"
              aria-label="mainImageSize value"
            />
          </div>
        </div>

        <div class="playground-field">
          <div class="playground-label-row">
            <Label for="mainImageAspectRatio">mainImageAspectRatio</Label>
            <FieldHint text="Optional ratio for the featured image whenever height is intrinsic, in all four positions. When set, it takes precedence over numeric mainImageSize." />
          </div>
          <div class="playground-switch-input">
            <Switch id="useMainImageAspectRatio" v-model="state.useMainImageAspectRatio" />
            <Input
              v-model="state.mainImageAspectRatio"
              type="text"
              placeholder="null"
              :disabled="!state.useMainImageAspectRatio"
              aria-label="mainImageAspectRatio value"
            />
          </div>
        </div>

        <div class="playground-field">
          <div class="playground-label-row">
            <Label for="height">height</Label>
            <FieldHint text="When enabled, the gallery divides a fixed preview height evenly across the derived rows." />
          </div>
          <div class="playground-switch-input">
            <Switch id="useHeight" v-model="state.useHeight" />
            <Input id="height" v-model="state.height" type="text" placeholder="null" :disabled="!state.useHeight" />
          </div>
        </div>

        <div class="playground-field">
          <div class="playground-label-row">
            <Label for="allowGridView">allowGridView</Label>
            <FieldHint text="Toggles the show-all preview affordance and the dialog grid switch." />
          </div>
          <div class="playground-switch-row">
            <Switch id="allowGridView" v-model="state.allowGridView" />
            <span class="playground-switch-label">{{ state.allowGridView ? 'on' : 'off' }}</span>
          </div>
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
