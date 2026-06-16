/**
 * Side-effect module: install browser geometry globals BEFORE pdf-parse loads.
 *
 * Why: pdf-parse v2 bundles pdf.js, whose module-level code runs
 * `new DOMMatrix()` at import time. In Node there is no DOMMatrix, so pdf-parse
 * tries to polyfill it from @napi-rs/canvas's NATIVE binding. Our node_modules
 * was installed under WSL (linux binary) but the backend RUNS on Windows, where
 * that native binary is absent → the polyfill fails → pdf.js throws
 * `ReferenceError: DOMMatrix is not defined` and the whole process dies.
 *
 * Fix: @napi-rs/canvas ships a PURE-JS DOMMatrix in geometry.js (no native
 * binding). We load that directly and seat it on globalThis ourselves. Because
 * this runs before pdf-parse, pdf-parse sees the globals already present and
 * skips its own (failing) native polyfill — which also silences its warnings.
 *
 * Text extraction (getText) only needs DOMMatrix for text positioning; the
 * rendering-only globals (ImageData, Path2D) are stubbed just to keep pdf-parse
 * from warning — they are never exercised on the getText path.
 *
 * MUST be imported before 'pdf-parse'. Imports are evaluated in source order.
 */
import { DOMMatrix, DOMPoint, DOMRect } from '@napi-rs/canvas/geometry';

const g = globalThis as Record<string, unknown>;

if (!g.DOMMatrix) g.DOMMatrix = DOMMatrix;
if (!g.DOMPoint) g.DOMPoint = DOMPoint;
if (!g.DOMRect) g.DOMRect = DOMRect;

// Rendering-only stubs — never used by getText, present only to suppress
// pdf-parse's "Cannot polyfill" warnings on the unused canvas path.
if (!g.ImageData) g.ImageData = class ImageData {};
if (!g.Path2D) g.Path2D = class Path2D {};
