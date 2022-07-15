import { HttpBackend, HttpRequest, HttpResponseType } from './types';
import { CreateErrorResponse, CreateResponse, getContentType } from './helpers';
import { useRequestBackendController } from './controller';

type ControllerAwareHttpBackend = {
  controller: AbortController;
} & HttpBackend;

function FetchError(message?: string) {
  throw new Error(message);
}

function createInstance(host?: string) {
  if (typeof fetch === 'undefined' || fetch === null) {
    FetchError(
      'fetch object is not present in the global environment, if running in a node environment, please import the polyfill from @azlabsjs/node-fetch-polyfill package or create your own polyfill'
    );
  }
  //#region Initialize backend instance properties
  const backend = new Object();
  const hostURL = host;
  //#endregion Initialize backend instance properties
  Object.defineProperty(backend, 'host', {
    value: () => hostURL,
  });
  return backend;
}

/**
 * Returns the response body based on user's specified response type
 *
 * @param responseType
 * @param response
 */
function getResponseBody(responseType: HttpResponseType, response: Response) {
  switch (responseType.toLocaleLowerCase()) {
    case 'json':
      return response.json();
    case 'array':
      return response.arrayBuffer();
    case 'blob':
      return response.blob();
    case 'text':
      return response.text();
    default:
      return new Promise<ReadableStream | null>((resolve) => {
        resolve(response.body);
      });
  }
}

function asFormData(body: Record<string, FormDataEntryValue> | FormData) {
  if (
    body instanceof FormData ||
    (body as any as FormData).constructor.prototype === FormData.prototype
  ) {
    return body as FormData;
  }
  const _body = new FormData();
  for (const prop in body) {
    if (!Object.prototype.hasOwnProperty.call(body, prop)) {
      continue;
    }
    let value = body[prop];
    const valueType = typeof value;
    if (valueType === 'undefined' || value === null) {
      continue;
    }
    if (valueType === 'string') {
      _body.append(prop, value);
    }
    if (value instanceof Blob) {
      value = new File(
        [value],
        Math.random().toString(16).substring(2, 15) +
          Math.random().toString(16).substring(2, 15)
      );
    }
    if (value instanceof File) {
      _body.append(prop, value, value.name);
    }
  }
  return _body;
}

// 'application/json;charset=UTF-8'
function getRequestBody(
  contentType: string,
  body: Record<string, FormDataEntryValue> | FormData | undefined
) {
  if (typeof body === 'undefined' || body === null) {
    return body;
  }
  if (typeof body === 'string') {
    return body;
  }
  if (
    body instanceof ReadableStream ||
    body instanceof Blob ||
    body instanceof ArrayBuffer ||
    body instanceof URLSearchParams
  ) {
    return body;
  }

  // For content type equals application/json we serialize the request body as JSON
  if (
    typeof contentType !== 'undefined' &&
    contentType !== null &&
    contentType.indexOf('application/json') !== -1
  ) {
    return JSON.stringify(body) as string;
  }

  // FormData request passes through
  if (
    typeof contentType !== 'undefined' &&
    contentType !== null &&
    contentType.indexOf('multipart/form-data') !== -1 &&
    !(body instanceof FormData)
  ) {
    return asFormData(body);
  }

  // If the request content type is not specified && Request is not instance of FormData, Blob, File, or ReadableStream
  return asFormData(body as Record<string, FormDataEntryValue>) as FormData;
}

/**
 * Sends the actual request using user provided backend
 * 
 * @param backend 
 * @param req 

*/
async function sendRequest(
  backend: ControllerAwareHttpBackend,
  req: HttpRequest
) {
  const { contentType, requestHeaders } = getContentType(
    req.options?.headers || {}
  );
  if (
    typeof contentType !== 'undefined' &&
    contentType !== null &&
    contentType.indexOf('multipart/form-data') !== -1
  ) {
    delete requestHeaders['content-type'];
  }
  const responseType = req.options?.responseType || 'json';
  const requestOptions = {
    method: req.method,
    headers: requestHeaders,
    body: getRequestBody(contentType, req.body),
    signal: backend.controller?.signal,
    credentials: req.options?.withCredentials === true ? 'include' : 'omit',
    keepalive: req.options?.keepalive || false,
    redirect: req.options?.redirect || 'follow',
    cache: requestHeaders['cache-control'] || 'no-cache',
  } as RequestInit;
  const response = await fetch(req.url, requestOptions);
  const { statusText, url, headers, ok } = response; // redirected
  const responseBody = await getResponseBody(responseType, response);
  let { status } = response;
  status = status === 0 ? (responseBody ? 200 : 0) : status;
  return { statusText, url, headers, ok, status, responseBody, responseType };
}

/**
 * Backend adapter that uses Fetch API for sending http requests
 *
 * @param host
 */
export function useFetchBackend(host?: string) {
  const backend = createInstance(host) as any as ControllerAwareHttpBackend;

  Object.defineProperty(backend, 'handle', {
    value: (req: HttpRequest) => {
      return new Promise((resolve, reject) => {
        sendRequest(backend, req)
          .then((state) => {
            const {
              statusText,
              url,
              headers,
              ok,
              status,
              responseBody,
              responseType,
            } = state;
            if (ok) {
              return resolve(
                CreateResponse({
                  response: responseBody,
                  responseType: responseType,
                  headers,
                  ok,
                  url: url || undefined,
                  status: status,
                  statusText: statusText || 'OK',
                })
              );
            } else {
              reject(
                CreateErrorResponse({
                  error: responseBody,
                  headers,
                  status: status || 0,
                  statusText: statusText || 'Unknown Error',
                  url: url || undefined,
                })
              );
            }
          })
          .catch((err) => {
            reject(
              CreateErrorResponse({
                error: err,
                status: 0,
                statusText: 'Unknown Error',
              })
            );
          });
      });
    },
  });

  Object.defineProperty(backend, 'abort', {
    value: () => {
      backend.controller?.abort();
    },
  });

  Object.defineProperty(backend, 'onDestroy', {
    value: () => {
      if (typeof backend.abort === 'function') {
        backend.abort();
      }
    },
  });

  // Set The about controller property of the backend instance
  backend.controller = new AbortController();

  // Returns the backend instance
  return backend;
}

//Creates a backend controller on top the fetch client
export function fetchBackendController(host?: string) {
  return useRequestBackendController(useFetchBackend(host));
}
