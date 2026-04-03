/**
 * Tests for calil.js API functions:
 * parseResponse, fetchWithRetry, checkLibrary, checkLibraries, searchLibraries
 */

const vm = require('vm');
const fs = require('fs');
const path = require('path');

function buildCalilContext(fetchMock) {
  const sleepDurations = [];
  const logs = { log: [], error: [] };
  const code = fs.readFileSync(path.resolve(__dirname, '../extension/api/calil.js'), 'utf8');
  const ctx = vm.createContext({
    fetch: fetchMock || jest.fn(),
    console: {
      log: (...args) => logs.log.push(args.join(' ')),
      error: (...args) => logs.error.push(args.join(' ')),
    },
    setTimeout: (fn, ms) => {
      sleepDurations.push(ms);
      fn();
    },
    Promise: global.Promise,
    URLSearchParams: global.URLSearchParams,
    Error: global.Error,
    JSON: global.JSON,
    Object: global.Object,
    Math: global.Math,
  });
  vm.runInContext(code, ctx);
  return { ctx, sleepDurations, logs };
}

function makeResponse(data, ok = true) {
  return {
    ok,
    status: ok ? 200 : 400,
    text: () => Promise.resolve(typeof data === 'string' ? data : JSON.stringify(data)),
  };
}

// ---------------------------------------------------------------------------
// parseResponse
// ---------------------------------------------------------------------------

describe('parseResponse', () => {
  let ctx;

  beforeEach(() => {
    ({ ctx } = buildCalilContext());
  });

  test('parses plain JSON object', async () => {
    const resp = makeResponse('{"continue":0}');
    const result = await ctx.parseResponse(resp);
    expect(result).toEqual({ continue: 0 });
  });

  test('parses JSONP-wrapped object', async () => {
    const resp = makeResponse('callback({"continue":0})');
    const result = await ctx.parseResponse(resp);
    expect(result).toEqual({ continue: 0 });
  });

  test('parses JSONP with semicolon', async () => {
    const resp = makeResponse('cb({"k":"v"});');
    const result = await ctx.parseResponse(resp);
    expect(result).toEqual({ k: 'v' });
  });

  test('parses JSONP with trailing whitespace', async () => {
    const resp = makeResponse('callback({"continue":0})   ');
    const result = await ctx.parseResponse(resp);
    expect(result).toEqual({ continue: 0 });
  });

  test('parses plain JSON array', async () => {
    const resp = makeResponse('[{"systemid":"Tokyo"}]');
    const result = await ctx.parseResponse(resp);
    expect(result).toEqual([{ systemid: 'Tokyo' }]);
  });

  test('parses JSONP-wrapped array', async () => {
    const resp = makeResponse('callback([{"systemid":"Tokyo"}])');
    const result = await ctx.parseResponse(resp);
    expect(result).toEqual([{ systemid: 'Tokyo' }]);
  });

  test('throws Error for completely invalid string', async () => {
    const resp = makeResponse('not valid');
    await expect(ctx.parseResponse(resp)).rejects.toThrow('Invalid response format from Calil API');
  });
});

// ---------------------------------------------------------------------------
// fetchWithRetry
// ---------------------------------------------------------------------------

describe('fetchWithRetry', () => {
  test('successful fetch on first try returns response, fetch called once', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeResponse({ continue: 0 }));
    const { ctx } = buildCalilContext(fetchMock);
    const resp = await ctx.fetchWithRetry('https://example.com/api');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(resp.ok).toBe(true);
  });

  test('fails once then succeeds, fetch called twice', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue(makeResponse({ continue: 0 }));
    const { ctx } = buildCalilContext(fetchMock);
    const resp = await ctx.fetchWithRetry('https://example.com/api');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(resp.ok).toBe(true);
  });

  test('fails three times then succeeds, fetch called four times', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockResolvedValue(makeResponse({ continue: 0 }));
    const { ctx } = buildCalilContext(fetchMock);
    const resp = await ctx.fetchWithRetry('https://example.com/api');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(resp.ok).toBe(true);
  });

  test('fails four times, throws error and fetch called four times (3 retries)', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockRejectedValueOnce(new Error('fail 3'))
      .mockRejectedValueOnce(new Error('fail 4'));
    const { ctx } = buildCalilContext(fetchMock);
    await expect(ctx.fetchWithRetry('https://example.com/api')).rejects.toThrow('fail 4');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  test('response.ok === false (status 400) throws HTTP error', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValue(makeResponse('Bad Request', false));
    const { ctx } = buildCalilContext(fetchMock);
    await expect(ctx.fetchWithRetry('https://example.com/api')).rejects.toThrow('HTTP error: 400');
  });

  test('sleep durations follow exponential backoff: 1000ms then 2000ms', async () => {
    const fetchMock = jest.fn()
      .mockRejectedValueOnce(new Error('fail 1'))
      .mockRejectedValueOnce(new Error('fail 2'))
      .mockResolvedValue(makeResponse({ continue: 0 }));
    const { ctx, sleepDurations } = buildCalilContext(fetchMock);
    await ctx.fetchWithRetry('https://example.com/api');
    // First retry: Math.pow(2, 0) * 1000 = 1000ms
    // Second retry: Math.pow(2, 1) * 1000 = 2000ms
    expect(sleepDurations).toEqual([1000, 2000]);
  });

});

// ---------------------------------------------------------------------------
// checkLibrary
// ---------------------------------------------------------------------------

describe('checkLibrary', () => {
  const appkey = 'test_api_key';
  const isbn = '9784873117386';
  const systemid = 'Tokyo_Pref';

  function makeCheckResponse(continueFlag, bookData, session = 'sess123') {
    const books = { [isbn]: { [systemid]: bookData } };
    return makeResponse({ continue: continueFlag, session, books });
  }

  test('continue=0 on first response returns books[isbn][systemid] without polling', async () => {
    const bookData = { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' };
    const fetchMock = jest.fn()
      .mockResolvedValue(makeCheckResponse(0, bookData));
    const { ctx, logs } = buildCalilContext(fetchMock);

    const result = await ctx.checkLibrary(appkey, isbn, systemid);

    expect(result).toEqual(bookData);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // No polling log expected
    expect(logs.log.some(l => l.includes('[Calil] POLLING '))).toBe(false);
  });

  test('continue=1 then continue=0 results in 1 poll and returns result', async () => {
    const bookData = { status: 'OK', libkey: { '多摩': '貸出中' }, reserveurl: '' };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeCheckResponse(1, null))
      .mockResolvedValueOnce(makeCheckResponse(0, bookData));
    const { ctx } = buildCalilContext(fetchMock);

    const result = await ctx.checkLibrary(appkey, isbn, systemid);

    expect(result).toEqual(bookData);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  test('10 polls then continue=0 returns result (boundary condition)', async () => {
    const bookData = { status: 'OK', libkey: { '中央': '館内のみ' }, reserveurl: '' };
    // Initial response with continue=1, then 9 more with continue=1, then final with 0
    const fetchMock = jest.fn();
    // First call (initial request)
    fetchMock.mockResolvedValueOnce(makeCheckResponse(1, null));
    // Polls 1-9: continue=1
    for (let i = 0; i < 9; i++) {
      fetchMock.mockResolvedValueOnce(makeCheckResponse(1, null));
    }
    // Poll 10: continue=0
    fetchMock.mockResolvedValueOnce(makeCheckResponse(0, bookData));

    const { ctx } = buildCalilContext(fetchMock);
    const result = await ctx.checkLibrary(appkey, isbn, systemid);

    expect(result).toEqual(bookData);
    expect(fetchMock).toHaveBeenCalledTimes(11); // 1 initial + 10 polls
  });

  test('11 consecutive continue=1 throws polling_timeout', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeCheckResponse(1, null));
    const { ctx } = buildCalilContext(fetchMock);

    await expect(ctx.checkLibrary(appkey, isbn, systemid)).rejects.toThrow('polling_timeout');
    // 1 initial + 10 polls (MAX_POLL_COUNT = 10)
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  test('books[isbn][systemid] missing returns null', async () => {
    const fetchMock = jest.fn().mockResolvedValue(
      makeResponse({ continue: 0, session: 'sess', books: {} })
    );
    const { ctx } = buildCalilContext(fetchMock);

    const result = await ctx.checkLibrary(appkey, isbn, systemid);
    expect(result).toBeNull();
  });

  test('poll request URL contains session parameter', async () => {
    const bookData = { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' };
    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeCheckResponse(1, null, 'my_session_id'))
      .mockResolvedValueOnce(makeCheckResponse(0, bookData, 'my_session_id'));
    const { ctx } = buildCalilContext(fetchMock);

    await ctx.checkLibrary(appkey, isbn, systemid);

    // Second call should include session=my_session_id
    const pollUrl = fetchMock.mock.calls[1][0];
    expect(pollUrl).toContain('session=my_session_id');
  });

});

// ---------------------------------------------------------------------------
// checkLibraries
// ---------------------------------------------------------------------------

describe('checkLibraries', () => {
  const appkey = 'test_api_key';
  const isbn = '9784873117386';

  function makeLibraryResultResponse(systemid, bookData) {
    return makeResponse({
      continue: 0,
      session: 'sess',
      books: { [isbn]: { [systemid]: bookData } },
    });
  }

  test('all succeed: returns array with error: null for all', async () => {
    const libraries = [
      { systemid: 'Tokyo_Pref', name: '東京都立図書館' },
      { systemid: 'Osaka_Pref', name: '大阪府立図書館' },
    ];
    const tokyoData = { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' };
    const osakaData = { status: 'OK', libkey: { '中央': '貸出中' }, reserveurl: '' };

    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeLibraryResultResponse('Tokyo_Pref', tokyoData))
      .mockResolvedValueOnce(makeLibraryResultResponse('Osaka_Pref', osakaData));
    const { ctx } = buildCalilContext(fetchMock);

    const results = await ctx.checkLibraries(appkey, isbn, libraries);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({ library: libraries[0], result: tokyoData, error: null });
    expect(results[1]).toEqual({ library: libraries[1], result: osakaData, error: null });
  });

  test('one fails: that entry has error set, others are normal', async () => {
    const libraries = [
      { systemid: 'Tokyo_Pref', name: '東京都立図書館' },
      { systemid: 'Osaka_Pref', name: '大阪府立図書館' },
    ];
    const osakaData = { status: 'OK', libkey: { '中央': '貸出可' }, reserveurl: '' };

    // checkLibraries は並列実行するため、URLでモックを分岐して呼び出し順に依存しないようにする
    const fetchMock = jest.fn().mockImplementation((url) => {
      if (url.includes('Tokyo_Pref')) {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve({
        ok: true,
        text: () => Promise.resolve(JSON.stringify({
          continue: 0,
          session: '',
          books: { [isbn]: { Osaka_Pref: osakaData } },
        })),
      });
    });
    const { ctx } = buildCalilContext(fetchMock);

    const results = await ctx.checkLibraries(appkey, isbn, libraries);

    expect(results).toHaveLength(2);
    expect(results[0].error).toBeTruthy();   // Tokyo: 失敗
    expect(results[0].result).toBeNull();
    expect(results[1].error).toBeNull();      // Osaka: 成功
    expect(results[1].result).toEqual(osakaData);
  });

  test('all fail: all have error set, no throw', async () => {
    const libraries = [
      { systemid: 'Tokyo_Pref', name: '東京都立図書館' },
      { systemid: 'Osaka_Pref', name: '大阪府立図書館' },
    ];

    const fetchMock = jest.fn().mockRejectedValue(new Error('all fail'));
    const { ctx } = buildCalilContext(fetchMock);

    // Should not throw
    const results = await ctx.checkLibraries(appkey, isbn, libraries);

    expect(results).toHaveLength(2);
    expect(results[0].error).toBeTruthy();
    expect(results[1].error).toBeTruthy();
  });

  test('empty libraries array returns []', async () => {
    const fetchMock = jest.fn();
    const { ctx } = buildCalilContext(fetchMock);

    const results = await ctx.checkLibraries(appkey, isbn, []);

    expect(results).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('results order matches input order', async () => {
    const libraries = [
      { systemid: 'Alpha_Lib', name: 'Alpha Library' },
      { systemid: 'Beta_Lib', name: 'Beta Library' },
      { systemid: 'Gamma_Lib', name: 'Gamma Library' },
    ];
    const makeData = (id) => ({ status: 'OK', libkey: { [id]: '貸出可' }, reserveurl: '' });

    const fetchMock = jest.fn()
      .mockResolvedValueOnce(makeResponse({
        continue: 0, session: 's', books: { [isbn]: { 'Alpha_Lib': makeData('Alpha_Lib') } },
      }))
      .mockResolvedValueOnce(makeResponse({
        continue: 0, session: 's', books: { [isbn]: { 'Beta_Lib': makeData('Beta_Lib') } },
      }))
      .mockResolvedValueOnce(makeResponse({
        continue: 0, session: 's', books: { [isbn]: { 'Gamma_Lib': makeData('Gamma_Lib') } },
      }));
    const { ctx } = buildCalilContext(fetchMock);

    const results = await ctx.checkLibraries(appkey, isbn, libraries);

    expect(results[0].library.systemid).toBe('Alpha_Lib');
    expect(results[1].library.systemid).toBe('Beta_Lib');
    expect(results[2].library.systemid).toBe('Gamma_Lib');
  });
});

// ---------------------------------------------------------------------------
// searchLibraries
// ---------------------------------------------------------------------------

describe('searchLibraries', () => {
  const appkey = 'test_api_key';

  test('JSON array response returns array', async () => {
    const data = [{ systemid: 'Tokyo_Pref', name: '東京都立図書館' }];
    const fetchMock = jest.fn().mockResolvedValue(makeResponse(data));
    const { ctx } = buildCalilContext(fetchMock);

    const result = await ctx.searchLibraries(appkey, '東京都');

    expect(result).toEqual(data);
  });

  test('JSONP array response returns array', async () => {
    const data = [{ systemid: 'Tokyo_Pref', name: '東京都立図書館' }];
    const fetchMock = jest.fn().mockResolvedValue(
      makeResponse(`callback(${JSON.stringify(data)})`)
    );
    const { ctx } = buildCalilContext(fetchMock);

    const result = await ctx.searchLibraries(appkey, '東京都');

    expect(result).toEqual(data);
  });

  test('non-array response returns []', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeResponse({ error: 'not found' }));
    const { ctx } = buildCalilContext(fetchMock);

    const result = await ctx.searchLibraries(appkey, '東京都');

    expect(result).toEqual([]);
  });

  test('without city, URL does not contain city param', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeResponse([]));
    const { ctx } = buildCalilContext(fetchMock);

    await ctx.searchLibraries(appkey, '東京都');

    const url = fetchMock.mock.calls[0][0];
    expect(url).not.toContain('city=');
  });

  test('with city, URL contains city parameter', async () => {
    const fetchMock = jest.fn().mockResolvedValue(makeResponse([]));
    const { ctx } = buildCalilContext(fetchMock);

    await ctx.searchLibraries(appkey, '東京都', '渋谷区');

    const url = fetchMock.mock.calls[0][0];
    expect(url).toContain('city=');
    expect(decodeURIComponent(url)).toContain('city=渋谷区');
  });

});
