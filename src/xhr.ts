import { useRequestBackendController } from './controller';
import { FormDataRequestEncoder, RawEncoder } from './encoders';
import {
  CreateErrorResponse,
  CreateResponse,
  getContentType,
  parseRequestHeaders,
} from './helpers';
import {
  HTTPBackend,
  RequestProgressEvent,
  HTTPRequest,
  HTTPResponse,
  HTTPErrorResponse,
  UnknownType,
} from './types';
import { toBinary } from './utils';

// get all request headers as dictionary data structure
function getResponseHeaders(headers: string) {
  const result: Record<string, UnknownType> = new Object();
  for (const header of headers.split('\r\n')) {
    const [name, value] = header.split(': ');
    if (
      name !== '' &&
      typeof name !== 'undefined' &&
      value !== null &&
      typeof value !== 'undefined'
    ) {
      result[name] = value;
    }
  }
  return result;
}

/**
 * Determine an appropriate URL for the response, by checking either
 * XMLHttpRequest.responseURL or the X-Request-URL header.
 */
function getResponseUrl(xhr: UnknownType) {
  if ('responseURL' in xhr && xhr.responseURL) {
    return xhr.responseURL;
  }
  if (/^X-Request-URL:/m.test(xhr.getAllResponseHeaders())) {
    return xhr.getResponseHeader('X-Request-URL');
  }
  return undefined;
}
// Reads & parse the Http response body
// @internal
function getResponseBody(responseType: string, body: UnknownType, ok: boolean) {
  if (responseType === 'json' && typeof body === 'string') {
    // Save the original body, before attempting XSSI prefix stripping.
    const originalBody = body;
    body = body.replace(/^\)\]\}',?\n/, '');
    try {
      // Attempt the parse. If it fails, a parse error should be delivered to the user.
      body = body !== '' ? JSON.parse(body) : null;
    } catch (error) {
      // Since the JSON.parse failed, it's reasonable to assume this might not have been a
      // JSON response. Restore the original body (including any XSSI prefix) to deliver
      // a better error response.
      body = originalBody;

      // If this was an error request to begin with, leave it as a string, it probably
      // just isn't JSON. Otherwise, deliver the parsing error to the user.
      if (ok) {
        // Even though the response status was 2xx, this is still an error.
        ok = false;
        // The parse error contains the text of the body that failed to parse.
        body = { error, text: body };
      }
    }
  }
  return [body, ok];
}

// @internal
// The function allow client to send object as multipart-request
// if any of the entry of the object is an instance of Blob or File
function isMultipartRequestBody(body: UnknownType) {
  if (body instanceof FormData) {
    return true;
  }
  if (typeof body === 'object' && body !== null) {
    for (const prop in body) {
      if (body[prop] instanceof Blob || body[prop] instanceof File) {
        return true;
      }
    }
  }
  return false;
}

// @internal
// Send the request using the provided client object
async function sendRequest(instance: XMLHttpRequest, request: HTTPRequest) {
  const requestHeaders = parseRequestHeaders(request.options?.headers || {});
  let contentType = getContentType(requestHeaders);
  for (const header in requestHeaders) {
    // Here we escape the content-type header when setting request headers
    // as the content type header is set when sending the request
    const value = requestHeaders[header];
    if (
      header?.toLocaleLowerCase() === 'content-type' ||
      typeof value === 'function'
    ) {
      continue;
    }
    instance.setRequestHeader(header, value);
  }
  let body = request.body;
  if (typeof body === 'undefined' || body === null) {
    // Set the request header and send the request
    instance.setRequestHeader('content-type', contentType);
    return instance.send();
  }

  if (
    typeof contentType !== 'undefined' &&
    contentType !== null &&
    contentType.indexOf('application/json') !== -1
  ) {
    instance.setRequestHeader('content-type', 'application/json;charset=UTF-8');
    return instance.send(JSON.stringify(body));
  }

  // Request having their body as instance of File or Blob
  // class are transformed into a javascript object to the next
  // too treat them as mlutipart body
  if (body instanceof Blob || body instanceof File) {
    body = {
      ['content']:
        body instanceof Blob
          ? new File(
              [body],
              Math.random().toString(16).substring(2, 15) +
                Math.random().toString(16).substring(2, 15),
              {
                type: body.type,
                lastModified: new Date().getTime(),
              }
            )
          : body,
    };
  }

  // Makes sure to detect a multipart form data request body if the body is
  // a Javascript object with any given value being an instance of Blob or File
  contentType =
    (contentType ?? isMultipartRequestBody(body))
      ? 'multipart/form-data'
      : 'application/x-www-form-urlencoded';

  if (
    typeof contentType !== 'undefined' &&
    contentType !== null &&
    contentType.indexOf('multipart/form-data') !== -1
  ) {
    const encoder = new FormDataRequestEncoder();
    const contentTypeHeader =
      'multipart/form-data; boundary=' + encoder.getBoundary();
    instance.setRequestHeader('content-type', contentTypeHeader);
    return instance.send(toBinary(await encoder.encode(body)));
  }

  instance.setRequestHeader('content-type', contentType);
  return instance.send(new RawEncoder(contentType).encode(body) as string);
}

// Get partial properties of the {@see XMLHttpRequest} object
// @internal
function partialXhr(instance: XMLHttpRequest) {
  const status = instance.status;
  const statusText = instance.statusText;
  const url = getResponseUrl(instance);
  const headers = getResponseHeaders(instance.getAllResponseHeaders());
  return { status, statusText, url, headers };
}

/**
 * Creates an XML Http Request object from the Request object
 * @internal
 */
function initXMLHttpRequest(xhr: XMLHttpRequest, request: HTTPRequest) {
  // TODO: open the request
  xhr.open(request.method, request.url, true);

  if (request.options?.responseType) {
    xhr.responseType = request.options.responseType;
  }

  if (request.options?.withCredentials) {
    xhr.withCredentials = !!request.options?.withCredentials;
  }
  if (request.options?.timeout) {
    xhr.timeout = request.options.timeout;
  }

  if (request.options?.onTimeout) {
    xhr.addEventListener('timeout', request.options?.onTimeout);
  }

  if (request.options?.onProgress) {
    const progress = xhr.upload ? xhr.upload : xhr;
    progress.addEventListener(
      'progress',
      function (
        this: XMLHttpRequestUpload,
        event: ProgressEvent<XMLHttpRequestEventTarget>
      ) {
        if (event.lengthComputable && request.options?.onProgress) {
          const percentCompleted = event['loaded'] / event['total'];
          request.options.onProgress({
            type: event.type,
            percentCompleted,
            loaded: event['loaded'],
            total: event['total'],
          } as RequestProgressEvent);
        }
      },
      false
    );
  }

  // Merge headers
  // setXMLHttpRequestHeaders(xhr, request.options?.headers ?? {});
  return xhr;
}

// Creates an instance of {@see HttpBackend} object
// @internal
function createInstance(host?: string) {
  const backend = new Object();
  const hostURL = host;

  // Defines the backend instance property
  Object.defineProperty(backend, 'instance', {
    value: new XMLHttpRequest(),
    writable: true,
    configurable: true,
    enumerable: true,
  });

  // Defines the backend host property
  Object.defineProperty(backend, 'host', {
    value: () => hostURL as string,
  });

  // Returns the constructed backed object
  return backend as Record<string, UnknownType> & {
    instance: XMLHttpRequest;
  };
}

/**
 * @description Provides an object for sending HTTP request using legacy
 * {@see XMLHttpRequest} object
 *
 * ```js
 * // Creates an {@see HttpBackend} instance for sending HTTP requesr
 * const backend = useXhrBackend(<URL>);
 *
 * // To send an HTTP request
 * const response = backend.handle({
 *  url: '', // Override default request url or use path
 *  method: 'POST',
 *  options: {
 *    headers: {
 *      'Content-Type': 'application/json'
 *    }
 *  },
 *  body: {
 *    // Request body
 *  }
 * }); // Promise<HttpResponse>
 * ```
 *
 */
export function useXhrBackend(url?: string) {
  const backend = createInstance(url) as unknown as {
    instance: XMLHttpRequest;
    onProgess?: (event: ProgressEvent) => RequestProgressEvent;
    onLoad: () => Promise<HTTPResponse>;
    onError: (event: ProgressEvent) => HTTPErrorResponse;
  } & HTTPBackend;

  // @internal
  let errorHandler: (e: ProgressEvent) => Promise<HTTPErrorResponse>;
  //@internal
  let finishHandler: () => Promise<HTTPResponse>;
  //@internal
  let progressHandler: (e: ProgressEvent) => void;

  Object.defineProperty(backend, 'handle', {
    value: (message: HTTPRequest) => {
      if (typeof backend.instance === 'undefined') {
        throw new Error(
          'Backend is undefined, cause by onDestroy() function call or unknow method call'
        );
      }
      return new Promise<HTTPResponse>((resolve, reject) => {
        errorHandler = (
          (callback: (event: HTTPErrorResponse) => UnknownType) =>
          (e: ProgressEvent) =>
            callback(backend.onError(e))
        )(reject);
        finishHandler = (
          (callback: (event: Promise<HTTPResponse>) => UnknownType) => () =>
            callback(backend.onLoad())
        )(resolve);
        progressHandler = ((_request) => (e: ProgressEvent) => {
          if (_request.options?.onProgress && backend.onProgess) {
            _request.options.onProgress(backend.onProgess(e));
          }
        })(message);

        // Set the backend client instance
        backend.instance = initXMLHttpRequest(backend.instance, message);
        // Register to load event listener which mark the successful state
        // of the request
        backend.instance.addEventListener('load', finishHandler);
        // When an HTTP Error occurs
        backend.instance.addEventListener('error', errorHandler);
        // Listen for progess event and call user registered
        // callback
        if (typeof message.options?.onProgress === 'function') {
          const progress = backend.instance.upload
            ? backend.instance.upload
            : backend.instance;
          progress.addEventListener('progress', progressHandler);
        }
        // If the request body is an instance of FormData object,
        // we simply pass it to the send method for POST request
        sendRequest(backend.instance, message);
      });
    },
  });
  Object.defineProperty(backend, 'onProgess', {
    value: (event: ProgressEvent<XMLHttpRequestEventTarget>) => {
      if (event.lengthComputable) {
        const percentCompleted = event['loaded'] / event['total'];
        return {
          type: event.type,
          percentCompleted,
          loaded: event['loaded'],
          total: event['total'],
        } as RequestProgressEvent;
      }

      return {
        type: event.type,
        percentCompleted: 0,
        loaded: 0,
        total: 0,
      } as RequestProgressEvent;
    },
  });

  Object.defineProperty(backend, 'onLoad', {
    value: () => {
      const _body =
        typeof backend.instance.response === 'undefined'
          ? backend.instance.responseText
          : backend.instance.response;
      const partial = partialXhr(backend.instance);
      const { statusText, url, headers } = partial;
      let { status } = partial;
      status = status === 0 ? (_body ? 200 : 0) : status;
      const [body, ok] = getResponseBody(
        backend.instance.responseType,
        _body,
        status >= 200 && status < 300
      );
      if (ok) {
        return CreateResponse({
          body: body,
          responseType:
            backend.instance.responseType === ''
              ? 'arraybuffer'
              : (backend.instance.responseType as Exclude<
                  XMLHttpRequestResponseType,
                  ''
                >),
          headers,
          ok,
          url: url || undefined,
          status: status,
          statusText: statusText || 'OK',
        });
      } else {
        return CreateErrorResponse({
          error: body,
          headers,
          status: status || 0,
          statusText: statusText || 'Unknown Error',
          url: url || undefined,
        });
      }
    },
  });

  Object.defineProperty(backend, 'onError', {
    value: (e: ProgressEvent) => {
      const { status, statusText, url, headers } = partialXhr(backend.instance);
      return CreateErrorResponse({
        error: e,
        status: status,
        headers,
        statusText: statusText || 'Unknown Error',
        url: url || undefined,
      });
    },
  });

  Object.defineProperty(backend, 'abort', {
    value: (req: HTTPRequest) => {
      // On a cancellation, remove all registered event listeners.
      if (errorHandler) {
        backend.instance.removeEventListener('error', errorHandler);
        backend.instance.removeEventListener('abort', errorHandler);
        backend.instance.removeEventListener('timeout', errorHandler);
      }
      if (finishHandler) {
        backend.instance.removeEventListener('load', finishHandler);
      }
      if (req.options?.onProgress && progressHandler) {
        backend.instance.removeEventListener('progress', progressHandler);
        if (req.body !== null && backend.instance.upload) {
          backend.instance.upload.removeEventListener(
            'progress',
            progressHandler
          );
        }
      }
      // Finally, abort the in-flight request.
      if (backend.instance.readyState !== backend.instance.DONE) {
        backend.instance.abort();
      }
    },
  });

  Object.defineProperty(backend, 'onDestroy', {
    value: (request?: HTTPRequest) => {
      if (typeof backend.abort === 'function') {
        backend.abort(request);
      }
      backend.instance = undefined as unknown as typeof backend.instance;
    },
  });
  return backend;
}

//Creates a backend controller on top the xhr client
export function xhrBackendController(url?: string) {
  return useRequestBackendController(useXhrBackend(url));
}
