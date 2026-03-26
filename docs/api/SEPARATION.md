# 既存プロジェクトとの分離ルール

このドキュメントは開発チーム全員が理解・遵守すべきルールを定めます。

---

## 絶対に守るルール（触れてはいけないもの）

### ❌ 既存プロジェクトのファイル
既存の `/public` プロジェクト（`felia-home.co.jp` で動いている別サービス）の
ファイルには**一切触れない**。読み取りも変更も禁止。

### ❌ 既存プロジェクトの DB
既存プロジェクトが使っているデータベースには接続しない。
CRM との連携は既存 CRM の REST API のみ経由する。

```typescript
// ✅ OK: CRM の API 経由
const customers = await crmClient.getCustomers();

// ❌ NG: 既存 DB に直接接続
const customers = await existingDb.query("SELECT * FROM customers");
```

### ❌ 既存の .env ファイル
既存プロジェクトの `.env` を参照・変更しない。
このシステムは `.env.local` のみを使用する。

---

## リポジトリ分離

```
# 既存プロジェクト（触らない）
github.com/felia-home/[既存リポジトリ名]

# このシステム（完全に独立）
github.com/felia-home/felia-property-system
```

PR・Issues・GitHub Actions はすべて独立して管理する。

---

## ポート・URL 分離

| 環境 | 既存プロジェクト | このシステム |
|---|---|---|
| ローカル開発 | `:3000`（触らない） | **`:3001`** |
| 本番 | `felia-home.co.jp` | **`admin.felia-home.co.jp`** |

---

## DB 分離

ローカル開発では PostgreSQL のポートを分けて起動する。

```yaml
# docker-compose.yml（このプロジェクト専用）
services:
  db:
    image: postgres:16
    ports:
      - "5433:5432"   # 5433 = このシステム用（既存の 5432 と衝突しない）
    environment:
      POSTGRES_DB: felia_property
      POSTGRES_USER: felia_property
      POSTGRES_PASSWORD: local_dev_password
```

```bash
# DATABASE_URL（.env.local）
DATABASE_URL="postgresql://felia_property:local_dev_password@localhost:5433/felia_property"
```

---

## コードレビューチェックリスト

PR をレビューする際は以下を確認する:

- [ ] 既存プロジェクトのファイルへの変更が含まれていないか
- [ ] `DATABASE_URL` が既存 DB ではなくこのシステム専用 DB を向いているか
- [ ] 環境変数が `.env.local` に定義されており `.env.example` にも追記されているか
- [ ] `CLAUDE.md` に記載のルール（人間確認が必要な操作など）を守っているか
- [ ] 新しい外部 API 連携は `src/lib/` 配下にクライアントを作成しているか
- [ ] 機密情報（APIキー・売主情報）がログ・レスポンスに含まれていないか

---

## よくある質問

**Q: 既存プロジェクトと共通のコンポーネントを使いたい**
A: 現時点では共有しない。将来的に共通ライブラリを npm パッケージとして切り出すことを検討する。

**Q: 既存の顧客データを参照したい**
A: 既存 CRM の API エンドポイントを通じて取得する。`CRM_API_BASE_URL` と `CRM_API_KEY` を使用すること。

**Q: 本番デプロイはどうする？**
A: このシステム専用の GitHub Actions（`.github/workflows/deploy.yml`）を使用する。
   既存プロジェクトのデプロイパイプラインとは完全に独立している。
