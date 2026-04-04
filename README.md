# 図書館蔵書チェッカー

[![CI](https://github.com/kanameg/web-library-checker/actions/workflows/ci.yml/badge.svg)](https://github.com/kanameg/web-library-checker/actions/workflows/ci.yml)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

Amazon.co.jp および楽天ブックスの書籍ページを閲覧中に、図書館の蔵書状況をリアルタイムで確認できる Chrome 拡張機能です。

## 機能

- Amazon.co.jp・楽天ブックスの書籍ページで蔵書状況を自動表示
- カーリル図書館 API 対応（全国 7,400 館以上）
- 貸出可 / 貸出中 / 館内のみ / 蔵書なし のステータスを色分け表示
- 図書館の予約ページへの直リンク
- 最大 5 館まで同時チェック
- セッションキャッシュによる重複 API 呼び出しの防止
- exponential backoff 付きリトライ（最大 3 回）

## インストール

### Chrome Web Store からインストール（一般ユーザー向け）

> 準備中

### ソースからインストール（開発者向け）

1. リポジトリをクローン
   ```bash
   git clone https://github.com/kanameg/web-library-checker.git
   ```
2. Chrome で `chrome://extensions` を開く
3. 右上の「デベロッパーモード」を有効にする
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `extension/` ディレクトリを選択

## 使い方

1. 拡張機能アイコンをクリックして設定画面を開く
2. カーリル API キーを入力して保存する
3. 都道府県・市区町村で図書館を検索し、最大 5 館まで登録する
4. Amazon.co.jp または楽天ブックスの書籍ページを開くと、蔵書状況が自動表示される

### カーリル API キーの取得

[カーリル API ドキュメント](https://calil.jp/doc/api.html) から無料で取得できます。

## 開発者向け情報

### 必要環境

- Node.js 20.x 以上
- npm 10.x 以上

### セットアップ

```bash
npm install
```

### テスト実行

```bash
npm test                 # 全テスト実行
npm run test:coverage    # カバレッジレポート付き
npm run test:watch       # ウォッチモード
```

### パッケージング（Chrome Web Store 提出用）

```bash
npm run package
# dist/library-checker-v1.0.0.zip が生成されます
```

### ディレクトリ構成

```
extension/
├── manifest.json
├── background/       # Service Worker（API 通信・設定管理）
├── content/          # コンテンツスクリプト（書籍ページへのウィジェット挿入）
├── popup/            # ポップアップ UI
├── options/          # 設定ページ
├── api/              # カーリル API クライアント
└── utils/            # 共通ユーティリティ（ISBN・サニタイズ・ステータス・ストレージ）

tests/                # Jest テスト（7 ファイル・139 テスト）
scripts/              # ビルド補助スクリプト
```

## ライセンス

[MIT](LICENSE)
