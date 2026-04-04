# Changelog

このプロジェクトの変更履歴は [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/) 形式で記録しています。
バージョニングは [Semantic Versioning](https://semver.org/lang/ja/) に従います。

## [Unreleased]

## [1.0.0] - 2026-04-04

### Added

- Amazon・楽天ブックス・ヨドバシ・honto・hontoなど主要書籍サイトのページ上に蔵書確認ウィジェットを表示
- カーリル API を利用した全国7,400館以上の図書館蔵書検索機能
- ISBN を書籍ページから自動取得してリアルタイム蔵書状況を確認
- ポップアップから複数の図書館を登録・管理できる設定機能
- 蔵書状況（貸出可・貸出中・蔵書なし等）をわかりやすいバッジで表示
- 図書館ごとの蔵書状況をウィジェット上に一覧表示
- 設定ページでのカーリル APIキー入力・保存機能
- カーリル API のキーワード検索による図書館名検索機能
- Jest による139件のユニットテスト（カバレッジレポート対応）
- GitHub Actions による CI/CD（Node.js 20.x / 22.x マトリクステスト）
- Chrome Web Store 提出用パッケージングスクリプト（`npm run package`）

[Unreleased]: https://github.com/kanameg/web-library-checker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/kanameg/web-library-checker/releases/tag/v1.0.0
