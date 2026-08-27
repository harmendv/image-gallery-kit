import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { mount } from '@vue/test-utils';
import ImageGallery from '@/components/ImageGallery.vue';
import { previewSlot } from './helpers';
import type { GalleryImage } from '@/types';

/*
 * The stage caps a frame's height to clear the bar. `width` is definite there,
 * so the browser derives the height from `aspect-ratio`, clamps it against the
 * cap, and never narrows the width to match -- which means a frame taller than
 * the cap silently renders at the cap's own shape instead of its own, and
 * `object-contain` letterboxes the picture by however far the two differ. It
 * fails quietly and only for tall images, so it is worth pinning.
 *
 * The frame therefore measures the ratio that actually applies and publishes it
 * for the stylesheet to cap the width with. Measured, not derived from `image`,
 * because a consumer's `aspect-video` has to win -- so both paths are asserted.
 */
const portrait: GalleryImage = { src: '/tall.jpg', alt: 'Tall', width: 1800, height: 2552 };
const landscape: GalleryImage = { src: '/wide.jpg', alt: 'Wide', width: 1400, height: 933 };
const images = [portrait, landscape];

function withComputedAspect(value: string, run: () => Promise<void> | void) {
  const original = window.getComputedStyle.bind(window);

  // jsdom resolves no layout, so the used aspect-ratio has to be stood in for.
  Object.defineProperty(window, 'getComputedStyle', {
    configurable: true,
    writable: true,
    value: (element: Element, pseudo?: string) => {
      const style = original(element, pseudo as string | undefined);

      if (element instanceof HTMLElement && element.classList.contains('image-gallery-stage-frame')) {
        return new Proxy(style, {
          get(target, key) {
            if (key === 'aspectRatio') return value;
            const resolved = Reflect.get(target, key);
            return typeof resolved === 'function' ? resolved.bind(target) : resolved;
          }
        });
      }

      return style;
    }
  });

  return Promise.resolve(run()).finally(() => {
    Object.defineProperty(window, 'getComputedStyle', {
      configurable: true,
      writable: true,
      value: original
    });
  });
}

async function openFrame() {
  const wrapper = mount(ImageGallery, {
    props: { images },
    slots: { default: previewSlot(images) },
    attachTo: document.body
  });

  await wrapper.get('button[aria-label="Open image 1"]').trigger('click');
  await new Promise((resolve) => setTimeout(resolve, 60));

  return {
    wrapper,
    frame: document.querySelector<HTMLElement>('.image-gallery-stage-frame')
  };
}

describe('the stage frame keeps its shape under the height cap', () => {
  it('caps the width from the image ratio when nothing is pinned', async () => {
    await withComputedAspect('1800 / 2552', async () => {
      const { wrapper, frame } = await openFrame();

      expect(frame).not.toBeNull();
      expect(frame!.style.getPropertyValue('--ig-internal-frame-fit-width')).toBe(
        `calc(var(--ig-internal-stage-cap) * ${1800 / 2552})`
      );

      wrapper.unmount();
    });
  });

  /*
   * The consumer's class is what decides the shape, so the width cap has to
   * follow that value rather than the image's -- otherwise a cinema stage gets
   * a frame capped for a portrait and collapses to a sliver of its width.
   */
  it('follows a pinned ratio rather than the image it is showing', async () => {
    await withComputedAspect('16 / 9', async () => {
      const { wrapper, frame } = await openFrame();

      expect(frame!.style.getPropertyValue('--ig-internal-frame-fit-width')).toBe(
        `calc(var(--ig-internal-stage-cap) * ${16 / 9})`
      );

      wrapper.unmount();
    });
  });

  it('publishes nothing when no ratio applies, leaving the CSS fallback', async () => {
    await withComputedAspect('auto', async () => {
      const { wrapper, frame } = await openFrame();

      expect(frame!.style.getPropertyValue('--ig-internal-frame-fit-width')).toBe('');

      wrapper.unmount();
    });
  });
});

/*
 * Which of the three boxes gets the width cap is not a detail. Capping a
 * neighbour too shortens the turn: it is stepped by 100% of its own width, so a
 * narrowed slide lands the next image short of centre. And capping the frame
 * without centring it leaves a narrow picture jammed against the stack's left
 * edge, because a block box that no longer fills its parent does not centre
 * itself. Both were live bugs; both are one declaration away from returning.
 */
describe('which box the width cap applies to', () => {
  const css = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  /* The body of the first rule whose selector list is exactly `selector`. */
  function soleRule(selector: string) {
    const pattern = new RegExp(`(^|[;{}])\\s*${selector.replace(/\./g, '\\.')}\\s*\\{`, 'm');
    const match = pattern.exec(css);
    if (!match) return '';
    const open = css.indexOf('{', match.index + match[0].length - 1);
    return css.slice(open + 1, css.indexOf('}', open));
  }

  it('caps and centres the active frame', () => {
    const body = soleRule('.image-gallery-stage-frame');
    expect(body).toContain('max-width: var(--ig-internal-frame-fit-width');
    expect(body).toContain('margin-inline: auto');
  });

  it('never caps a neighbour slide, which would shorten the turn', () => {
    const capped = /\.image-gallery-stage-slide[^{]*\{[^}]*max-width/.test(css);
    expect(capped).toBe(false);
  });
});
