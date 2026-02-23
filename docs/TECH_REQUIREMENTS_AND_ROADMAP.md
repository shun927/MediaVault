# 技術要件・ロードマップ

このファイルは、README から技術要件と今後計画を分離したものです。

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) |
| スタイリング | Tailwind CSS v4 |
| データベース / 認証 | Supabase (PostgreSQL + Google OAuth) |
| 外部 API | TMDB / 楽天ブックス |
| ホスティング | Vercel |

## セットアップ

### 前提条件

- Node.js 18 以上
- Supabase アカウント
- TMDB API キー
- 楽天ウェブサービス アプリ ID / アクセスキー（[こちら](https://webservice.rakuten.co.jp/)で取得）

### 環境変数

`.env.local` を作成し、以下を設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
TMDB_API_KEY=your_tmdb_api_key
RAKUTEN_APP_ID=your_rakuten_app_id
RAKUTEN_ACCESS_KEY=your_rakuten_access_key
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
# Optional (for deployed environments)
# RAKUTEN_ALLOWED_ORIGIN=https://your-app-domain.vercel.app
# RAKUTEN_ALLOWED_REFERRER=https://your-app-domain.vercel.app/
# SPOTIFY_MARKET=JP
```

### Supabase / OAuth 設定

1. `Authentication > Providers > Google` を有効化
2. Google Cloud Console で OAuth クライアントを作成
3. Supabase の `Site URL` を設定（例: `http://localhost:3000`）
4. `Redirect URLs` にコールバック URL を追加（例: `http://localhost:3000/auth/callback`）

本番環境では Vercel のドメインを `Site URL` / `Redirect URLs` に追加してください。

## 開発コマンド

```bash
npm run dev    # 開発サーバー起動
npm run build  # 本番ビルド
npm run start  # 本番サーバー起動
```

## DB マイグレーション手順（統一）

Supabase SQL Editor で、以下をこの順番で実行します。

1. `supabase/migration.sql`（ベース）
2. `supabase_tv_migration.sql`（TV拡張）
3. `supabase_music_migration.sql`（Music拡張）

運用ルール:
- すべて冪等（`IF NOT EXISTS`）前提のため、再実行可能です。
- 追加マイグレーションは番号/順序を保って末尾に積みます。
- 実行後は `README.md` の手順と同じ内容になっていることを確認します。

## DB テーブル構成

| テーブル | 説明 |
|---|---|
| **profiles** | ユーザー情報（display_name, avatar_url） |
| **movies** | 映画・TV の記録（tmdb_id, title, poster_url, director, year, overview, rating, status, note, watched_at, media_type, number_of_seasons, number_of_episodes, watched_episode） |
| **books** | 本の記録（google_books_id, title, cover_url, author, year, description, rating, status, note, read_at） |
| **tags** | タグマスタ（name, color） |
| **movie_tags** | movies ↔ tags 中間テーブル |
| **book_tags** | books ↔ tags 中間テーブル |
| **viewing_history** | 再鑑賞ログ（movie_id, watched_at, note） |
| **reading_history** | 再読ログ（book_id, read_at, note） |
| **music** | *（Phase 2）* 音楽の記録（spotify_id, title, artwork_url, artist, year, type, rating, status, note, listened_at） |

## UI の現状

- [x] Home / Films / Books / Search の上部バー高さを統一
- [x] Search から追加するモーダルの配色をテーマ変数対応
- [x] 作品カードは「画像上に文字を重ねない」表示に変更（可読性優先）
- [x] サイドバーに `Search` 導線を追加
- [x] Settings からテーマ切替（`Dark` / `Monochrome` / `Cobalt`）
- [x] テーマは `localStorage(mv-theme)` で保持

### テーマ仕様（実装）

- ルート要素に `data-theme` を付与して CSS Variables を切替
- 主要色は `src/app/globals.css` の変数で管理
- UI コンポーネント（Button / Card / Input / Select / Modal）は変数参照

## カスタマイズ

### 書籍検索 API の切り替え

書籍検索はデフォルトで **楽天ブックス書籍検索 API** を使用しています。
別の API（Google Books 等）に切り替えたい場合:

1. `src/app/api/search/books/route.ts` を編集してエンドポイント・パラメータ・レスポンス変換を変更
2. レスポンスは `BookSearchResult` 型（`src/lib/types.ts`）に正規化して返してください
3. `.env.local` に該当 API のキーを追加

`BookSearchResult` 型に合わせてレスポンスを返せば、フロントエンド側のコード変更は不要です。

### 楽天Books API メモ（OpenAPI）

このプロジェクトの楽天連携は `openapi.rakuten.co.jp` を利用しています。

- 必須環境変数: `RAKUTEN_APP_ID`, `RAKUTEN_ACCESS_KEY`
- 推奨環境変数（デプロイ時）: `RAKUTEN_ALLOWED_ORIGIN`, `RAKUTEN_ALLOWED_REFERRER`
- 楽天管理画面の「許可されたWebサイト」は、実際にアクセスするドメインを登録してください（例: `media-vault-rose.vercel.app`）
- `localhost` で実行時に `Authentication service error` が出る場合は、`.env.local` に以下を設定すると動作確認できます:

```env
RAKUTEN_ALLOWED_ORIGIN=https://media-vault-rose.vercel.app
RAKUTEN_ALLOWED_REFERRER=https://media-vault-rose.vercel.app/
```

### Spotify API メモ（OAuth2.0）

このプロジェクトの Spotify 連携は **OAuth2 Client Credentials** フローを使用します。

- 必須環境変数: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`
- 任意環境変数: `SPOTIFY_MARKET`（例: `JP`, `US`）
- 実装: `src/app/api/search/music/route.ts`
- 検索対象: `track`, `album`

レスポンスは `SpotifySearchResult` 型（`src/lib/types.ts`）に正規化して返します。

### ISBN バーコード読み取り（実装メモ）

- 実装箇所: `src/app/(app)/search/page.tsx`
- 動作: Books タブで `Scan ISBN` を押すとカメラ起動し、ISBN（EAN-13 など）を検出して自動検索
- 技術: `navigator.mediaDevices.getUserMedia` + `BarcodeDetector`
- 制約: `BarcodeDetector` 非対応ブラウザでは手入力検索にフォールバック
- 備考: カメラ利用のため、本番環境では HTTPS が必要（`localhost` は例外）

```ts
// src/lib/types.ts
export interface BookSearchResult {
    id: string;           // isbn や API 固有の ID
    title: string;
    author: string | null;
    publishedDate: string | null;
    description: string | null;
    thumbnail: string | null;
    isbn: string | null;
    publisher: string | null;
}
```

## ロードマップ

### Phase 2

- **Spotify API 連携**: OAuth2.0 による曲・アルバム検索（完了）
- **年表（タイムライン）ビュー**: 鑑賞日ベースの横スクロール「自分カルチャー史」
- **ISBN バーコード読み取り**: カメラで本のバーコードをスキャンして検索（完了）
- **Web Share Target API**: 他アプリから共有を受け取って記録に追加
- **作品クロスリンク**: 関連作品を紐付けてジャンプできる機能

### Phase 3

- **AI コンシェルジュ**: 自分の記録データを元に未視聴作品をレコメンド

## 今後やること（Roadmap）

### 直近タスク

- [ ] 作品カードの情報量を調整（例: タイトル + 年のみ）
- [ ] 編集・削除導線を再設計（カード内ホバー表示の代替）
- [ ] テーマ切替時のスクリーンショットを README に追加

### 中期タスク（Phase 2 / 3）

- [x] Spotify API 連携
- [x] ISBN バーコード読み取り
- [ ] TimelineのUIを検討
- [ ] Web Share Target API
- [ ] 作品クロスリンク
- [ ] AI コンシェルジュ
