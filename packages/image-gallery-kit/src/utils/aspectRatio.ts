/*
 * One parser for every place a ratio arrives as text: the `imageAspectRatio`
 * prop ("4 / 5", "1.25") and a computed `aspect-ratio` read back off an element
 * ("1.5", "16 / 9"). Both are either `<width> / <height>` or a bare number, and
 * both need the same answer -- a positive finite number, or null when the value
 * cannot yield one so the caller picks its own fallback.
 */
export function parseAspectRatio(value: string | number): number | null {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  const [width, height] = value.split('/').map((part) => Number.parseFloat(part));

  if (!Number.isFinite(width)) {
    return null;
  }

  const ratio = height === undefined || Number.isNaN(height) ? width : width / height;

  return Number.isFinite(ratio) && ratio > 0 ? ratio : null;
}
