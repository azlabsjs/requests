type CloneFunction<T> = (argument: Partial<Omit<T, 'clone'>>) => T;
type CloneableType<T> = T & {
  clone: (argument: Partial<Omit<T, 'clone'>>) => T;
};

// Creates a cloneable instance of an object
// The API is used by {@see HttpRequest} & {@see HttpResponse} to implement
// a clone method that copy object properties instead of assingin them directly
// @internal
export function Cloneable<T>(
  bluePrint: new () => T,
  args: any,
  cloneMap?: Partial<{
    [p in keyof Partial<Omit<T, 'clone'>>]: (
      _object: T,
      value: any
    ) => CloneableType<T>;
  }>
) {
  const propertiesDescriptorsMap: PropertyDescriptorMap = {};
  const _cloneMap = cloneMap ?? {};
  for (const prop in args) {
    propertiesDescriptorsMap[prop] = {
      value: args[prop],
      writable: true,
      configurable: true,
      enumerable: true,
    };
  }
  const obj = Object.create(bluePrint, propertiesDescriptorsMap);
  const instance = new obj.prototype.constructor();
  // Make every object to the properties parameter clonable
  for (const prop in args) {
    const value = args[prop];
    const valueType = typeof value;
    if (valueType === 'undefined' || value === null) {
      continue;
    }
    const isPureObject =
      valueType === 'object' &&
      value.constructor?.prototype === Object.prototype;
    if (
      isPureObject &&
      (typeof instance[prop] === 'undefined' || instance[prop] === null)
    ) {
      instance[prop] = { ...(instance[prop] ?? {}), ...value };
    }
    instance[prop] = value;
  }
  const _defaultCloneFunc: CloneFunction<T> = (
    properties?: Partial<Omit<T, 'clone'>>
  ) => {
    let object$ = Cloneable<T>(instance.constructor, { ...instance });
    for (const prop in properties) {
      const _prop = prop as keyof typeof object$;
      const value = (properties as any)[_prop] as any;
      const valueType = typeof value;
      if (valueType === 'undefined' || value === null) {
        continue;
      }
      if (prop in _cloneMap) {
        object$ = (_cloneMap as any)[prop](object$, value);
        continue;
      }
      const isPureObject =
        valueType === 'object' &&
        value.constructor?.prototype === Object.prototype;
      if (
        isPureObject &&
        (typeof object$[_prop] === 'undefined' || object$[_prop] === null)
      ) {
        object$[_prop] = { ...(object$[_prop] ?? {}), ...value };
        continue;
      }
      // Case the value is an object having a clone method, we call the clone method of the value
      object$[_prop] =
        valueType === 'object' &&
        value !== null &&
        value['clone'] === 'function'
          ? value['clone']()
          : value;
    }
    return object$;
  };
  Object.defineProperty(instance, 'clone', {
    value: _defaultCloneFunc,
    writable: false,
  });
  return instance as CloneableType<T>;
}
