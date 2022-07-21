import { Cloneable } from './clone';
import {
  HeadersType,
  HttpErrorResponse,
  HttpRequest,
  HttpResponse,
  RequestInterface,
} from './types';
import { validateHeaderName, validateHeaderValue } from './utils';

// @internal
export function parseRequestHeaders(headers: HeadersType) {
  const _headers: Record<string, any> = {};
  if (Array.isArray(headers)) {
    for (const [prop, value] of headers) {
      _headers[prop] = value;
    }
  } else if (typeof Headers !== 'undefined' && headers instanceof Headers) {
    headers.forEach((value, prop) => {
      _headers[prop] = value;
    });
  } else if (typeof headers === 'object') {
    for (const header in headers) {
      const value = (headers as any)[header];
      if (typeof value !== 'function') {
        _headers[header] = value;
      }
    }
  }
  return _headers;
}

/**
 * @description Query for content-type header in the list
 * of user provided headers
 */
export function getContentType(headers: HeadersType) {
  let contentType!: string;
  for (const header in headers) {
    if (header?.toLocaleLowerCase() === 'content-type') {
      contentType = (headers as any)[header] as string;
      break;
    }
  }
  return contentType;
}

/**
 * @description Creates a clonable request object that adds a clone method to object provided
 * by the as parameter allowing middleware to clone request
 * using ```js request = request.clone({}); ``` calls.
 */
export function Request(request: RequestInterface, xRequestWith?: string) {
  const requestOptions = request.options || {};
  // Default headers to use when client does not
  // provide a headers options
  const requestHeaders: Record<string, any> = xRequestWith
    ? {
        'x-requested-with': xRequestWith,
      }
    : {};
  const headers: Record<string, any> = requestOptions.headers ?? {};

  // We Transform all header property to lowercase
  for (const header in headers) {
    const value = headers[header];
    validateHeaderName(header);
    validateHeaderValue(header, value);
    const prop = header.toLocaleLowerCase();
    requestHeaders[prop] = value;
  }
  return Cloneable(Object, {
    ...request,
    options: { ...requestOptions, headers: requestHeaders },
  } as RequestInterface) as HttpRequest;
}

/**
 * @description Creates a response object containing request response
 */
export function CreateResponse(response: HttpResponse) {
  return Cloneable(Object, { ...response }) as HttpResponse & {
    clone(properties: Partial<HttpResponse>): HttpResponse;
  };
}

/**
 * @description Creates an http error response instance
 */
export function CreateErrorResponse(response: HttpErrorResponse) {
  return Cloneable(Object, { ...response }) as any as HttpErrorResponse;
}
