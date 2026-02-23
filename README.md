# MediaVault

映画・TV番組・本・音楽の鑑賞記録を管理する Web アプリケーションです。

## Quick Start

```bash
git clone https://github.com/shun927/MediaVault.git
cd MediaVault
npm install
npm run dev
```

`http://localhost:3000` にアクセスしてください。

## 機能

### Phase 1 (MVP)

- **認証**: Google OAuth によるログイン
- **作品検索**: TMDB（映画・TV・アニメ）/ 楽天ブックス（本）の API から検索・選択
- **音楽検索（Phase 2）**: Spotify API（OAuth2 Client Credentials）で曲・アルバム検索
- **ISBN バーコード読み取り**: Books タブでカメラを使って ISBN バーコードを読み取り、そのまま書籍検索
- **TV / アニメ対応**: 映画と TV を統合検索し、メディアタイプバッジ（Film / TV）で区別。シーズン・エピソード数の表示、視聴進捗バーで追跡
- **記録管理**: 作品の追加・編集・削除
- **評価・感想**: 5段階評価 + テキストメモ
- **ステータス管理**: 鑑賞済み / 視聴中 / ウィッシュリスト
- **タグ付け**: 自由にタグを作成・色分け・付与
- **検索・フィルター**: タイトル / 評価 / ステータス / タグで絞り込み
- **再鑑賞・再読の記録**: 日付とメモ付きで鑑賞・読書履歴を蓄積
- **エクスポート / インポート**: JSON 形式でバックアップ・復元
- **PWA 対応**: スマホにインストール可能

## スクリーンショット

UI が確定次第、ここに画像を追加します。

## ドキュメント

- 技術要件 / セットアップ / DB テーブル構成 / カスタマイズ / ロードマップ:
  `docs/TECH_REQUIREMENTS_AND_ROADMAP.md`

## 環境変数メモ（楽天Books）

楽天Books検索（`src/app/api/search/books/route.ts`）では、楽天側の「許可されたWebサイト」設定に合わせるため、リクエストの `Origin` / `Referer` ヘッダーを明示します。

- 必須: `RAKUTEN_APP_ID`, `RAKUTEN_ACCESS_KEY`
- 任意（本番推奨）: `RAKUTEN_ALLOWED_ORIGIN`, `RAKUTEN_ALLOWED_REFERRER`

## DB Migration (Unified Procedure)

DB マイグレーションは、Supabase SQL Editor で以下の順番で実行します。

1. `supabase/migration.sql`（ベーススキーマ）
2. `supabase_tv_migration.sql`（TV/episode 拡張）
3. `supabase_music_migration.sql`（music/listening_history 拡張）

注意:
- すべて冪等（`IF NOT EXISTS` ベース）なので、再実行しても壊れない前提です。
- 新しいマイグレーションを追加する場合は、上記の順序を崩さずに末尾へ追記してください。

## ISBN バーコード読み取りの注意

- 実装はブラウザの `BarcodeDetector` と `getUserMedia` を利用しています。
- 主に Chromium 系ブラウザ（Chrome / Edge）で動作します。
- 未対応ブラウザでは手入力検索をご利用ください。
- 本番環境でカメラを使うには HTTPS が必要です（`localhost` は例外）。
