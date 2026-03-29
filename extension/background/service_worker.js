/**
 * バックグラウンドサービスワーカー
 * - APIキーを安全に管理し、コンテンツスクリプトからのリクエストを処理する
 */

importScripts('../api/calil.js');

/**
 * メッセージハンドラ
 */
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CHECK_LIBRARY') {
    handleCheckLibrary(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // 非同期レスポンスのため true を返す
  }

  if (message.type === 'SEARCH_LIBRARIES') {
    handleSearchLibraries(message.payload)
      .then(result => sendResponse({ success: true, data: result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'GET_SETTINGS') {
    getSettings()
      .then(settings => sendResponse({ success: true, data: settings }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'OPEN_OPTIONS') {
    chrome.runtime.openOptionsPage();
    return false;
  }
});

/**
 * 蔵書確認処理
 */
async function handleCheckLibrary({ isbn, libraries }) {
  const settings = await getSettings();
  if (!settings.calil_api_key) {
    throw new Error('api_key_not_set');
  }
  const libs = libraries || settings.libraries || [];
  if (libs.length === 0) {
    throw new Error('no_libraries_set');
  }
  return await checkLibraries(settings.calil_api_key, isbn, libs);
}

/**
 * 図書館検索処理
 */
async function handleSearchLibraries({ pref, city, appkey }) {
  const key = appkey || (await getSettings()).calil_api_key;
  if (!key) throw new Error('api_key_not_set');
  return await searchLibraries(key, pref, city);
}

/**
 * 設定取得
 */
function getSettings() {
  return new Promise((resolve, reject) => {
    chrome.storage.sync.get(['calil_api_key', 'libraries'], (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve({
          calil_api_key: result.calil_api_key || '',
          libraries: result.libraries || [],
        });
      }
    });
  });
}
