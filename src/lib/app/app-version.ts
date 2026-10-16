/**
 * The running app's version, read from `package.json` rather than typed into the panel.
 *
 * The About panel used to print a hard-coded `3.6.3` — Craft's own version — while this package
 * declares `0.1.0`. That is a lie about which build the reader is looking at, so the number now
 * comes from the one place that actually knows it.
 */
import pkg from '../../../package.json';

export const APP_VERSION = pkg.version;
