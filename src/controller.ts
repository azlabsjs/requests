import {
  HttpBackend,
  HttpBackendController,
  HttpRequest,
  HttpResponse,
} from './types';

// Controller implementation add an event emitter layer on
// top of the controller object that can be used to register
// custom event on the controller object
// @internal
type EventListenerFunc = (event?: any) => void;
type EventEmitter<T = string> = {
  addEventListener: (event: T, listener: EventListenerFunc) => void;
  removeListener: (event: T, listener: EventListenerFunc) => void;
  removeAllListeners: (event: T) => void;
  emit: (event: T, value?: any) => void;
};

function asEventEmitter(object$: Record<string, any>) {
  Object.defineProperty(object$, 'addEventListener', {
    value: (event: 'string', listener: (data: any) => void) => {
      if (typeof object$['_listeners'] === 'undefined') {
        object$['_listeners'] = new Object();
      }
      if (
        object$['_listeners'][event] !== null &&
        typeof object$['_listeners'][event] !== 'undefined'
      ) {
        object$['_listeners'][event] = [
          ...object$['_listeners'][event],
          listener,
        ];
      } else {
        object$['_listeners'][event] = [listener];
      }
    },
  });

  Object.defineProperty(object$, 'removeListener', {
    value: (event: 'string', listener: (data: any) => void) => {
      if (
        object$['_listeners'][event] !== null &&
        typeof object$['_listeners'][event] !== 'undefined'
      ) {
        object$['_listeners'][event] = (
          object$['_listeners'][event] as ((data: any) => void)[]
        ).filter((_listener) => _listener !== listener);
      }
    },
  });

  Object.defineProperty(object$, 'removeAllListeners', {
    value: (event: 'string') => {
      if (
        object$['_listeners'][event] !== null ||
        typeof object$['_listeners'][event] !== 'undefined'
      ) {
        delete object$['_listeners'][event];
      }
    },
  });

  Object.defineProperty(object$, 'emit', {
    value: async (event: 'string', data?: any) => {
      if (
        object$['_listeners'][event] !== null &&
        typeof object$['_listeners'][event] !== 'undefined'
      ) {
        if (
          typeof Promise === 'undefined' ||
          typeof Promise.all !== 'function'
        ) {
          (object$['_listeners'][event] as ((data: any) => void)[]).map(
            (_listener) => _listener(data)
          );
        } else {
          await Promise.all(
            (object$['_listeners'][event] as ((data: any) => void)[]).map(
              (_listener) => _listener(data)
            )
          );
        }
      }
    },
  });
  // Initialize the listeners property of the controller
  object$['_listeners'] = new Object();
  return object$ as any as EventEmitter;
}

/**
 * @description Backend controller uses composition to add request cancellation implementation
 * on top of the backend api.
 */
export function useRequestBackendController<T>(backend: HttpBackend) {
  const controller: HttpBackendController<HttpRequest, HttpResponse> =
    asEventEmitter(new Object()) as any as HttpBackendController<
      HttpRequest,
      HttpResponse
    >;

  // Defines backend property getter and setter
  Object.defineProperty(controller, 'backend', {
    set: (value: T) => {
      controller['_backend'] = value;
    },
    get: () => {
      return controller['_backend'];
    },
  });

  //
  Object.defineProperty(controller, 'abort', {
    value: (request: T) => {
      if (typeof controller.emit === 'function') {
        controller.emit('abort', request);
      }
    },
  });

  // Defines a handle method the redirect to backend handle method
  Object.defineProperty(controller, 'handle', {
    value: (req: HttpRequest) => controller.backend?.handle(req),
  });

  // Defines the host method that redirect to the backend host method
  Object.defineProperty(controller, 'host', {
    value: () => controller.backend?.host(),
  });

  // Set the controller backend
  controller.backend = backend;
  controller.aborted = false;

  // Register the cancel event
  if (typeof controller['addEventListener'] === 'function') {
    controller['addEventListener']('abort', (req: HttpRequest) => {
      if (controller.aborted) {
        throw new Error('Cannot abort a request that was already aborted');
      }
      if (
        controller.backend &&
        typeof controller.backend.abort === 'function'
      ) {
        controller.aborted = true;
        controller.backend.abort(req);
      }
    });
  }
  // Returns the backend controller to be use to control
  // backend instance
  return controller;
}
