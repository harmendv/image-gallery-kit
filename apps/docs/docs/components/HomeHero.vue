<template>
  <section class="home-hero">
    <div class="home-hero-copy">
      <div class="home-hero-lockup">
        <img
          class="home-hero-mark"
          :src="withBase('/logo.svg')"
          alt=""
          width="48"
          height="48"
          aria-hidden="true"
        />
        <div class="home-hero-label">Image Gallery Kit</div>
      </div>
      <h1 class="home-hero-title">Simple image gallery layouts for Vue.</h1>
      <p class="home-hero-text">
        Build image galleries with one component, your own markup and classes for the layout, and SSR-safe
        rendering that works cleanly in real apps.
      </p>
      <div class="home-hero-actions">
        <a class="home-hero-action home-hero-action-brand" :href="withBase('/guide/getting-started')">
          Get Started
        </a>
        <a class="home-hero-action" :href="withBase('/examples')">Explore Examples</a>
      </div>

      <div class="home-hero-media home-hero-media-mobile vp-raw">
        <div class="home-hero-mobile-gallery-shell">
          <LayoutShowcase
            root-class="flex flex-col gap-3"
            main-class="h-48 rounded-2xl"
            grid-class="grid grid-cols-2 gap-3"
            tile-class="aspect-square rounded-xl"
            :count="5"
          />
        </div>
      </div>
    </div>

    <div class="home-hero-media home-hero-media-desktop vp-raw">
      <LayoutShowcase
        root-class="flex gap-3"
        main-class="w-[42%] shrink-0 rounded-2xl"
        grid-class="grid min-w-0 flex-1 grid-cols-2 gap-3"
        tile-class="aspect-square rounded-xl"
        :count="5"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { withBase } from 'vitepress';
import LayoutShowcase from './LayoutShowcase.vue';
</script>
