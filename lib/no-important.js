'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var __chunk_1 = require('./chunk-a94081ad.js');
require('string-hash');
require('inline-style-prefixer/static/plugins/calc');
require('inline-style-prefixer/static/plugins/crossFade');
require('inline-style-prefixer/static/plugins/cursor');
require('inline-style-prefixer/static/plugins/filter');
require('inline-style-prefixer/static/plugins/flex');
require('inline-style-prefixer/static/plugins/flexboxIE');
require('inline-style-prefixer/static/plugins/flexboxOld');
require('inline-style-prefixer/static/plugins/gradient');
require('inline-style-prefixer/static/plugins/imageSet');
require('inline-style-prefixer/static/plugins/position');
require('inline-style-prefixer/static/plugins/sizing');
require('inline-style-prefixer/static/plugins/transition');
require('inline-style-prefixer/static/createPrefixer');
require('asap');

var useImportant = false; // Don't add !important to style definitions

var Aphrodite = __chunk_1.makeExports(useImportant);

var StyleSheet = Aphrodite.StyleSheet,
    StyleSheetServer = Aphrodite.StyleSheetServer,
    StyleSheetTestUtils = Aphrodite.StyleSheetTestUtils,
    css = Aphrodite.css,
    minify = Aphrodite.minify,
    flushToStyleTag = Aphrodite.flushToStyleTag,
    injectAndGetClassName = Aphrodite.injectAndGetClassName,
    defaultSelectorHandlers = Aphrodite.defaultSelectorHandlers;

exports.StyleSheet = StyleSheet;
exports.StyleSheetServer = StyleSheetServer;
exports.StyleSheetTestUtils = StyleSheetTestUtils;
exports.css = css;
exports.minify = minify;
exports.flushToStyleTag = flushToStyleTag;
exports.injectAndGetClassName = injectAndGetClassName;
exports.defaultSelectorHandlers = defaultSelectorHandlers;
