<template>
  <section class="home-hero">
    <div class="home-hero-copy">
      <p class="home-hero-kicker">image-gallery-kit</p>
      <div class="home-hero-label">Image Gallery Kit</div>
      <h1 class="home-hero-title">Animated gallery layouts for Vue that feel editorial instead of utilitarian.</h1>
      <p class="home-hero-text">
        image-gallery-kit is a package-first gallery with featured layouts, overflow handling, bento mode, and SSR-safe rendering.
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
            :main-image-index="4"
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
        :main-image-index="4"
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
