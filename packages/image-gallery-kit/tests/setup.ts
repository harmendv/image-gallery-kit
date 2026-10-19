import { config, enableAutoUnmount } from '@vue/test-utils';

config.global.stubs = {
  transition: false,
  // The dialog is teleported to <body>, which puts it outside the wrapper and
  // beyond the reach of wrapper.find(). Stub it by default so specs can assert
  // on dialog markup inline; teleport.spec.ts opts out to test the real thing.
  teleport: true
};

// jsdom has no layout, so it implements no scrolling either and logs an error
// on every call. The scroll lock hands the page its scroll position back with
// scrollTo on release; a no-op keeps that quiet, and specs that care spy on it.
window.scrollTo = () => {};

// The body scroll lock is shared by every gallery on the page, so a spec that
// leaves an open gallery mounted would hold it into every spec after it.
enableAutoUnmount(afterEach);
