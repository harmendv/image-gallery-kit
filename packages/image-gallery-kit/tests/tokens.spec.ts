import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Resolved from the vitest root rather than import.meta.url: the spec is
// transformed for the jsdom environment, where the module URL is not a file URL.
const source = readFileSync(resolve(__dirname, '../src/style.css'), 'utf8');

// Comments out, so a rule that follows one is still recognisable as a rule start.
const css = source.replace(/\/\*[\s\S]*?\*\//g, '');

/*
 * Density, spacing and the bar's own chrome used to be tokens for want of an
 * element to put a class on. Each of the parts now is that element, so these are
 * plain declarations a consumer class beats -- and a token reintroduced here is
 * a knob nobody needs, so the list is worth pinning.
 */
const DELETED = [
  // Density and spacing: the grid element is reachable, so these are classes.
  '--ig-dialog-grid-columns',
  '--ig-dialog-grid-columns-md',
  '--ig-dialog-grid-columns-lg',
  '--ig-dialog-grid-columns-current',
  '--ig-dialog-grid-gap',
  // The bar's chrome, and a height that is measured rather than declared.
  '--ig-dialog-topbar-bg',
  '--ig-dialog-topbar-blur',
  '--ig-dialog-topbar-height',
  // Turn geometry, and radii that belong to now-reachable elements.
  '--ig-dialog-slide-gap',
  '--ig-dialog-radius',
  '--ig-dialog-grid-tile-radius',
  '--ig-object-fit',
  // Behaviour, decided by the pointer that started the gesture.
  '--ig-dialog-swipe',
  // The palette. The dialog paints in CSS system colours instead.
  '--ig-dialog-overlay',
  '--ig-dialog-surface',
  '--ig-dialog-panel',
  '--ig-dialog-border',
  '--ig-dialog-text',
  '--ig-dialog-muted',
  '--ig-dialog-button',
  '--ig-dialog-button-hover',
  '--ig-dialog-ring'
];

/* Returns the body of the first rule whose selector list contains `selector`. */
function ruleBodies(selector: string) {
  const bodies: string[] = [];
  const pattern = new RegExp(`(^|[,{}])\\s*${selector.replace('.', '\\.')}\\s*[,{]`, 'g');

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(css))) {
    const open = css.indexOf('{', match.index + match[0].length - 1);
    if (open === -1) continue;

    let depth = 1;
    let i = open + 1;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') depth += 1;
      else if (css[i] === '}') depth -= 1;
      i += 1;
    }
    bodies.push(css.slice(open + 1, i - 1));
  }

  return bodies;
}

describe('the token surface', () => {
  it.each(DELETED)('no longer declares or reads %s', (token) => {
    // Word-boundary aware: --ig-dialog-grid-columns must not match its own -md.
    const declared = new RegExp(`${token}\\s*:`).test(css);
    const read = new RegExp(`var\\(\\s*${token}\\s*[,)]`).test(css);

    expect({ token, declared, read }).toEqual({ token, declared: false, read: false });
  });

  /*
   * The bug this pins cost a 700-second test run. --ig-internal-topbar-height is measured
   * off the bar by ImageGalleryOverlay; if the bar then sizes itself from it,
   * every write re-triggers the observation that produced it and the loop has no
   * fixed point. Only the bar's two siblings may read it.
   */
  it('never lets the topbar size itself from its own measured height', () => {
    const bodies = ruleBodies('.image-gallery-topbar');

    expect(bodies.length).toBeGreaterThan(0);
    bodies.forEach((body) => {
      expect(body).not.toContain('--ig-internal-topbar-height');
    });
  });

  it('reads the measured height only where a sibling has to clear the bar', () => {
    const readers = ['.image-gallery-bento', '.image-gallery-stage-frame'];

    readers.forEach((selector) => {
      const consumes = ruleBodies(selector).some((body) => body.includes('--ig-internal-topbar-height'));
      expect({ selector, consumes }).toEqual({ selector, consumes: true });
    });
  });

  /*
   * The grid states its tracks rather than deriving them from a count token,
   * which is what makes a consumer's own `grid-cols-*` authoritative -- the
   * component reads the resolved tracks back out.
   */
  it('states the grid tracks in CSS', () => {
    const bodies = ruleBodies('.image-gallery-bento');

    expect(bodies.some((body) => /grid-template-columns:\s*repeat\(2,/.test(body))).toBe(true);
    expect(bodies.some((body) => /grid-template-columns:\s*repeat\(4,/.test(body))).toBe(true);
    expect(bodies.some((body) => /grid-template-columns:\s*repeat\(5,/.test(body))).toBe(true);
  });
});

/*
 * Two variables survive as internal plumbing rather than as public tokens:
 * values two places have to agree on exactly, where the alternative is the same
 * number written twice. Their `--ig-internal-` prefix marks them as private --
 * the test is here so "declared once, read where needed" stays true of them.
 */
describe('internal variables', () => {
  /*
   * The prefix is the contract: a consumer seeing `--ig-internal-` in devtools
   * knows not to set it. A variable added without the prefix reads as API.
   */
  it('prefixes every variable as internal', () => {
    const variables = css.match(/--ig-[a-z0-9-]+/g) ?? [];

    expect(variables.length).toBeGreaterThan(0);
    variables.forEach((variable) => {
      expect(variable).toMatch(/^--ig-internal-/);
    });
  });

  it.each([
    ['--ig-internal-slide-gap', '.image-gallery-stage-stack'],
    ['--ig-internal-topbar-height', null],
    ['--ig-internal-frame-ratio', null],
    ['--ig-internal-tile-ratio', null]
  ])('%s is declared in at most one CSS rule', (variable, owner) => {
    const declarations = css.match(new RegExp(`${variable}\\s*:`, 'g')) ?? [];

    expect(declarations.length).toBeLessThanOrEqual(1);

    if (owner) {
      const declaredHere = ruleBodies(owner).some((body) => body.includes(`${variable}:`));
      expect({ variable, declaredHere }).toEqual({ variable, declaredHere: true });
    }
  });

  /*
   * Three of the four are written by a component rather than declared in CSS --
   * the measured bar height, and each image's own ratio -- so every read site
   * has to carry the default for the case where no component has written yet.
   */
  it.each([
    ['--ig-internal-topbar-height', '4rem'],
    ['--ig-internal-frame-ratio', '4 / 5'],
    ['--ig-internal-tile-ratio', '4 / 5']
  ])('defaults %s at every read site', (variable, fallback) => {
    const reads = css.match(new RegExp(`var\\(${variable}[^)]*\\)`, 'g')) ?? [];

    expect(reads.length).toBeGreaterThan(0);
    reads.forEach((read) => {
      expect(read).toContain(fallback);
    });
  });

  /*
   * A ratio written inline would beat any class, which is the whole reason it is
   * a variable: `aspect-video` on a stage frame has to win, or `object-contain`
   * letterboxes inside a box that changes shape on every turn.
   */
  it('reads each image ratio where a class can still override it', () => {
    ['.image-gallery-stage-frame', '.image-gallery-bento-tile'].forEach((selector) => {
      const reads = ruleBodies(selector).some((body) => /aspect-ratio:\s*var\(--ig-/.test(body));
      expect({ selector, reads }).toEqual({ selector, reads: true });
    });
  });

  /*
   * The tile is the single owner of the shape: the frame fills it rather than
   * sizing itself, so one `aspect-*` class on the tile resizes the picture with
   * the box. A ratio reintroduced on the frame would leave the picture rattling
   * at the image's own ratio inside an overridden tile.
   */
  it('lets the tile own the shape -- the frame fills it', () => {
    const bodies = ruleBodies('.image-gallery-bento-frame');

    expect(bodies.length).toBeGreaterThan(0);
    bodies.forEach((body) => {
      expect(body).not.toContain('aspect-ratio');
    });
    expect(bodies.some((body) => body.includes('inset: 0'))).toBe(true);
  });
});

/*
 * The whole point of the palette deletion: the gallery brings no colours of its
 * own to a page, it borrows the platform's. System colours track light and dark
 * without a media query and collapse correctly under forced-colors.
 */
describe('the palette', () => {
  it('declares no --ig-dialog-* variable at all', () => {
    expect(css.match(/--ig-dialog-[a-z-]+\s*:/g)).toBeNull();
  });

  it('has no colour-scheme contract left to document', () => {
    ['ig-scheme-light', 'ig-scheme-dark', 'prefers-color-scheme', 'data-ig-color-scheme'].forEach((relic) => {
      expect({ relic, present: css.includes(relic) }).toEqual({ relic, present: false });
    });
  });

  it('paints the dialog in system colours', () => {
    ['Canvas', 'CanvasText', 'ButtonFace', 'ButtonText', 'AccentColor'].forEach((systemColour) => {
      expect({ systemColour, used: css.includes(systemColour) }).toEqual({
        systemColour,
        used: true
      });
    });
  });

  /*
   * The gallery root wraps the consumer's own preview markup, so a colour there
   * would repaint their page. The dialog's shell is where the dialog's colour
   * belongs -- it owns everything inside it.
   */
  it('puts no colour on the gallery root', () => {
    ruleBodies('.image-gallery-theme').forEach((body) => {
      expect(body).not.toMatch(/(^|[;{\s])color\s*:/);
      expect(body).not.toContain('background-color:');
    });
  });
});
