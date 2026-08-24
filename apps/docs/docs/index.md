---
sidebar: false
aside: false
footer: false
pageClass: overview-page
---

<script setup>
// Raw HTML links in markdown are passed through untouched — only markdown-syntax
// links get the site base prepended — so these go through `withBase()`.
import { withBase } from 'vitepress'
</script>

<HomeHero />

<div class="home-feature-grid">
  <a class="home-feature" :href="withBase('/api#grid-layout')">
    <div class="home-feature-title">One component, every layout</div>
    <p>Featured, grid, or bento — same images, different props.</p>
  </a>
  <a class="home-feature" :href="withBase('/api#behavior-notes')">
    <div class="home-feature-title">Dialog that's actually finished</div>
    <p>Focus trap, scroll lock, keyboard nav, and an all-images view.</p>
  </a>
  <a class="home-feature" :href="withBase('/theming')">
    <div class="home-feature-title">Themed with tokens</div>
    <p>Every surface reads a CSS variable. Reskin it without touching a class.</p>
  </a>
  <a class="home-feature" :href="withBase('/examples')">
    <div class="home-feature-title">Tiles fly into the dialog</div>
    <p>The tile animates into place instead of cross-fading a copy.</p>
  </a>
  <a class="home-feature" :href="withBase('/guide/getting-started')">
    <div class="home-feature-title">Renders on the server</div>
    <p>SSR-safe markup, no hydration mismatch, no empty-grid flash.</p>
  </a>
  <a class="home-feature" :href="withBase('/api#labels')">
    <div class="home-feature-title">Every string is yours</div>
    <p>Labels and aria-labels come from one object. No i18n dependency.</p>
  </a>
</div>
