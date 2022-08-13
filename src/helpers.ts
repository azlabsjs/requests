import { Cloneable } from './clone';
import {
  HeadersType,
  HTTPErrorResponse,
  HTTPRequest,
  HTTPResponse,
  HTTPResponseType,
  RequestInterface,
  RequestParamType,
  ResponseInterface,
  SetResponseBodyType,
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
  return Cloneable<HTTPRequest>(
    Object as any,
    {
      ...request,
      options: { ...requestOptions, headers: requestHeaders },
    } as RequestInterface,
    {
      setHeaders: (_request, headers: HeadersType) => {
        return _request.clone({
          ..._request,
          options: {
            ..._request.options,
            headers,
          },
        });
      },
      setResponseType: (_request, responseType: HTTPResponseType) => {
        return _request.clone({
          ..._request,
          options: {
            ..._request.options,
            responseType,
          },
        });
      },
      setParams: (_request, params: RequestParamType) => {
        return _request.clone({
          ..._request,
          options: {
            ..._request.options,
            params,
          },
        });
      },
    }
  );
}

/**
 * @description Creates a response object containing request response
 * 
 * **Note**
 * Response object provides interface for cloning itself. Use the `clone()`
 * method for cloning response in interceptor instead of directyl modifying the
 * response
 * 
 * ```js
    const client = useRequestClient(...);
  
    let response = await client.request({...});

    // Modifying the response
    response = response.clone({
      setBody: (body: any) => {
        return {
          data: body
        };
      },
      status: 201,
    });
 * ```
 * 
 */
export function CreateResponse(response: ResponseInterface) {
  return Cloneable<HTTPResponse<HeadersType>>(
    Object as any,
    { ...response },
    {
      setBody: (_response, value: SetResponseBodyType) => {
        return _response.clone({
          body: typeof value === 'function' ? value(_response.body) : value,
        });
      },
    }
  );
}

/**
 * @description Creates an http error response instance
 */
export function CreateErrorResponse(
  response: Omit<HTTPErrorResponse, 'clone'>
) {
  return Cloneable<HTTPErrorResponse>(Object as any, { ...response });
}
