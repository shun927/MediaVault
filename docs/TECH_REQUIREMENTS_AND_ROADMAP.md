# MediaVault 技術要件

現在の標準構成はCloudflare Workers + D1 + Accessです。旧環境のmigrationは削除済みで、既存データの移行にはSettingsのexport v1 JSONと変換コマンドを使用します。

## 実行基盤

- Next.js 16をOpenNextでCloudflare Workersへ変換
- D1 binding名は`DB`
- Cloudflare AccessのGoogle IdPとAllow policyで利用者を限定
- WorkerでもAccess JWTの署名・issuer・audienceを検証
- owner IDはJWTのsubからのみ決定
- 画像アップロードを追加するまではR2を使用しない

## データ

D1 migrationは`d1/migrations`にあります。UUIDはTEXT、日時はISO 8601 TEXT、booleanを追加する場合はINTEGERで保存します。外部キー、cascade、unique、owner別indexを維持してください。

ブラウザからD1へ直接接続せず、`src/app/api`の認証済みRoute Handlerと`src/lib/d1`のRepositoryを経由します。複数テーブル更新はD1 batchで実行します。

## セットアップ・移行・運用

コマンド、Cloudflare Access設定、export v1移行、D1メトリクス、テスト手順はプロジェクトルートのREADMEを参照してください。
