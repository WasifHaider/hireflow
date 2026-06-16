/**
 * Type shim for @napi-rs/canvas's pure-JS geometry subpath.
 *
 * The package ships types only for its root entry (index.d.ts), but importing
 * the root pulls in the native skia binding. We import the `/geometry` subpath
 * to stay binding-free; it has no shipped declarations, so we declare the
 * minimal surface we use here. We only re-seat these on globalThis, so loose
 * constructor types are enough.
 */
declare module '@napi-rs/canvas/geometry' {
  export const DOMMatrix: new (init?: unknown) => unknown;
  export const DOMPoint: new (init?: unknown) => unknown;
  export const DOMRect: new (init?: unknown) => unknown;
}
