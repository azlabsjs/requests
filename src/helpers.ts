import { Cloneable } from './clone';
import {
  HeadersType,
  HttpErrorResponse,
  HttpRequest,
  HttpResponse,
  RequestInterface,
} from './types';
import { validateHeaderName, validateHeaderValue } from './utils';

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
  return {
    contentType,
    requestHeaders: headers as Record<string, any>,
  };
}

/**
 * @description Creates a clonable request object that adds a clone method to object provided
 * by the as parameter allowing middleware to clone request
 * using ```js request = request.clone({}); ``` calls.
 */
export function Request(request: RequestInterface) {
  const requestOptions = request.options || {};
  // Default headers to use when client does not
  // provide a headers options
  const requestHeaders: Record<string, any> = {
    'x-requested-with': 'fetch',
  };
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
