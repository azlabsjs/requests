export {
  HttpRequest,
  RequestOptions,
  HttpResponse,
  HttpProgressEvent,
  Interceptor,
  NextFunction,
  HttpErrorResponse,
  HttpBackendController,
  HttpBackend,
  RequestClient,
  RequestHandler,
  RequestInterface,
} from './types';
/**
 * @deprecated Exported only for compatibility reason
 * **Note**
 * Make use of useRequestClient function as it's the original function name
 */
export { useRequestClient as useClient } from './http';
export { useRequestClient } from './http';
export { usePipeline } from './interceptors';
export {
  convertBlobToFile,
  dataURItoBlob,
  isValidHttpUrl,
  getHttpHost,
} from './utils';
export { useXhrBackend, xhrBackendController } from './xhr';
export { fetchBackendController, useFetchBackend } from './fetch';
