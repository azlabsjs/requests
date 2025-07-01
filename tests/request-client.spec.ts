import {
  Interceptor,
  HTTPRequest,
  useClient,
  fetchBackendController,
} from '../src';

/** @internal */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type UnknownType = any;

// @internal
// Provides fetch module along with required Headers, Request, Response
// Blob, Data, File, AbortController object globally
export function registerFetchGlobals() {
  const myGlobalThis =
    typeof globalThis !== 'undefined' && globalThis !== null
      ? globalThis
      : !(typeof window === 'undefined' || window === null)
        ? window
        : ({} as UnknownType);

  //
  if (!myGlobalThis.fetch) {
    myGlobalThis.fetch = new Object();
  }
}


registerFetchGlobals();

describe('Request client instance tests', () => {
  it('should creates an object having the request() method on it', () => {
    const client = useClient(fetchBackendController());
    expect(typeof client.request).toBe('function');
  });

  it('should creates an object having the withInterceptors() method on it', () => {
    const client = useClient(fetchBackendController());
    expect(typeof client.withInterceptors).toBe('function');
  });

  it('should test if withInterceptors add interceptors to the request client', () => {
    const requestInterceptors: Interceptor<HTTPRequest>[] = [
      (request, next) => {
        // Do something and return next
        return next(request);
      },
      (request, next) => {
        //
        request = request.clone({
          ...request.options,
          setResponseType: 'blob'
        });
        return next(request);
      },
    ];

    const client = useClient(fetchBackendController());
    client.withInterceptors(...requestInterceptors);
    expect(client.getInterceptors().length).toBe(2);
    expect(
      (client.getInterceptors() as Interceptor<HTTPRequest>[]).includes(
        requestInterceptors[0]
      )
    ).toBe(true);
  });
});
