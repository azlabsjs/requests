import {
  HTTPRequest,
  Interceptor,
  NextFunction,
  RequestOptions,
  UnknownType,
} from './types';
import { isPromise } from './utils';

//
export const DEFAULT_REFERRER_POLICY = 'strict-origin-when-cross-origin';

/**
 * Get the request content length
 *
 * @param body
 */
function getTotalBytes(body: UnknownType) {
  // Body is null or undefined
  if (body === null) {
    return 0;
  }
  // Body is Blob
  if (body instanceof Blob || body instanceof File || body) {
    return (body as Blob).size;
  }
  // Body is Buffer
  if (Buffer.isBuffer(body)) {
    return body.length;
  }
  // Detect form data input from form-data module
  if (body && typeof body.getLengthSync === 'function') {
    return body.hasKnownLength && body.hasKnownLength()
      ? body.getLengthSync()
      : null;
  }
  // Body is stream
  return null;
}

function getRequestOptions(request: HTTPRequest) {
  //
  let options: RequestOptions & {
    clone?: (properties: RequestOptions) => RequestOptions | UnknownType;
  } = request.options ?? ({} as RequestOptions);

  let requestHeaders: Record<string, UnknownType> =
    request.options.headers ?? {};

  // Fetch step 1.3
  if (
    typeof requestHeaders['accept'] === 'undefined' &&
    requestHeaders['accept'] === null
  ) {
    requestHeaders = { ...requestHeaders, ...{ accept: '*/*' } };
  }

  // HTTP-network-or-cache fetch steps 2.4-2.7
  let contentLengthValue: string | undefined = undefined;
  if (request.body === null && /^(post|put)$/i.test(request.method)) {
    contentLengthValue = '0';
  }

  // #region Set the request content length
  if (request.body !== null && typeof request.body !== 'undefined') {
    const totalBytes = getTotalBytes(request.body);
    // Set Content-Length if totalBytes is a number (that is not NaN)
    if (typeof totalBytes === 'number' && !Number.isNaN(totalBytes)) {
      contentLengthValue = String(totalBytes);
    }
  }

  if (contentLengthValue) {
    requestHeaders = {
      ...requestHeaders,
      ...{ 'content-length': contentLengthValue },
    };
  }
  // #endregion Set the request content length
  if (
    typeof options?.referrerPolicy === 'undefined' ||
    options?.referrerPolicy === null ||
    options?.referrerPolicy === ''
  ) {
    options.referrerPolicy = DEFAULT_REFERRER_POLICY;
  }

  // HTTP-network-or-cache fetch step 2.15
  const acceptEncoding = requestHeaders['accept-encoding'] ?? undefined;
  if (
    request.options?.compress &&
    (typeof acceptEncoding === 'undefined' || acceptEncoding == null)
  ) {
    requestHeaders = {
      ...requestHeaders,
      ...{ 'accept-encoding': 'gzip, deflate, br' },
    };
  }

  if (typeof options.clone === 'function') {
    options = options.clone({
      headers: requestHeaders,
    });
  }

  // Return the parsed Request options
  return options;
}

/**
 * Creates a pipeline of callable that intercept
 * the request and the response returned by the request handler
 */
export function usePipeline<T>(...pipeline: Interceptor<T>[]) {
  return (message: T, next: NextFunction<T>) => {
    const nextFunc = async (_message: T, interceptor: Interceptor<T>) => {
      return interceptor(
        await (isPromise(_message) ? _message : Promise.resolve(_message)),
        ((request: T) => request) as UnknownType
      );
    };
    const stack = [(request: T) => next(request)];
    if (pipeline.length === 0) {
      pipeline = [
        async (request: T, callback: NextFunction<T>) => {
          return callback(
            await (isPromise(request) ? request : Promise.resolve(request))
          );
        },
      ];
    }
    for (const func of pipeline.reverse()) {
      const previous = stack.pop();
      if (typeof previous !== 'function') {
        throw new Error('Interceptor function must be a callable instance');
      }
      stack.push(async (request: T) => {
        return func(
          await (isPromise(request) ? request : Promise.resolve(request)),
          previous
        );
      });
    }
    return nextFunc(message, stack.pop() as Interceptor<T>);
  };
}

/**
 *
 * @param request
 * @param next
 */
export function defaultInterceptor(
  request: HTTPRequest,
  next: NextFunction<HTTPRequest>
) {
  const options = getRequestOptions(request);
  request = request.clone({
    options: {
      ...options,
      responseType: request.options?.responseType || 'json',
    },
  });
  return next(request);
}
