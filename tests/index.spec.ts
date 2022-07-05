import { useFetchBackend, useClient } from '../src';
import {TestServer} from './utils/server';
import stream from 'node:stream';

describe('Request client tests', () => {
  const local = new TestServer();
  let base!: string;

  afterAll(async () => {
    return local.stop();
  });

  beforeAll(async () => {
    await local.start();
    base = `http://${local.hostname}:${local.port}/`;
  });

  it('should return a promise', () => {
    const url = `${base}hello`;
    const p = useClient(useFetchBackend(url)).request();
    expect(p).toBeInstanceOf(Promise);
    expect(p).toHaveProperty('then');
  });

  it('should reject with error if url is protocol relative', () => {
		const url = '//example.com/';
		return expect(useClient(useFetchBackend(url)).request()).rejects.toThrow(TypeError);
	});

  it('should reject with error if url is relative path', () => {
		const url = '/some/path';
		return expect(useClient(useFetchBackend(url)).request()).rejects.toThrow(TypeError);
	});

  it('should reject with error if protocol is unsupported', () => {
		const url = 'ftp://example.com/';
		return expect(useClient(useFetchBackend(url)).request()).rejects.toThrow(TypeError);
	});

	// it('should reject with error on network failure', function () {
	// 	const url = 'http://localhost:50000/';
	// 	return expect(useClient(useFetchBackend(url)).request()).rejects.toThrow(Object);
	// });

  it('should resolve into response', async () => {
		const url = `${base}hello`;
		const res = await useClient(useFetchBackend(url)).request();
		expect(res).toBeInstanceOf(Object);
		expect(res.response).toBeInstanceOf(stream.Transform);

		expect(res.url).toEqual(url);
		expect(res.ok).toBeTruthy();
		expect(res.status).toEqual(200);
		expect(res.statusText).toEqual('OK');
	});
});
