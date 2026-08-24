import { config } from '@vue/test-utils';

config.global.stubs = {
  transition: false,
  // The dialog is teleported to <body>, which puts it outside the wrapper and
  // beyond the reach of wrapper.find(). Stub it by default so specs can assert
  // on dialog markup inline; teleport.spec.ts opts out to test the real thing.
  teleport: true
};
