// import { useClient, fetchBackendController } from './dist/index.js';

const request = require('./dist');

const client = request.useClient(
  request.fetchBackendController('https://auth.lik.tg/')
);
client
  .request({
    url: 'api/v2/login',
    method: 'POST',
    options: {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      interceptors: [
        (request, next) => {
          request = request.clone({
            options: {
              ...request.options,
              headers: {
                ...request.options?.headers,
                'x-authorization-client-id':
                  '859782E1-9A2F-49A4-9D42-B59A78E520FB',
                'x-authorization-client-secret':
                  'wJa60mWPUK2W8AycfziCrWeMWSus4HLAoSV9cq2qb6FTMlmEudoItlbUHwdUw15peIXmF2b2q2LwCYSO0fvvgQ',
              },
            },
          });
          const response = next(request);
          return response;
        },
      ],
      onProgress: (event) => {
        // Handle progress event
      },
    },
    body: {
      username: 'azandrewdevelopper@gmail.com',
      password: 'homestead',
    },
  })
  .then((res) => {
    console.log('Request response: ', res);
  })
  .catch((err) => {
    console.log('Error: ', err);
  });

  