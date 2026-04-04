/**
 * 貸出ステータス ユーティリティ
 */

/**
 * ステータス文字列に対応する CSS クラス名を返す
 * @param {string} status - カーリルAPIのステータス文字列
 * @returns {string} CSS クラス名
 */
function getStatusClass(status) {
  if (status === '貸出可') return 'available';
  if (status === '貸出中') return 'on-loan';
  if (status === '休館中') return 'none';
  if (status === '蔵書なし') return 'none';
  return 'other';
}
