import { afterEach, vi } from 'vitest';

const tweens: { targets: unknown; vars: Record<string, any> }[] = [];

// The real gsap needs rAF to tick, which jsdom never does on its own. Capturing
// the tween vars instead keeps the assertion on the thing that actually changed:
// the stagger handed to gsap, which is what sets the length of the cascade.
vi.mock('gsap', () => ({
  gsap: {
    to: (targets: unknown, vars: Record<string, any>) => {
      tweens.push({ targets, vars });
      vars.onComplete?.();
      return {};
    }
  }
}));

const { useSharedImageTransition } = await import('@/composables/useSharedImageTransition');

function buildGrid(count: number) {
  const container = document.createElement('div');

  for (let index = 0; index < count; index += 1) {
    const tile = document.createElement('button');
    tile.setAttribute('data-bento-item', 'true');
    tile.dataset.bentoIndex = `${index}`;
    tile.setAttribute('data-bento-active', 'false');
    container.appendChild(tile);
  }

  document.body.appendChild(container);
  return container;
}

// Every tile reports as on-screen, so the cap is the only thing bounding the
// cascade -- the viewport filter cannot quietly do the work instead.
function stubAllOnScreen() {
  const original = Element.prototype.getBoundingClientRect;

  Element.prototype.getBoundingClientRect = function () {
    return {
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      top: 10,
      left: 10,
      right: 110,
      bottom: 110,
      toJSON: () => ({})
    } as DOMRect;
  };

  return () => {
    Element.prototype.getBoundingClientRect = original;
  };
}

afterEach(() => {
  tweens.length = 0;
  document.body.innerHTML = '';
});

describe('bento entrance stagger', () => {
  it('keeps the per-item cascade for a small collection', async () => {
    const restore = stubAllOnScreen();
    const container = buildGrid(6);
    const { animateBentoEntrance } = useSharedImageTransition();

    await animateBentoEntrance(() => container);
    restore();

    expect(tweens).toHaveLength(1);
    expect(tweens[0].vars.stagger).toBeCloseTo(0.04, 5);
  });

  it('caps the total cascade so a large collection cannot stall the open', async () => {
    const restore = stubAllOnScreen();
    const container = buildGrid(1000);
    const { animateBentoEntrance } = useSharedImageTransition();

    await animateBentoEntrance(() => container);
    restore();

    const { stagger, duration } = tweens[0].vars;
    const total = stagger * 999;

    // Uncapped this was 0.04 * 999 ~= 40s, and the caller awaits it before it
    // clears the hidden state on the tiles.
    expect(total).toBeCloseTo(0.4, 5);
    expect(duration + total).toBeLessThan(1);
  });

  it('animates only the tiles on screen', async () => {
    const original = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (this: HTMLElement) {
      const onScreen = Number(this.dataset?.bentoIndex ?? -1) < 8;
      const top = onScreen ? 10 : 50_000;
      return {
        x: 0,
        y: top,
        width: 100,
        height: 100,
        top,
        left: 10,
        right: 110,
        bottom: top + 100,
        toJSON: () => ({})
      } as DOMRect;
    };

    const container = buildGrid(1000);
    const { animateBentoEntrance } = useSharedImageTransition();

    await animateBentoEntrance(() => container);
    Element.prototype.getBoundingClientRect = original;

    expect((tweens[0].targets as HTMLElement[]).length).toBe(8);
  });
});
