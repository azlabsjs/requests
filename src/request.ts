import { defaultInterceptor, usePipeline } from './interceptors';
import {
  Interceptor,
  HttpRequest,
  RequestInterface,
  HttpBackend,
  HttpBackendController,
  HttpResponse,
} from './types';
import { URIHelper } from './url';
import { arrayIncludes, isValidHttpUrl, getHttpHost } from './utils';
import { Request } from './helpers';

/**
 * @description Creates a client object for making request
 */
export function useClient(
  backend: HttpBackend | HttpBackendController<HttpRequest, HttpResponse>,
  interceptors: Interceptor<HttpRequest>[] = []
) {
  const client = new Object();
  Object.defineProperty(client, 'request', {
    value: (req?: RequestInterface | string) => {
      //#region : Added support for empty|empty request parameter to send GET request by default
      let request!: RequestInterface;
      if (typeof req === 'undefined' || req === null) {
        request = {
          url: '/',
          method: 'GET',
        };
      } else if (typeof req === 'string') {
        request = {
          url: req as string,
          method: 'GET',
        };
      } else {
        request = req as RequestInterface;
      }

      const requestHost = backend.host();
      // Validate the Host URL if isset before proceeding
      if (
        typeof requestHost !== 'undefined' &&
        requestHost !== null &&
        !isValidHttpUrl(requestHost)
      ) {
        return new Promise(() => {
          throw new TypeError('Invalid URL');
        });
      }
      let url = !isValidHttpUrl(request.url)
        ? `${getHttpHost(backend.host() ?? '')}/${request.url}`
        : request.url;

      // Validate the request URL before proceeding
      if (!isValidHttpUrl(url)) {
        return new Promise(() => {
          throw new TypeError('Invalid URL');
        });
      }
      //#region For GET request, we add search parameters to the request url
      const notIsPostRequest = !arrayIncludes(
        ['post', 'path', 'options'],
        request.method?.toLocaleLowerCase() ?? ''
      );
      url =
        notIsPostRequest && request.body
          ? URIHelper.buildSearchParams(url, request.body)
          : url;
      // Then set the request body to null|undefined
      if (notIsPostRequest) {
        request = { ...request, body: undefined };
      }
      //#region For GET request, we add search parameters to the request url
      //#endregion : Added support for empty|empty request parameter to send GET request by default
      let pipe =
        request.options?.interceptors || ([] as Interceptor<HttpRequest>[]);
      if (Array.isArray(interceptors) && interceptors.length > 0) {
        pipe = [...pipe, ...interceptors];
      }
      // Push an interceptor that apply url search parameters if the request is a get
      // request
      pipe.push(defaultInterceptor);
      const _request = Request({ ...request, url });
      // Call the request pipeline function and invoke the actual request client instance send method
      return usePipeline(...pipe)(_request, (message) =>
        backend.handle(message)
      );
    },
    writable: false,
  });
  return client as Record<string, unknown> & {
    request: (message?: RequestInterface | string) => Promise<HttpResponse>;
  };
}
