// Form data entry object interface definition
export type FormDataEntry = File | string | FormDataEntryValue;

// Request headers object interface definition
export type HeadersType = HeadersInit;
/**
 * @internal
 */
export type RequestParamType = Record<
  string,
  string | string[] | unknown | any
>;
/**
 * @internal
 */
export type ResponseBodyType =
  | ArrayBuffer
  | string
  | Blob
  | Document
  | ReadableStream;

/**
 * @internal
 */
export type SetResponseBodyType<TBody = unknown, TResult = TBody> =
  | TBody
  | ((value: TBody | ResponseBodyType) => TResult | ResponseBodyType);

// HTTP response object interface definition
export type HTTPResponseType =
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

export type RequestBody =
  | FormData
  | Record<string, string | File | FormDataEntryValue>
  | Record<string, any>
  | unknown;

// Type definition of a request interface object
// @internal
export type RequestInterface<
  TParamType = RequestParamType,
  THeaderType = HeadersType
> = {
  setHeaders?: THeaderType;
  setResponseType?: string;
  setParams?: TParamType;
  method: HTTPRequestMethods;
  url: string;
  options?: RequestOptions<TParamType, THeaderType>;
  body?: RequestBody;
};

// Request object interface definition
export type HTTPRequest = Required<RequestInterface> & {
  clone: (argument: Partial<Omit<HTTPRequest, 'clone'>>) => HTTPRequest;
};

/**
 * Response object interface except clone and setBody functions
 */
export type ResponseInterface<THeaderType = HeadersType, TBody = unknown> = {
  responseType: HTTPResponseType;
  body: TBody | ResponseBodyType;
  ok: boolean;
  status: number;
  statusText: string;
  headers: THeaderType;
  url: string | undefined;
};

/**
 * HTTP Response object type definitions
 */
export type HTTPResponse<
  THeaderType = HeadersType,
  TBody = unknown
> = ResponseInterface<THeaderType, TBody> & {
  setBody?: SetResponseBodyType<TBody>;
  clone: (
    argument: Partial<Omit<HTTPResponse<THeaderType>, 'clone'>>
  ) => HTTPResponse<THeaderType>;
};

// Http Error Response type definition
export type HTTPErrorResponse<THeaderType = HeadersType> = {
  status: number;
  statusText: string;
  error: string | any;
  url?: string;
  headers?: THeaderType;
  clone: (
    argument: Partial<Omit<HTTPErrorResponse, 'clone'>>
  ) => HTTPErrorResponse;
};

// Pipelines types definitions
export type NextFunction<T, R = unknown> = (request: T) => R;

// Request interceptor type definition
export type Interceptor<T, R = unknown> = (
  message: T,
  next: NextFunction<T, R>
) => any;

// Progress object type
export type RequestProgressEvent = {
  type?: string;
  loaded: number;
  total: number;
  percentCompleted: number;
};

// Request options object interface definitions
export type RequestOptions<
  TParamType = RequestParamType,
  THeaderType = HeadersType
> = {
  // Defines request options used by the request client
  headers?: THeaderType;
  timeout?: number;
  withCredentials?: boolean;
  responseType?: HTTPResponseType;
  params?: TParamType;

  // Request options methods for interacting with request
  onProgress?: (e: RequestProgressEvent) => void;
  onTimeout?: () => void;

  // Interceptors options definitions
  interceptors?: Interceptor<HTTPRequest>[];

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
export type HTTPBackend = RequestHandler<HTTPRequest, HTTPResponse> & {
  // Cleanup resources when get call
  onDestroy?: (request?: HTTPRequest) => void;
};

// Http Request Controller type definition
export type HTTPBackendController = RequestHandler<HTTPRequest, HTTPResponse> &
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
    backend: HTTPBackend;
  };
