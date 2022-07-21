import { defaultInterceptor, usePipeline } from './interceptors';
import {
  Interceptor,
  HttpRequest,
  RequestInterface,
  HttpResponse,
  RequestClient,
  RequestHandler,
} from './types';
import { URIHelper } from './url';
import { arrayIncludes, isValidHttpUrl, getHttpHost } from './utils';
import { Request } from './helpers';
import { fetchBackendController } from './fetch';
import { xhrBackendController } from './xhr';

// @internal
type HttpRequestHandler = RequestHandler<HttpRequest, HttpResponse>;

/**
 * @description Creates a client object for making request
 */
export function useRequestClient(
  backend?: HttpRequestHandler,
  interceptors: Interceptor<HttpRequest>[] = []
) {
  const client: Record<string, any> & {
    interceptors?: Interceptor<HttpRequest>[];
  } = new Object();

  // Defines a non-enumerable interceptors property
  Object.defineProperty(client, 'interceptors', {
    value: [],
    writable: true,
    configurable: true,
    enumerable: false,
  });

  // Utility method that returns the list of interceptors of the request client
  Object.defineProperty(client, 'getInterceptors', {
    value: () => {
      return client.interceptors ?? [];
    },
  });

  // RegisterInterceptors set the request interceptors list
  Object.defineProperty(client, 'registerInterceptors', {
    value: (...interceptors: Interceptor<HttpRequest>[]) => {
      client.interceptors = (client.interceptors ?? []).concat(...interceptors);
      return client;
    },
    writable: false,
  });

  // Request method to send the actual request to the server
  Object.defineProperty(client, 'request', {
    value: (req?: RequestInterface | string) => {
      let _backend!: HttpRequestHandler;
      //#region Create backend controller if not provided by instance users
      if (typeof backend === 'undefined' || backend === null) {
        _backend =
          typeof window === 'undefined' || typeof XMLHttpRequest === 'undefined'
            ? fetchBackendController()
            : xhrBackendController();
      } else {
        _backend = backend;
      }
      //#endregion Create backend controller if not provided by instance users
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
      const requestHost = _backend.host();
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
        ? `${getHttpHost(_backend.host() ?? '')}/${request.url}`
        : request.url;

      // Validate the request URL before proceeding
      if (!isValidHttpUrl(url)) {
        return new Promise(() => {
          throw new TypeError('Invalid URL', {
            cause: url,
          });
        });
      }
      //#region For GET request, we add search parameters to the request url
      const notIsPostRequest = !arrayIncludes(
        ['post', 'patch', 'put', 'options'],
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
      let pipe = request.options?.interceptors || [];
      if (
        Array.isArray(client.interceptors) &&
        client.interceptors.length > 0
      ) {
        pipe = pipe.concat(...client.interceptors);
      }
      const _request = Request({ ...request, url });
      // Call the request pipeline function and invoke the actual request client instance send method
      // Push an interceptor that apply url search parameters if the request is a get
      // request
      return usePipeline(...pipe.concat(defaultInterceptor))(
        _request,
        (message) => _backend.handle(message)
      );
    },
    writable: false,
  });

  // Set interceptors list passed as argument to the useClient()
  // function on the request client
  client.interceptors = interceptors ?? [];

  // Returns the constructed request client
  return client as RequestClient<HttpRequest, HttpResponse> & {
    getInterceptors: () => Interceptor<HttpRequest>[];
  };
}
