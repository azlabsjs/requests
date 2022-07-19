// Form data entry object interface definition
export type FormDataEntry = File | string | FormDataEntryValue;

// HTTP response object interface definition
export type HttpResponseType =
  | 'arraybuffer'
  | 'text'
  | 'blob'
  | 'json'
  | 'document';

// HTTP request object interface definition
export type HTTPRequestMethods =
  | 'GET'
  | 'DELETE'
  | 'OPTION'
  | 'HEAD'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'get'
  | 'delete'
  | 'option'
  | 'head'
  | 'post'
  | 'put'
  | 'patch';

type RequestBody =
  | FormData
  | Record<string, string | File | FormDataEntryValue>
  | Record<string, any>
  | any;

// Type definition of a request interface object
// @internal
export type RequestInterface = {
  method: HTTPRequestMethods;
  url: string;
  options?: RequestOptions;
  body?: RequestBody;
};

// Request object interface definition
export type HttpRequest = Required<RequestInterface> & {
  clone(properties?: { [prop: string]: any }): any;
};

// Response object interface definitions
// @internal
export type HttpResponse = {
  responseType: XMLHttpRequestResponseType;
  response: ArrayBuffer | string | Blob | Document | ReadableStream;
  ok: boolean;
  status: number;
  statusText: string;
  headers: HeadersType;
  url: string | undefined;
};

// Http Error Response type definition
export type HttpErrorResponse = {
  status: number;
  statusText: string;
  error: string | any;
  url?: string;
  headers?: HeadersType;
};

// Request headers object interface definition
export type HeadersType = HeadersInit;

// Pipelines types definitions
export type NextFunction<T, R = unknown> = (request: T) => R;

// Request interceptor type definition
export type Interceptor<T, R = unknown> = (
  message: T,
  next: NextFunction<T, R>
) => any;

// Progress object type
export type HttpProgressEvent = {
  type?: string;
  loaded: number;
  total: number;
  percentCompleted: number;
};

// Request options object interface definitions
export type RequestOptions = {
  // Defines request options used by the request client
  headers?: HeadersType;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: HttpResponseType;

  // Request options methods for interacting with request
  onProgress?: (e: HttpProgressEvent) => void;
  onTimeout?: () => void;

  // Interceptors options definitions
  interceptors?: Interceptor<HttpRequest>[];

  // Fetch specific options
  keepalive?: boolean;
  redirect?: 'error' | 'follow' | 'manual';
  compress?: boolean;
  referrerPolicy?: string;
};

/**
 * @description Type declaration of a request handler object
 *
 * **Note**
 * Implementation class must provide methods for sending
 * and aborting (if supported) requests. Implementation classes
 * are free to use TCP/IP protocols for sending request to specified
 * server.
 */
export type RequestHandler<T, R> = {
  /**
   * Method which when called, handle the client request
   * @method
   * @param request
   */
  handle(request: T): Promise<R>;
  /**
   * Returns request host to which client sends
   * request to.
   *
   * @method
   */
  host: () => string | undefined;

  /**
   * Cancel the currently ongoing request
   *
   * @method
   *
   * @param request
   */
  abort?: (request?: T) => void;
};

/**
 * @description Request client generic interface
 */
export type RequestClient<T, R> = {
  request: (message?: RequestInterface | string) => Promise<R>;
  registerInterceptors: (...interceptors: Interceptor<T>[]) => T;
};

// Request backend provider interface definition
export type HttpBackend = RequestHandler<HttpRequest, HttpResponse> & {
  // Cleanup resources when get call
  onDestroy?: (request?: HttpRequest) => void;
};

// Http Request Controller type definition
export type HttpBackendController = RequestHandler<HttpRequest, HttpResponse> &
  Record<string, any> & {
    /**
     * Boolean value indicating whether request was
     * was aborted of not.
     * @property
     */
    aborted: boolean;
    /**
     * Request backend used by the controller to send
     * requests to server
     * @property
     */
    backend: HttpBackend;
  };
