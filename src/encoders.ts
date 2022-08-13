import { FormDataEntry } from './types';
import { URIHelper } from './url';
import { isPrimitive, randomName } from './utils';

export interface Encoder {
  encode(
    body: Record<string, FormDataEntry> | FormData
  ): Promise<string> | string;
}

//#region Form Data Encoder
export class FormDataRequestEncoder implements Encoder {
  // Encoder boundary private property
  private boundary!: string;

  public constructor() {
    this.boundary = this.createBoundary();
  }

  // Creates a form data request boundary
  private createBoundary() {
    return '---------------------------' + Date.now().toString(16);
  }

  // Return the form data encoder boundary value
  public getBoundary() {
    return this.boundary;
  }

  // Blob content encoding implementation
  private encodeBlob(name: string, filename: string, blob: Blob) {
    return new Promise<string>((resolve) => {
      const reader = new FileReader();
      let content =
        'Content-Disposition: form-data; name="' +
        name +
        '"; filename="' +
        filename +
        '"\r\nContent-Type: ' +
        blob.type +
        '\r\n\r\n';
      reader.addEventListener('load', (e: ProgressEvent<FileReader>) => {
        content += e.target?.result + '\r\n';
        resolve(content);
      });
      reader.readAsBinaryString(blob);
    });
  }

  private encodeText(name: string, value: string) {
    return (
      'Content-Disposition: form-data; name="' +
      name +
      '"\r\n\r\n' +
      value +
      '\r\n'
    );
  }

  private encodeArray(name: string, value: any[]): string[] {
    const segments: string[] = [];
    name = `${name}[]`;
    for (const current of value) {
      if (isPrimitive(current)) {
        segments.push(this.encodeText(name, current));
      } else if (Array.isArray(current)) {
        segments.push(...this.encodeArray(name, current));
      } else if (typeof current === 'object') {
        segments.push(...this.encodeRawObject(name, current));
      }
    }
    return segments;
  }

  private encodeRawObject(name: string, value: Record<string, any>): string[] {
    const segments: string[] = [];
    for (const prop in value) {
      if (isPrimitive(value[prop])) {
        segments.push(this.encodeText(`${name}[${prop}]`, value[prop]));
      } else if (Array.isArray(value[prop])) {
        segments.push(...this.encodeArray(`${name}[${prop}]`, value[prop]));
      } else if (typeof value[prop] === 'object') {
        segments.push(...this.encodeRawObject(`${name}[${prop}]`, value[prop]));
      }
    }
    return segments;
  }

  private async encodeBodyEntry(prop: string, value: any) {
    if (isPrimitive(value)) {
      return new Promise<string[]>((resolve) => {
        resolve([this.encodeText(prop, value as string)]);
      });
    } else if (value instanceof File || (value as any) instanceof Blob) {
      const result = await this.encodeBlob(
        prop,
        value instanceof File ? value.name : randomName(),
        value as Blob
      );
      return [result];
    } else if (Array.isArray(value)) {
      return new Promise<string[]>((resolve) => {
        resolve(this.encodeArray(prop, value));
      });
    } else if (typeof value === 'object') {
      return new Promise<string[]>((resolve) => {
        resolve(this.encodeRawObject(prop, value));
      });
    }
    return new Promise<string[]>((resolve) => resolve([] as string[]));
  }

  // Encode the request body into a raw string
  async encode(
    body: Record<string, any> | FormData | unknown
  ): Promise<string> {
    const segments: Promise<string[]>[] = [];
    if (body instanceof FormData) {
      body.forEach((value, prop) => {
        segments.push(this.encodeBodyEntry(prop, value));
      });
    } else if (typeof body === 'object'){
      for (const prop in body) {
        segments.push(this.encodeBodyEntry(prop, body[prop as keyof typeof body]));
      }
    }
    const content: string[] = [];
    // TODO : Loop through the 2 dimensional table of string
    // and flatten the second layer in to the first layer
    for (const iterator of await Promise.all(segments)) {
      for (const current of iterator) {
        content.push(current);
      }
    }
    return (
      '--' +
      this.boundary +
      '\r\n' +
      content.join('--' + this.boundary + '\r\n') +
      '--' +
      this.boundary +
      '--\r\n'
    );
  }
}
//#endregion Form Data Encoder

//#region Raw Text encoder
export class RawEncoder implements Encoder {
  // Creates an instance of the Request encoder
  public constructor(private contentType: string) {}

  // Provides encoding implementation
  encode(
    body: Record<string, FormDataEntry> | FormData | unknown
  ): string | Promise<string> {
    const _body: Record<string, any> = {};
    if (body instanceof FormData) {
      body.forEach((value, key) => {
        if (value instanceof File) {
          _body[key] = value.name;
        } else {
          _body[key] = value;
        }
      });
    } else if (typeof body === 'object') {
      for (const key in body) {
        const _key = key as keyof typeof body;
        if (typeof body[_key] !== 'function') {
          _body[key] = body[_key];
        }
      }
    }
    if (typeof URLSearchParams !== 'undefined') {
      return new URLSearchParams(_body).toString();
    }
    return URIHelper.buildQuery(_body, this.contentType).join(
      this.contentType === 'text/plain' ? '\r\n' : '&'
    );
  }
}
//#endregion Raw Encoder
