import { FormDataEntry } from './types';
import { URIHelper } from './url';

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

  // Encode the request body into a raw string
  async encode(
    body: Record<string, FormDataEntry> | FormData
  ): Promise<string> {
    // oAjaxReq.setRequestHeader("Content-Type", "multipart\/form-data; boundary=" + sBoundary);
    const segments: Promise<string>[] = [];
    if (body instanceof FormData) {
      // TODO: Removed the commented code if tested successfully
      // for (const [prop, value] of (body as any).entries()) {
      //   segments.push(
      //     typeof value === 'string'
      //       ? new Promise((resolve) => {
      //           resolve(this.encodeText(prop, value));
      //         })
      //       : this.encodeBlob(prop, value.name, value)
      //   );
      // }
      body.forEach((value, prop) => {
        segments.push(
          typeof value === 'string'
            ? new Promise((resolve) => {
                resolve(this.encodeText(prop, value));
              })
            : this.encodeBlob(prop, value.name, value)
        );
      });
    } else {
      for (const prop in body) {
        const value = body[prop];
        segments.push(
          typeof value === 'string'
            ? new Promise((resolve) => {
                resolve(this.encodeText(prop, value));
              })
            : this.encodeBlob(prop, value.name, value)
        );
      }
    }
    const content = await Promise.all(segments);
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
    body: Record<string, FormDataEntry> | FormData
  ): string | Promise<string> {
    return URIHelper.buildQuery(body, this.contentType).join(
      this.contentType === 'text/plain' ? '\r\n' : '&'
    );
  }
}
//#endregion Raw Encoder
