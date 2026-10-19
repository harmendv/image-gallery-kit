import { isBrowser } from '@/utils/environment';

/*
 * One lock for the whole page, however many galleries hold it. The body is
 * shared, so each dialog saving and restoring its styles on its own restores
 * them in whatever order the dialogs happen to close -- thawing the page under
 * a dialog that is still open, or leaving it frozen after the last one goes.
 * Instead the first holder saves the page's own styles, later holders only
 * count, and the last one out puts everything back.
 */
let holders = 0;
let saved: {
  htmlOverflow: string;
  htmlOverscrollBehavior: string;
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyPaddingRight: string;
  scrollX: number;
  scrollY: number;
} | null = null;

function freezePage() {
  const html = document.documentElement;
  const body = document.body;
  const scrollbarWidth = window.innerWidth - html.clientWidth;
  const scrollX = window.scrollX;
  const scrollY = window.scrollY;

  saved = {
    htmlOverflow: html.style.overflow,
    htmlOverscrollBehavior: html.style.overscrollBehavior,
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyPaddingRight: body.style.paddingRight,
    scrollX,
    scrollY
  };

  html.style.overflow = 'hidden';
  html.style.overscrollBehavior = 'none';
  body.style.overflow = 'hidden';

  /*
   * iOS Safari ignores overflow: hidden on the page for touch scrolling, so
   * the background keeps moving under the dialog. Pinning the body in place,
   * offset by how far the page was scrolled, is what actually holds it there;
   * the scroll position is handed back on release.
   */
  body.style.position = 'fixed';
  body.style.top = `${-scrollY}px`;
  body.style.left = `${-scrollX}px`;
  body.style.right = '0';

  // The scrollbar the page just lost would otherwise shift it sideways.
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function thawPage() {
  if (!saved) {
    return;
  }

  const html = document.documentElement;
  const body = document.body;

  html.style.overflow = saved.htmlOverflow;
  html.style.overscrollBehavior = saved.htmlOverscrollBehavior;
  body.style.overflow = saved.bodyOverflow;
  body.style.position = saved.bodyPosition;
  body.style.top = saved.bodyTop;
  body.style.left = saved.bodyLeft;
  body.style.right = saved.bodyRight;
  body.style.paddingRight = saved.bodyPaddingRight;

  /*
   * Unpinning the body drops the page back to the top, so jump back to where
   * it was -- instantly, even on a page that asks for smooth scrolling, or the
   * reader would watch the page scroll down from the top on every close.
   */
  const scrollBehavior = html.style.scrollBehavior;
  html.style.scrollBehavior = 'auto';
  window.scrollTo(saved.scrollX, saved.scrollY);
  html.style.scrollBehavior = scrollBehavior;

  saved = null;
}

/*
 * Takes a hold on the page scroll lock and returns its release. Releasing is
 * idempotent, so a holder that both closes and unmounts cannot let go of a
 * hold that another dialog still counts on.
 */
export function acquireScrollLock(): () => void {
  if (!isBrowser) {
    return () => {};
  }

  if (holders === 0) {
    freezePage();
  }

  holders += 1;
  let released = false;

  return () => {
    if (released) {
      return;
    }

    released = true;
    holders -= 1;

    if (holders === 0) {
      thawPage();
    }
  };
}
