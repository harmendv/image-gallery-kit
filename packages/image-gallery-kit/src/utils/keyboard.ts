/*
 * Whether a key event started in a control that uses the arrow keys itself: a
 * text field moves its caret, a select or range input changes its value. The
 * first entry of the composed path is the real origin even inside a shadow
 * root, where `target` would already be retargeted to the host. The
 * contenteditable check walks up by attribute rather than trusting
 * `isContentEditable`, which not every DOM implementation provides.
 */
export function isEditableTarget(event: Event) {
  const origin = event.composedPath?.()[0] ?? event.target;

  if (!(origin instanceof Element)) {
    return false;
  }

  if (
    origin instanceof HTMLInputElement ||
    origin instanceof HTMLTextAreaElement ||
    origin instanceof HTMLSelectElement
  ) {
    return true;
  }

  if (origin instanceof HTMLElement && origin.isContentEditable) {
    return true;
  }

  const editable = origin.closest('[contenteditable]');

  return editable !== null && editable.getAttribute('contenteditable') !== 'false';
}

export function hasModifier(event: KeyboardEvent) {
  return event.altKey || event.ctrlKey || event.metaKey || event.shiftKey;
}
