import { onBeforeUnmount, ref, watch } from 'vue';
import type { Ref } from 'vue';

/*
 * Everything the dialog does to the page around it: the focus trap and its
 * cache, the body scroll lock, and putting focus back where it came from on
 * close. None of it knows what the dialog shows -- only which element is its
 * root and which control should take focus first.
 */
export function useDialogFocus() {
  const dialogRef = ref<HTMLElement | null>(null);
  const closeButtonRef = ref<HTMLElement | null>(null);
  const lastFocusedElement = ref<HTMLElement | null>(null);
  const previousBodyOverflow = ref<string | null>(null);
  const previousBodyPaddingRight = ref<string | null>(null);
  const focusableCache = ref<{ root: HTMLElement; elements: HTMLElement[] } | null>(null);

  function invalidateFocusables() {
    focusableCache.value = null;
  }

  /*
   * Every grid tile is a button, so the focusable set is the size of the
   * collection. Recomputing it per keystroke means walking a few thousand nodes
   * on each Tab; the set only changes when the dialog opens, swaps mode, or the
   * collection itself changes, so cache it and invalidate on exactly those.
   */
  function getFocusableElements() {
    if (!dialogRef.value) {
      return [];
    }

    // Keyed on the element itself, not just invalidated on the events that should
    // change it: Vue rebuilds the dialog subtree on an images change, and a cache
    // that only tracked time would keep handing back detached nodes to focus.
    if (focusableCache.value?.root === dialogRef.value) {
      return focusableCache.value.elements;
    }

    /*
     * tabindex="-1" excludes an element from every clause, not just the last: a
     * grid tile parked out of the Tab order by the roving tabindex is still a
     * <button>, and a trap whose first-or-last endpoint the browser's own Tab can
     * never reach would let Tab walk straight past the wrap-around and out of the
     * dialog.
     */
    const elements = Array.from(
      dialogRef.value.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'
      )
    ).filter(
      (element) =>
        element.getAttribute('tabindex') !== '-1' &&
        !element.hasAttribute('disabled') &&
        element.getAttribute('aria-hidden') !== 'true' &&
        /*
         * Rendered, not merely present. A control a consumer's media query hides
         * cannot take focus, and a display:none button cannot either -- so a
         * trap that kept it in the cycle would try to focus nothing, leave the
         * browser to carry on past the dialog, and let Tab escape it entirely.
         * Client rects rather than offsetParent because a `position: fixed`
         * control -- which a consumer's toolbar slot may well be -- reports no
         * offsetParent while being perfectly visible and focusable.
         */
        element.getClientRects().length > 0
    );

    focusableCache.value = { root: dialogRef.value, elements };

    return elements;
  }

  function focusInitialElement() {
    const focusTarget = closeButtonRef.value ?? getFocusableElements()[0] ?? dialogRef.value;
    focusTarget?.focus();
  }

  function trapFocus(event: KeyboardEvent) {
    const focusableElements = getFocusableElements();

    if (!focusableElements.length) {
      event.preventDefault();
      dialogRef.value?.focus();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (!firstElement || !lastElement) {
      event.preventDefault();
      dialogRef.value?.focus();
      return;
    }

    const activeElement = document.activeElement as HTMLElement | null;

    if (event.shiftKey && activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  function lockBodyScroll() {
    if (typeof document === 'undefined' || previousBodyOverflow.value !== null) {
      return;
    }

    previousBodyOverflow.value = document.body.style.overflow;
    previousBodyPaddingRight.value = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';

    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
  }

  function unlockBodyScroll() {
    if (typeof document === 'undefined' || previousBodyOverflow.value === null) {
      return;
    }

    document.body.style.overflow = previousBodyOverflow.value;
    document.body.style.paddingRight = previousBodyPaddingRight.value ?? '';
    previousBodyOverflow.value = null;
    previousBodyPaddingRight.value = null;
  }

  /* The dialog just became visible: remember where focus was and freeze the page. */
  function onDialogOpen() {
    lastFocusedElement.value = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    lockBodyScroll();
  }

  /* And the reverse: thaw the page and put focus back. */
  function onDialogClose() {
    unlockBodyScroll();
    lastFocusedElement.value?.focus();
    lastFocusedElement.value = null;
  }

  function registerCloseButton(element: Ref<HTMLElement | null>) {
    closeButtonRef.value = element.value;

    // The element arrives as a ref because the button mounts after this runs,
    // and the trap reads it much later -- on open, not on registration.
    watch(element, (next) => {
      closeButtonRef.value = next;
    });
  }

  function registerRoot(element: Ref<HTMLElement | null>) {
    dialogRef.value = element.value;

    watch(element, (next) => {
      dialogRef.value = next;
      // The focusable set is cached against the root it was read from, so a
      // new root has to invalidate it rather than wait for a mode change.
      focusableCache.value = null;
    });
  }

  onBeforeUnmount(() => {
    unlockBodyScroll();
  });

  return {
    trapFocus,
    focusInitialElement,
    invalidateFocusables,
    onDialogOpen,
    onDialogClose,
    registerCloseButton,
    registerRoot
  };
}
