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

## 技術スタック

| レイヤー | 技術 |
|---|---|
| フロントエンド | Next.js 16 (App Router) |
| スタイリング | Tailwind CSS v4 |
| データベース / 認証 | Supabase (PostgreSQL + Google OAuth) |
| 外部 API | TMDB / 楽天ブックス |
| ホスティング | Vercel |

## 機能

### Phase 1 (MVP)

- **認証**: Google OAuth によるログイン
- **作品検索**: TMDB（映画・TV・アニメ）/ 楽天ブックス（本）の API から検索・選択
- **TV / アニメ対応**: 映画と TV を統合検索し、メディアタイプバッジ（Film / TV）で区別。シーズン・エピソード数の表示、視聴進捗バーで追跡
- **記録管理**: 作品の追加・編集・削除
- **評価・感想**: 5段階評価 + テキストメモ
- **ステータス管理**: 鑑賞済み / 視聴中 / ウィッシュリスト
- **タグ付け**: 自由にタグを作成・色分け・付与
- **検索・フィルター**: タイトル / 評価 / ステータス / タグで絞り込み
- **再鑑賞・再読の記録**: 日付とメモ付きで鑑賞・読書履歴を蓄積
- **エクスポート / インポート**: JSON 形式でバックアップ・復元
- **PWA 対応**: スマホにインストール可能

### Phase 2

- **Spotify API 連携**: OAuth2.0 による曲・アルバム検索
- **年表（タイムライン）ビュー**: 鑑賞日ベースの横スクロール「自分カルチャー史」
- **ISBN バーコード読み取り**: カメラで本のバーコードをスキャンして検索
- **Web Share Target API**: 他アプリから共有を受け取って記録に追加
- **作品クロスリンク**: 関連作品を紐付けてジャンプできる機能

### Phase 3

- **AI コンシェルジュ**: 自分の記録データを元に未視聴作品をレコメンド

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
# Optional (for deployed environments)
# RAKUTEN_ALLOWED_ORIGIN=https://your-app-domain.vercel.app
# RAKUTEN_ALLOWED_REFERRER=https://your-app-domain.vercel.app/
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

## スクリーンショット

UI が確定次第、ここに画像を追加します。

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
