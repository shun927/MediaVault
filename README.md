# MediaVault

映画・TV・本・音楽を自分用に記録する、Cloudflare上で動くセルフホスト型Webアプリです。

低頻度の個人利用でも非アクティブ停止を気にせず使えるよう、アプリはCloudflare Workers、データはD1、ログインはCloudflare Access + Google OAuthで構成しています。1つの環境へ複数ユーザーを許可できますが、データはAccess JWTのユーザーIDごとに分離されます。

## 現在の状態

アプリ基盤のCloudflare移行は完了しています。

- Next.js 16をOpenNextでCloudflare Workersへデプロイ済み
- D1 schemaとmigrationを適用済み
- Google OAuthをCloudflare Accessへ接続済み
- 許可メールアドレスだけがログインできるAccess Policyを設定済み
- Worker内でもAccess JWTの署名・issuer・audienceを検証
- CRUD、タグ、履歴、import/exportをD1 Repository経由へ移行
- スマホ向けレイアウト、モーダル、サイドバー、ズーム、タッチ操作を改善
- 認証済みHTMLとAPIレスポンスをService Workerのキャッシュ対象から除外

現在の本番環境には初回ユーザーが作成されていますが、旧環境の作品データはまだimportしていません。旧データが必要な場合は「既存データの移行」を実行してください。

> **OpenNext互換性:** Next.js 16ではproxy.tsが推奨されていますが、最新の@opennextjs/cloudflare 1.20.2はNode.js Proxyをまだデプロイできません。そのため現在はEdge middleware.tsを使用しています。OpenNextがNode.js Proxyへ対応した時点で移行します。

## 構成

- Next.js 16 / React 19
- OpenNext for Cloudflare
- Cloudflare Workers
- Cloudflare D1（SQLite互換）
- Cloudflare Access + Google OAuth
- PWA

ブラウザからD1を直接操作しません。すべてのデータ操作は認証必須のRoute Handlerを通り、`owner_id`には検証済みAccess JWTの`sub`だけを使用します。リクエストから任意のowner IDを指定することはできません。

## ローカル開発

### 1. 依存関係をインストール

```bash
npm install
```

### 2. 開発用変数を作成

macOS / Linux:

```bash
cp .dev.vars.example .dev.vars
```

Windows PowerShell:

```powershell
Copy-Item .dev.vars.example .dev.vars
```

`.dev.vars`の`DEV_AUTH_SUB`と`DEV_AUTH_EMAIL`はローカル開発専用の固定ユーザーです。本番では認証迂回に使用されません。

作品検索を使う場合は、利用するサービスの値だけ設定します。

- `TMDB_API_KEY`: 映画・TV検索
- `RAKUTEN_APP_ID` / `RAKUTEN_ACCESS_KEY`: 書籍検索
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`: 音楽検索
- `SPOTIFY_MARKET`: Spotifyのマーケット。既定値は`JP`

### 3. ローカルD1を初期化して起動

```bash
npm run db:migrate:local
npm run dev
```

通常は `http://localhost:3000` で確認できます。ローカルD1は`.wrangler/`内に作成され、Gitには含まれません。

## 自分のCloudflareへデプロイ

### 1. Wranglerへログイン

```bash
npx wrangler login
```

### 2. D1を作成

```bash
npx wrangler d1 create mediavault
```

表示された`database_id`を`wrangler.jsonc`へ設定します。binding名はアプリが参照する`DB`のまま変更しないでください。

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "mediavault",
    "database_id": "ここを自分のdatabase_idへ変更",
    "migrations_dir": "d1/migrations"
  }
]
```

続いてremote D1へschemaを適用します。

```bash
npm run db:migrate:remote
```

### 3. いったんWorkerをデプロイ

```bash
npm run deploy
```

表示された `https://<worker-name>.<subdomain>.workers.dev` を控えます。

### 4. Google OAuthを作成

Google Cloud Consoleで「ウェブ アプリケーション」のOAuthクライアントを作成します。

- 承認済みのJavaScript生成元: `https://<team-name>.cloudflareaccess.com`
- 承認済みのリダイレクトURI: `https://<team-name>.cloudflareaccess.com/cdn-cgi/access/callback`

発行されたClient IDとClient Secretは公開ファイルへ保存しないでください。

### 5. Cloudflare Accessを設定

Cloudflare Zero Trust Dashboardで次を設定します。

1. `Integrations > Identity providers`でGoogleを追加し、OAuthのClient IDとSecretを登録
2. `Access controls > Applications`でSelf-hosted applicationを作成
3. 宛先としてデプロイしたWorkerを選択
4. Allow PolicyのIncludeを自分のメールアドレスなど、許可するユーザーだけに限定
5. ApplicationのIdentity providerをGoogleだけに限定
6. ログイン方法がGoogleだけならInstant authenticationを有効化
7. ApplicationのAUDとZero Trustのteam domainを控える

一般公開のユーザー登録はありません。各デプロイの管理者がAccess Policyで利用者を管理します。

### 6. Worker secretsを登録

必須:

```bash
npx wrangler secret put TEAM_DOMAIN
npx wrangler secret put POLICY_AUD
```

- `TEAM_DOMAIN`: `https://<team-name>.cloudflareaccess.com`
- `POLICY_AUD`: Access ApplicationのAUD

外部検索を使用する場合だけ追加します。

```bash
npx wrangler secret put TMDB_API_KEY
npx wrangler secret put RAKUTEN_APP_ID
npx wrangler secret put RAKUTEN_ACCESS_KEY
npx wrangler secret put SPOTIFY_CLIENT_ID
npx wrangler secret put SPOTIFY_CLIENT_SECRET
```

最後に再デプロイします。

```bash
npm run deploy
```

Workerへアクセスし、Googleログイン後にDashboardが表示されればセットアップ完了です。初回アクセス時にD1の`users`へユーザーが作成されます。

## 既存データの移行

旧MediaVaultのSettingsからexport v1 JSONを保存し、D1向けに検証・正規化します。

```bash
npm run import:prepare -- old-export.json mediavault-d1-import.json
```

次の順で移行します。

1. 新しいWorkerへGoogleログインしてD1ユーザーを作成
2. Settingsを開く
3. 正規化済みの`mediavault-d1-import.json`をimport
4. 映画・本・音楽・タグ・履歴・評価・日付を確認
5. 新環境からもう一度exportし、旧exportと件数を比較

importはD1 batchで実行します。途中で失敗した場合に一部だけを保存しません。旧環境は移行確認が終わるまで保持し、問題がなければバックアップ後に廃止してください。

## よく使うコマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | Next.js開発サーバーを起動 |
| `npm run preview` | OpenNextのWorkerをローカルプレビュー |
| `npm run deploy` | buildしてCloudflare Workersへデプロイ |
| `npm run deploy:dry` | Worker deployのdry run |
| `npm run db:migrate:local` | ローカルD1へmigrationを適用 |
| `npm run db:migrate:remote` | remote D1へmigrationを適用 |
| `npm run db:export` | remote D1をSQLバックアップ |
| `npm run import:prepare -- input.json output.json` | export v1を検証・正規化 |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript型チェック |
| `npm test` | Vitest |
| `npm run test:e2e` | Playwright E2E |
| `npm run build` | Next.js production build |

## バックアップと運用

remote D1のSQLバックアップ:

```bash
npm run db:export
```

Cloudflare DashboardのD1 MetricsでRows read、Rows written、Storageを定期的に確認してください。個人利用で無料枠を超えた場合は、その時点でWorkers Paidを検討します。

本番ログはWranglerでも確認できます。

```bash
npx wrangler tail
```

## リリース前チェック

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

最低限、320px幅、一般的なスマホ縦画面、スマホ横画面、タブレット幅で横スクロールや操作不能なモーダルがないことも確認してください。

## トラブルシューティング

### Workerへアクセスすると403になる

- Access Policyのメールアドレスを確認
- ApplicationにGoogle IdPが割り当てられているか確認
- `TEAM_DOMAIN`と`POLICY_AUD`を登録し直して再デプロイ
- Access ApplicationのAUDとWorker secretが一致しているか確認

### `no such table`が表示される

対象D1へmigrationが未適用です。

```bash
npm run db:migrate:remote
```

ローカル開発なら`db:migrate:local`を使用します。

### 外部検索だけ失敗する

対応するAPIキーが設定されているか確認します。映画・本・音楽の検索キーはそれぞれ独立しているため、未設定のサービスだけ利用できません。

### ログアウト後も古い画面が見える

最新版を再デプロイしたうえで、古いService Workerが残っている場合はブラウザのサイトデータを一度削除してください。現在のService Workerは認証済みHTMLとAPIレスポンスをキャッシュしません。
