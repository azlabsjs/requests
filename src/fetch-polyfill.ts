// fetch-polyfill.js
import fetch, {
  Headers,
  Request,
  Response,
  Blob,
  FormData,
  File,
} from 'node-fetch';
import { AbortController } from 'abort-controller';

// @internal Provides an instance of javascript global context
export function registerFetchGlobals() {
  const g =
    typeof globalThis !== 'undefined' && globalThis !== null
      ? globalThis
      : !(typeof global === 'undefined' || global === null)
      ? global
      : !(typeof window === 'undefined' || window === null)
      ? window
      : ({} as any);

  //
  if (!g.fetch) {
    g.fetch = fetch;
    g.Headers = Headers;
    g.Request = Request;
    g.Response = Response;
  }

  if (!g.Blob) {
    g.Blob = Blob;
  }

  if (!g.File) {
    g.File = File;
  }

  if (!g.FormData) {
    g.FormData = FormData;
  }

  //
  if (
    typeof globalThis.AbortController === 'undefined' ||
    globalThis.AbortController === null
  ) {
    g.AbortController = AbortController;
  }

  //
  if (
    typeof globalThis.AbortSignal === 'undefined' ||
    globalThis.AbortSignal === null
  ) {
    g.AbortSignal = AbortSignal;
  }
}
