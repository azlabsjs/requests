// @internal
// Provides fetch module along with required Headers, Request, Response
// Blob, Data, File, AbortController object globally
export function registerFetchGlobals() {
  const myGlobalThis =
    typeof globalThis !== 'undefined' && globalThis !== null
      ? globalThis
      : !(typeof window === 'undefined' || window === null)
      ? window
      : ({} as any);

  //
  if (!myGlobalThis.fetch) {
    myGlobalThis.fetch = new Object();
  }
}
