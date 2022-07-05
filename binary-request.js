let dataURI = require('./binary-content');
const request = require('./dist');
const fetch = (...args) => import('node-fetch').then(({FormData}) => {
    let client = request.useClient(
        request.fetchBackendController('https://storage.lik.tg'),
        [
          (request, next) => {
            request = request.clone({
              options: {
                ...request.options,
                headers: {
                  ...request.options.headers,
                  'x-client-id': '96a6bba2-73e4-404c-9bb3-0d61c31bba44',
                  'x-client-secret':
                    '9NYHbYhzNXX2AbrxHs4H0cTmM7udeKEdqfwyTCXGLjnaU2IhmVldNwAknIpysbx5QZ8KBytvw1hW7qQE6iA',
                },
              },
            });
            return next(request);
          },
        ]
      );
      
      function dataURItoBlob(dataURI) {
        // convert base64 to raw binary data held in a string
        // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
        const bytes = atob(dataURI.split(',')[1]);
      
        // separate out the mime component
        const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
      
        // write the bytes of the string to an ArrayBuffer
        const buffer = new ArrayBuffer(bytes.length);
      
        // create a view into the buffer
        const binary = new Uint8Array(buffer);
      
        // set the bytes of the buffer to the correct values
        for (let i = 0; i < bytes.length; i++) {
          binary[i] = bytes.charCodeAt(i);
        }
      
        // write the ArrayBuffer to a blob, and you're done
        return new Blob([buffer], { type: mime });
      }
      
      /**
       * @description Creates a javascript file object from the blob instance
       */
      function convertBlobToFile(blob, name) {
        return new File([blob], name, {
          type: blob.type,
          lastModified: new Date().getTime(),
        });
      }
      
      const formData = new FormData();
      formData.append(
        'content',
        convertBlobToFile(dataURItoBlob(dataURI), 'image.jpg')
      );
      formData.append('description', 'FAUTEUIL BUREAU');
      
      // Create the request
      const req = {
        url: 'api/storage/object/upload',
        method: 'POST',
        body: {
          content: convertBlobToFile(dataURItoBlob(dataURI), 'image.jpg'),
          // parent: '96a6bfe8-0aff-46ac-b795-80c4a8af001d',
          description: 'FAUTEUIL BUREAU',
        },
        // body: formData,
        options: {
        //   headers: {
        //     'Content-Type': 'multipart/form-data',
        //   },
          onProgress: (event) => {
            console.log(event);
          },
          onError: (event) => {
            console.log(event);
          },
        },
      };
      
      client
        .request(req)
        .then((response) => {
          console.log(response);
        })
        .catch((error) => {
          console.log('Error : ', error);
        });
});

fetch();