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
  <a class="home-feature" :href="withBase('/layout')">
    <div class="home-feature-title">Layout is CSS, not props</div>
    <p>You write the preview markup. Arrangement and breakpoints are your own classes.</p>
  </a>
  <a class="home-feature" :href="withBase('/api#behavior-notes')">
    <div class="home-feature-title">Dialog that's actually finished</div>
    <p>Focus trap, scroll lock, keyboard nav, and an all-images view.</p>
  </a>
  <a class="home-feature" :href="withBase('/theming')">
    <div class="home-feature-title">Tokens where classes can't reach</div>
    <p>The dialog is teleported out of your markup, so variables theme it. Your preview stays classes.</p>
  </a>
  <a class="home-feature" :href="withBase('/guide/getting-started#animation')">
    <div class="home-feature-title">Tiles fly into the dialog</div>
    <p>The tile's frame and radius tween onto the dialog image. Add gsap to switch it on.</p>
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
