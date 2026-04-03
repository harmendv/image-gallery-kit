<template>
  <section class="home-hero">
    <div class="home-hero-copy">
      <p class="home-hero-kicker">image-gallery-kit</p>
      <div class="home-hero-label">Image Gallery Kit</div>
      <h1 class="home-hero-title">Simple image gallery layouts for Vue.</h1>
      <p class="home-hero-text">
        Build image galleries with one component, a small set of layout props, and SSR-safe rendering that works cleanly in real apps.
      </p>
      <div class="home-hero-actions">
        <a class="home-hero-action home-hero-action-brand" href="/guide/getting-started">Get Started</a>
        <a class="home-hero-action" href="/examples">Explore Examples</a>
      </div>

      <div class="home-hero-media home-hero-media-mobile vp-raw">
        <div class="home-hero-mobile-gallery-shell">
          <GalleryShowcase
            :rows="2"
            :columns="2"
            :main-image-index="3"
            main-image-position="top"
            main-image-size="12rem"
          />
        </div>
      </div>
    </div>

    <div class="home-hero-media home-hero-media-desktop vp-raw">
      <GalleryShowcase
        :rows="2"
        :columns="2"
        :main-image-index="3"
        main-image-position="left"
        :main-image-size="0.42"
        height="28rem"
        item-aspect-ratio="1"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import GalleryShowcase from './GalleryShowcase.vue';
</script>
