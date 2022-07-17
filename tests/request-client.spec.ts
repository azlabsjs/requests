import {
  Interceptor,
  HttpRequest,
  useClient,
  fetchBackendController,
} from '../src';
import { registerFetchGlobals } from './fetch';

registerFetchGlobals();

describe('Request client instance tests', () => {
  it('should creates an object having the request() method on it', () => {
    const client = useClient(fetchBackendController());
    expect(typeof client.request).toBe('function');
  });

  it('should creates an object having the registerInterceptors() method on it', () => {
    const client = useClient(fetchBackendController());
    expect(typeof client.registerInterceptors).toBe('function');
  });

  it('should test if registerInterceptors add interceptors to the request client', () => {
    const requestInterceptors: Interceptor<HttpRequest>[] = [
      (request, next) => {
        // Do something and return next
        return next(request);
      },
      (request, next) => {
        //
        request = request.clone({
          ...request.options,
          responseType: 'blob',
        });
        return next(request);
      },
    ];

    const client = useClient(fetchBackendController());
    client.registerInterceptors(...requestInterceptors);
    expect(client.getInterceptors().length).toBe(2);
    expect(
      (client.getInterceptors() as Interceptor<HttpRequest>[]).includes(
        requestInterceptors[0]
      )
    ).toBe(true);
  });
});
