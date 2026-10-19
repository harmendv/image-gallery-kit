import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { mount } from '@vue/test-utils';
import { vi } from 'vitest';
import ImageGallery from '@/components/ImageGallery.vue';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

/*
 * gsap is an optional peer: simulate a consumer who has not installed it. A
 * mock only stands in for a missing module at test time -- a real consumer's
 * bundler has to resolve every specifier in dist, and fails the build on one it
 * cannot find -- so the gallery must not even attempt the import.
 */
const gsapImport = vi.hoisted(() => ({ attempted: false }));

vi.mock('gsap', () => {
  gsapImport.attempted = true;
  throw new Error('Cannot find module gsap');
});

const images: GalleryImage[] = [
  { src: '/one.jpg', alt: 'One', width: 800, height: 1200 },
  { src: '/two.jpg', alt: 'Two', width: 1200, height: 800 }
];

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe('without gsap installed', () => {
  it('still opens, navigates and closes the dialog without reaching for gsap', async () => {
    // jsdom reports zero-size rects, which would bail out of the flight before
    // it gets anywhere near gsap; real geometry takes it all the way.
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      return {
        x: 0,
        y: 0,
        width: 100,
        height: 100,
        top: 0,
        left: 0,
        right: 100,
        bottom: 100,
        toJSON: () => ({})
      } as DOMRect;
    };

    const wrapper = mount(ImageGallery, {
      props: { images },
      slots: { default: previewSlot(images) },
      attachTo: document.body
    });

    await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true);
    await new Promise((r) => setTimeout(r, 60));

    await wrapper.get('button[aria-label="Next image"]').trigger('click');
    expect(wrapper.get('[role="dialog"]').attributes('aria-label')).toContain('2 of 2');

    await wrapper.get('button[aria-label="Close dialog"]').trigger('click');
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    Element.prototype.getBoundingClientRect = origRect;

    expect(gsapImport.attempted).toBe(false);
    expect(document.querySelectorAll('[data-ig-flight="true"]')).toHaveLength(0);
    expect(document.querySelectorAll('body > [aria-hidden="true"]')).toHaveLength(0);
    wrapper.unmount();
  });

  it('ships no import of gsap for a consumer bundler to resolve', () => {
    const offenders = sourceFiles(resolve(import.meta.dirname, '../src')).filter((path) =>
      /(?:from\s*|import\s*\(\s*)['"]gsap['"]/.test(readFileSync(path, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });
});
