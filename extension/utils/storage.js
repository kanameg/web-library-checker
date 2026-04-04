/**
 * Chrome Storage ユーティリティ
 */

/**
 * 設定を取得する
 * @returns {Promise<{calil_api_key: string, libraries: Array}>}
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
