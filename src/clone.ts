
// Creates a cloneable instance of an object
// The API is used by {@see HttpRequest} & {@see HttpResponse} to implement
// a clone method that copy object properties instead of assingin them directly
// @internal
export function Cloneable<T>(bluePrint: new () => T, args: any) {
  const propertiesDescriptorsMap: PropertyDescriptorMap = {};
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
    if (isPureObject) {
      instance[prop] = Cloneable(value.constructor ?? Object, value);
    }
    instance[prop] = value;
  }
  Object.defineProperty(instance, 'clone', {
    value: (properties?: { [index: string]: any }) => {
      const object$ = { ...instance };
      for (const prop in properties) {
        const value = properties[prop];
        const valueType = typeof value;
        if (valueType === 'undefined' || value === null) {
          continue;
        }
        const isPureObject =
          valueType === 'object' &&
          value.constructor?.prototype === Object.prototype;
        if (isPureObject) {
          object$[prop] = Cloneable(value.constructor || Object, value)[
            'clone'
          ](instance[prop] || {});
          continue;
        }
        object$[prop] = value;
      }
      return Cloneable(instance.constructor || Object, object$);
    },
    writable: false,
  });
  return instance as T & {
    clone(properties?: { [prop: string]: any }): any;
  };
}
