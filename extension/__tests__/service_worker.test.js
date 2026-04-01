/**
 * Tests for service_worker.js message handlers:
 * GET_SETTINGS, CHECK_LIBRARY, SEARCH_LIBRARIES, OPEN_OPTIONS
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');

function buildServiceWorkerContext() {
  const messageListeners = [];
  const chromeMock = {
    runtime: {
      onMessage: {
        addListener: jest.fn((fn) => messageListeners.push(fn)),
      },
      openOptionsPage: jest.fn(),
      lastError: null,
    },
    storage: {
      sync: {
        get: jest.fn(),
      },
    },
  };
  const checkLibraries = jest.fn();
  const searchLibraries = jest.fn();

  const code = fs.readFileSync(
    path.resolve(__dirname, '../background/service_worker.js'),
    'utf8'
  );

  const ctx = vm.createContext({
    importScripts: jest.fn(),
    chrome: chromeMock,
    checkLibraries,
    searchLibraries,
    Promise: global.Promise,
    Error: global.Error,
    console,
  });

  vm.runInContext(code, ctx);

  // Helper to invoke the registered message handler and collect the response
  const callHandler = (message) =>
    new Promise((resolve) => {
      messageListeners[0](message, {}, resolve);
    });

  return { ctx, chromeMock, checkLibraries, searchLibraries, callHandler };
}

function mockStorage(chromeMock, data) {
  chromeMock.storage.sync.get.mockImplementation((keys, cb) => {
    cb(data);
  });
}

// ---------------------------------------------------------------------------
// GET_SETTINGS
// ---------------------------------------------------------------------------

describe('GET_SETTINGS', () => {
  test('returns calil_api_key and libraries from storage', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, {
      calil_api_key: 'my_api_key',
      libraries: [{ systemid: 'Tokyo_Pref', name: '東京' }],
    });

    const response = await callHandler({ type: 'GET_SETTINGS' });

    expect(response.success).toBe(true);
    expect(response.data.calil_api_key).toBe('my_api_key');
    expect(response.data.libraries).toEqual([{ systemid: 'Tokyo_Pref', name: '東京' }]);
  });

  test('missing calil_api_key defaults to empty string', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { libraries: [{ systemid: 'Tokyo_Pref', name: '東京' }] });

    const response = await callHandler({ type: 'GET_SETTINGS' });

    expect(response.success).toBe(true);
    expect(response.data.calil_api_key).toBe('');
  });

  test('missing libraries defaults to empty array', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: 'my_api_key' });

    const response = await callHandler({ type: 'GET_SETTINGS' });

    expect(response.success).toBe(true);
    expect(response.data.libraries).toEqual([]);
  });

  test('storage error returns success: false', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    chromeMock.storage.sync.get.mockImplementation((keys, cb) => {
      chromeMock.runtime.lastError = { message: 'Storage unavailable' };
      cb({});
      chromeMock.runtime.lastError = null;
    });

    const response = await callHandler({ type: 'GET_SETTINGS' });

    expect(response.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CHECK_LIBRARY
// ---------------------------------------------------------------------------

describe('CHECK_LIBRARY', () => {
  const isbn = '9784873117386';
  const libraries = [{ systemid: 'Tokyo_Pref', name: '東京都立図書館' }];
  const apiKey = 'valid_api_key';

  test('with API key and libraries set, calls checkLibraries and returns data', async () => {
    const { chromeMock, checkLibraries, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: apiKey, libraries });
    const fakeData = [{ library: libraries[0], result: { status: 'OK', libkey: {} }, error: null }];
    checkLibraries.mockResolvedValue(fakeData);

    const response = await callHandler({
      type: 'CHECK_LIBRARY',
      payload: { isbn, libraries },
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(fakeData);
    expect(checkLibraries).toHaveBeenCalledWith(apiKey, isbn, libraries);
  });

  test('API key not set returns error api_key_not_set', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: '', libraries });

    const response = await callHandler({
      type: 'CHECK_LIBRARY',
      payload: { isbn, libraries },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('api_key_not_set');
  });

  test('libraries is empty array and payload has no libraries returns no_libraries_set', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: apiKey, libraries: [] });

    const response = await callHandler({
      type: 'CHECK_LIBRARY',
      payload: { isbn },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('no_libraries_set');
  });

  test('payload provides libraries, uses payload libraries instead of storage', async () => {
    const payloadLibraries = [{ systemid: 'Osaka_Pref', name: '大阪府立図書館' }];
    const storageLibraries = [{ systemid: 'Tokyo_Pref', name: '東京都立図書館' }];
    const { chromeMock, checkLibraries, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: apiKey, libraries: storageLibraries });
    checkLibraries.mockResolvedValue([]);

    await callHandler({
      type: 'CHECK_LIBRARY',
      payload: { isbn, libraries: payloadLibraries },
    });

    expect(checkLibraries).toHaveBeenCalledWith(apiKey, isbn, payloadLibraries);
  });

  test('checkLibraries throws returns success: false with error message', async () => {
    const { chromeMock, checkLibraries, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: apiKey, libraries });
    checkLibraries.mockRejectedValue(new Error('network_error'));

    const response = await callHandler({
      type: 'CHECK_LIBRARY',
      payload: { isbn, libraries },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('network_error');
  });
});

// ---------------------------------------------------------------------------
// SEARCH_LIBRARIES
// ---------------------------------------------------------------------------

describe('SEARCH_LIBRARIES', () => {
  const pref = '東京都';
  const city = '渋谷区';

  test('payload has appkey, uses payload appkey and ignores storage', async () => {
    const { chromeMock, searchLibraries, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: 'storage_key', libraries: [] });
    searchLibraries.mockResolvedValue([]);

    await callHandler({
      type: 'SEARCH_LIBRARIES',
      payload: { pref, city, appkey: 'payload_key' },
    });

    expect(searchLibraries).toHaveBeenCalledWith('payload_key', pref, city);
  });

  test('payload has no appkey, uses storage key', async () => {
    const { chromeMock, searchLibraries, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: 'storage_key', libraries: [] });
    searchLibraries.mockResolvedValue([]);

    await callHandler({
      type: 'SEARCH_LIBRARIES',
      payload: { pref, city },
    });

    expect(searchLibraries).toHaveBeenCalledWith('storage_key', pref, city);
  });

  test('no appkey anywhere returns success: false with api_key_not_set', async () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: '', libraries: [] });

    const response = await callHandler({
      type: 'SEARCH_LIBRARIES',
      payload: { pref, city },
    });

    expect(response.success).toBe(false);
    expect(response.error).toBe('api_key_not_set');
  });

  test('successful search returns success: true with data array', async () => {
    const libraryList = [
      { systemid: 'Tokyo_Pref', name: '東京都立図書館' },
      { systemid: 'Tokyo_Shibuya', name: '渋谷区立図書館' },
    ];
    const { chromeMock, searchLibraries, callHandler } = buildServiceWorkerContext();
    mockStorage(chromeMock, { calil_api_key: 'valid_key', libraries: [] });
    searchLibraries.mockResolvedValue(libraryList);

    const response = await callHandler({
      type: 'SEARCH_LIBRARIES',
      payload: { pref, city },
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(libraryList);
  });
});

// ---------------------------------------------------------------------------
// OPEN_OPTIONS
// ---------------------------------------------------------------------------

describe('OPEN_OPTIONS', () => {
  test('OPEN_OPTIONS message calls chrome.runtime.openOptionsPage()', () => {
    const { chromeMock, callHandler } = buildServiceWorkerContext();

    // OPEN_OPTIONS is synchronous (return false), so we call handler and check
    const messageListeners = [];
    chromeMock.runtime.onMessage.addListener.mock.calls.forEach(([fn]) =>
      messageListeners.push(fn)
    );

    // Directly invoke the listener (OPEN_OPTIONS returns false, not async)
    const sendResponse = jest.fn();
    // Find the listener registered during vm.runInContext - already in chromeMock
    // We rebuild to get a fresh listener
    const { chromeMock: cm } = buildServiceWorkerContext();
    // We need to access the listener - it was added via addListener
    const listeners = cm.runtime.onMessage.addListener.mock.calls.map(([fn]) => fn);
    listeners[0]({ type: 'OPEN_OPTIONS' }, {}, sendResponse);

    expect(cm.runtime.openOptionsPage).toHaveBeenCalledTimes(1);
  });

  test('OPEN_OPTIONS handler returns false (synchronous, not async)', () => {
    const { chromeMock } = buildServiceWorkerContext();
    const listeners = chromeMock.runtime.onMessage.addListener.mock.calls.map(([fn]) => fn);
    const sendResponse = jest.fn();

    const returnValue = listeners[0]({ type: 'OPEN_OPTIONS' }, {}, sendResponse);

    expect(returnValue).toBe(false);
  });
});
