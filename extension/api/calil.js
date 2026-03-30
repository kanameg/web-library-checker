/**
 * カーリル図書館API モジュール
 * サービスワーカー側で使用する
 */

const CALIL_API_BASE = 'https://api.calil.jp';
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_COUNT = 10;
const MAX_RETRY_COUNT = 3;

/**
 * 指定ミリ秒待機
 * @param {number} ms
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * レスポンスを JSON または JSONP としてパース
 * カーリルAPIは format=json 指定でも JSONP を返すことがある
 * @param {Response} response
 * @returns {Promise<any>}
 */
async function parseResponse(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/^[^(]+\(([\s\S]*)\)\s*;?\s*$/);
    if (!match) throw new Error('Invalid response format from Calil API');
    return JSON.parse(match[1]);
  }
}

/**
 * exponential backoff 付きfetch
 * @param {string} url
 * @param {number} retryCount
 * @returns {Promise<Response>}
 */
async function fetchWithRetry(url, retryCount = 0) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }
    return response;
  } catch (err) {
    console.error('[Calil] ERROR  ', err.message, url);
    if (retryCount < MAX_RETRY_COUNT) {
      const waitMs = Math.pow(2, retryCount) * 1000;
      await sleep(waitMs);
      return fetchWithRetry(url, retryCount + 1);
    }
    throw err;
  }
}

/**
 * 蔵書状況を検索する（ポーリング込み）
 * @param {string} appkey - カーリルAPIキー
 * @param {string} isbn - ISBN-13
 * @param {string} systemid - 図書館システムID
 * @returns {Promise<Object>} レスポンスのbooks[isbn][systemid]
 */
async function checkLibrary(appkey, isbn, systemid) {
  const params = new URLSearchParams({
    appkey,
    isbn,
    systemid,
    format: 'json',
  });

  const url = `${CALIL_API_BASE}/check?${params}`;
  console.log('[Calil] REQUEST ', url);
  let response = await fetchWithRetry(url);
  let data = await parseResponse(response);
  console.log('[Calil] RESPONSE', '/check', JSON.stringify(data));

  let pollCount = 0;
  while (data.continue === 1 && pollCount < MAX_POLL_COUNT) {
    await sleep(POLL_INTERVAL_MS);
    pollCount++;
    const pollParams = new URLSearchParams({
      appkey,
      session: data.session,
      format: 'json',
    });
    console.log('[Calil] POLLING ', `session=${data.session} attempt=${pollCount}`);
    response = await fetchWithRetry(`${CALIL_API_BASE}/check?${pollParams}`);
    data = await parseResponse(response);
    console.log('[Calil] POLLING RESPONSE', JSON.stringify(data));
  }

  if (data.continue === 1) {
    throw new Error('polling_timeout');
  }

  const bookData = data.books?.[isbn]?.[systemid];
  return bookData || null;
}

/**
 * 複数図書館の蔵書状況を一括取得
 * @param {string} appkey
 * @param {string} isbn
 * @param {Array<{systemid: string, name: string}>} libraries
 * @returns {Promise<Array<{library: Object, result: Object|null, error: string|null}>>}
 */
async function checkLibraries(appkey, isbn, libraries) {
  const results = await Promise.allSettled(
    libraries.map(lib => checkLibrary(appkey, isbn, lib.systemid))
  );

  return libraries.map((lib, i) => {
    const result = results[i];
    if (result.status === 'fulfilled') {
      return { library: lib, result: result.value, error: null };
    } else {
      return { library: lib, result: null, error: result.reason?.message || 'unknown' };
    }
  });
}

/**
 * 図書館を検索する
 * @param {string} appkey
 * @param {string} pref - 都道府県名
 * @param {string} city - 市区町村名（任意）
 * @returns {Promise<Array>}
 */
async function searchLibraries(appkey, pref, city = '') {
  const params = new URLSearchParams({ appkey, pref, format: 'json' });
  if (city) params.set('city', city);

  const url = `${CALIL_API_BASE}/library?${params}`;
  console.log('[Calil] REQUEST ', url);
  const response = await fetchWithRetry(url);
  const data = await parseResponse(response);
  console.log('[Calil] RESPONSE', '/library', JSON.stringify(data));
  return Array.isArray(data) ? data : [];
}
