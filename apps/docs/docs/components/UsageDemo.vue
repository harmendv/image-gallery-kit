<script setup lang="ts">
import { ref } from 'vue';
import { demoImages } from './imageFixtures';
import GalleryShowcase from './GalleryShowcase.vue';

const previewCount = ref(4);
const aspectRatio = ref('1 / 1');
const previewHeight = ref('26rem');
const imageRadius = ref('1.4rem');

const previewCountOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9];
const aspectOptions = ['1 / 1', '4 / 5', '16 / 9', '3 / 4'];
</script>

<template>
  <div class="usage-demo">
    <div class="usage-controls">
      <label>
        <span>Preview count</span>
        <select v-model.number="previewCount">
          <option v-for="value in previewCountOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>

      <label>
        <span>Aspect ratio</span>
        <select v-model="aspectRatio">
          <option v-for="value in aspectOptions" :key="value" :value="value">{{ value }}</option>
        </select>
      </label>

      <label>
        <span>Height</span>
        <input v-model="previewHeight" type="text" />
      </label>

      <label>
        <span>Radius</span>
        <input v-model="imageRadius" type="text" />
      </label>
    </div>

    <GalleryShowcase
      :images="demoImages"
      :preview-count="previewCount"
      :preview-aspect-ratio="aspectRatio"
      :preview-height="previewHeight"
      :image-radius="imageRadius"
    />
  </div>
</template>

<style scoped>
.usage-demo {
  display: grid;
  gap: 1rem;
}

.usage-controls {
  display: grid;
  gap: 0.85rem;
}

.usage-controls label {
  display: grid;
  gap: 0.4rem;
}

.usage-controls span {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #4a7a61;
}

.usage-controls select,
.usage-controls input {
  height: 2.9rem;
  padding: 0 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(74, 122, 97, 0.14);
  background: rgba(255, 255, 255, 0.86);
}

@media (min-width: 860px) {
  .usage-demo {
    grid-template-columns: 260px minmax(0, 1fr);
    align-items: start;
  }
}

.dark .usage-controls select,
.dark .usage-controls input {
  background: rgba(17, 24, 21, 0.86);
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
