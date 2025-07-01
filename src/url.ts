function entryValue(value: FormDataEntryValue) {
  return typeof value === 'string'
    ? value
    : value instanceof File
    ? value.name
    : JSON.stringify(value);
}
//#region Provide uri specific utilities
export class URIHelper {

  // Provide the actual implementation of encoding
  public static encodeText(
    name: string,
    value: string,
    contentType = 'text/plain'
  ) {
    return `${name}=${
      contentType === 'text/plain'
        ? value.replace(/[\s=\\]/g, '\\$&')
        : encodeURIComponent(value)
    }`;
  }

  // Build a uri query array from user provided object
  public static buildQuery(
    body: Record<string, FormDataEntryValue> | FormData,
    contentType = 'text/plain'
  ) {
    const segments: string[] = [];
    if (body instanceof FormData) {
      body.forEach((value, prop) => {
        segments.push(
          URIHelper.encodeText(prop, entryValue(value), contentType)
        );
      });
    } else {
      for (const prop in body) {
        segments.push(
          URIHelper.encodeText(prop, entryValue(body[prop]), contentType)
        );
      }
    }
    return segments;
  }

  // Build uri with search parameter
  public static buildSearchParams(
    url: string,
    body: Record<string, FormDataEntryValue> | FormData | unknown,
    contentType = 'text/plain'
  ) {
    const segments = URIHelper.buildQuery(
      typeof body === 'object' && body !== null
        ? (body as Record<string, FormDataEntryValue>)
        : {},
      contentType
    );
    return url.replace(
      /(?:\?.*)?$/,
      segments.length > 0 ? '?' + segments.join('&') : ''
    );
  }
}
//#endregion Provide uri specific utilities
