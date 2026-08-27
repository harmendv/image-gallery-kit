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
    <div class="home-feature-title">
      <span class="home-feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="18" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/></svg>
      </span>
      Layout is CSS, not props
    </div>
    <p>You write the preview markup. Arrangement and breakpoints are your own classes.</p>
  </a>
  <a class="home-feature" :href="withBase('/api#anatomy')">
    <div class="home-feature-title">
      <span class="home-feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><path d="M17 14v6M14 17h6"/></svg>
      </span>
      The dialog comes apart
    </div>
    <p>Overlay, topbar, stage, grid, tiles — sixteen components you reorder in the <code>dialog</code> slot.</p>
  </a>
  <a class="home-feature" :href="withBase('/api#behavior-notes')">
    <div class="home-feature-title">
      <span class="home-feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8.5 12.5 2.5 2.5 4.5-5.5"/></svg>
      </span>
      Dialog that's actually finished
    </div>
    <p>Focus trap, scroll lock, keyboard nav, swipe on touch, and an all-images view.</p>
  </a>
  <a class="home-feature" :href="withBase('/guide/getting-started#animation')">
    <div class="home-feature-title">
      <span class="home-feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7.5 7.5"/><path d="M3 21l7.5-7.5"/></svg>
      </span>
      Tiles fly into the dialog
    </div>
    <p>The tile's frame and radius tween onto the dialog image. Add gsap to switch it on — without it every view still works.</p>
  </a>
  <a class="home-feature" :href="withBase('/theming')">
    <div class="home-feature-title">
      <span class="home-feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3s6 6.2 6 10.5a6 6 0 0 1-12 0C6 9.2 12 3 12 3z"/></svg>
      </span>
      Styled with classes, not tokens
    </div>
    <p>Every default is a class in <code>@layer components</code>, so a class of yours wins — with or without Tailwind.</p>
  </a>
  <a class="home-feature" :href="withBase('/guide/getting-started')">
    <div class="home-feature-title">
      <span class="home-feature-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="7" rx="1.5"/><rect x="3" y="13" width="18" height="7" rx="1.5"/><path d="M7 7.5h.01M7 16.5h.01"/></svg>
      </span>
      Renders on the server
    </div>
    <p>Zero runtime dependencies, no browser globals before mount, no hydration mismatch, no empty-grid flash.</p>
  </a>
</div>
