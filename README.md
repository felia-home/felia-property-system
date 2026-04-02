# フェリアホーム 物件情報管理システム

> **このリポジトリは既存の `/public` プロジェクトとは完全に独立しています。**
> 既存プロジェクトのファイルには一切触れず、DB・環境変数・デプロイも完全分離です。

## システム概要

東京都内（島嶼部除く）の売買物件を一元管理するバックエンド＋管理画面システム。
Claude AI エージェントが物件情報の取込・広告確認・成約検知・マーケティング活用を支援する。

- **URL**: `https://admin.felia-home.co.jp`（既存HP: `https://felia-home.co.jp` とは別）
- **リポジトリ**: `github.com/felia-home/felia-property-system`（既存とは別リポジトリ）
- **DB**: 専用 PostgreSQL（既存DBには接続しない）

---

## 技術スタック

| 用途 | 技術 |
|---|---|
| フロントエンド/API | Next.js 14（App Router） |
| 言語 | TypeScript（strict） |
| ORM / DB | Prisma + PostgreSQL |
| AI | Claude API（Anthropic SDK） |
| ストレージ | AWS S3 |
| 認証 | NextAuth.js（社内限定） |
| 通知 | Slack Webhook |
| CI/CD | GitHub Actions |
| ホスティング | （環境に応じて設定） |

---

## ローカル開発セットアップ

### 1. リポジトリをクローン（既存とは別ディレクトリ）

```bash
# 既存プロジェクトとは別の場所に配置する
cd ~/projects          # 既存が ~/projects/felia-public などにある場合
git clone git@github.com:felia-home/felia-property-system.git
cd felia-property-system
```

### 2. 依存パッケージをインストール

```bash
npm install
```

### 3. 環境変数を設定（既存プロジェクトの .env とは完全に別ファイル）

```bash
cp .env.example .env.local
# .env.local を編集して各値を設定（下記「環境変数」参照）
```

### 4. DBをセットアップ（専用インスタンスを使用）

```bash
# 既存DBには接続しない。専用DBを用意すること。
npm run db:generate   # Prisma クライアント生成
npm run db:migrate    # マイグレーション実行
npm run db:seed       # 初期データ投入（任意）
```

### 5. 開発サーバー起動

```bash
npm run dev
# → http://localhost:3001 で起動（既存の :3000 と衝突しないよう 3001 を使用）
```

---

## ディレクトリ構成

```
felia-property-system/          ← このリポジトリのルート（既存とは完全に別）
├── CLAUDE.md                   ← AI エージェント定義（このプロジェクト専用）
├── README.md
├── .env.example                ← 環境変数テンプレート
├── .env.local                  ← 実際の環境変数（git管理外）
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
│
├── src/
│   ├── agents/                 ← AI エージェント（Phase 1 + 2）
│   │   ├── orchestrator.ts
│   │   ├── document-parser.ts
│   │   ├── ad-approval.ts
│   │   ├── sold-detection.ts
│   │   ├── compliance.ts
│   │   ├── property-copy.ts
│   │   ├── floor-plan-generator.ts
│   │   ├── valuation.ts
│   │   ├── competitor-monitor.ts
│   │   └── matching.ts
│   │
│   ├── app/                    ← Next.js App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx            ← /  → /admin にリダイレクト
│   │   ├── api/
│   │   │   ├── properties/
│   │   │   ├── approvals/
│   │   │   ├── documents/
│   │   │   ├── sold/
│   │   │   └── valuations/
│   │   └── admin/
│   │       ├── layout.tsx      ← 管理画面共通レイアウト
│   │       ├── page.tsx        ← ダッシュボード
│   │       ├── properties/
│   │       ├── approvals/
│   │       └── dashboard/
│   │
│   ├── lib/
│   │   ├── db.ts               ← Prisma クライアント（このシステム専用DB）
│   │   ├── auth.ts             ← NextAuth 設定
│   │   ├── slack.ts
│   │   ├── s3.ts
│   │   ├── pdf-generator.ts
│   │   └── google-calendar.ts
│   │
│   └── types/
│       ├── property.ts
│       ├── approval.ts
│       └── sale.ts
│
├── prisma/
│   ├── schema.prisma           ← このシステム専用スキーマ
│   ├── migrations/
│   └── seed.ts
│
├── templates/
│   └── floor-plans/            ← 販売図面テンプレート
│
├── scripts/
│   ├── setup.sh                ← 初回セットアップスクリプト
│   └── check-env.ts            ← 環境変数チェック
│
├── docs/
│   └── api/                    ← OpenAPI 仕様書
│
└── .github/
    └── workflows/
        ├── ci.yml              ← テスト・lint
        └── deploy.yml          ← 本番デプロイ
```

---

## 環境変数

`.env.local` に以下を設定する。**既存プロジェクトの `.env` とは別ファイル・別値。**

```bash
# ===== このシステム専用 =====
NEXT_PUBLIC_APP_URL=http://localhost:3001

# DB（既存DBとは別インスタンス）
DATABASE_URL="postgresql://user:password@localhost:5433/felia_property?schema=public"

# Claude AI
ANTHROPIC_API_KEY=sk-ant-...

# 認証（管理画面は社内限定）
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=（openssl rand -base64 32 で生成）

# AWS S3（物件写真・PDF）
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=ap-northeast-1
S3_BUCKET_NAME=felia-property-assets

# Slack通知
SLACK_WEBHOOK_URL=
SLACK_CHANNEL_PROPERTY=#property-updates
SLACK_CHANNEL_ALERTS=#property-alerts

# ポータルAPI（取得次第追加）
SUUMO_API_KEY=
ATHOME_API_KEY=
YAHOO_REAL_ESTATE_API_KEY=
HOMES_API_KEY=

# Google Calendar（内見管理）
GOOGLE_CALENDAR_CLIENT_ID=
GOOGLE_CALENDAR_CLIENT_SECRET=

# 査定用公的データ
MLIT_API_KEY=

# 管理画面ベースURL（Slack通知のリンク生成用）
ADMIN_BASE_URL=http://localhost:3001/admin

# 開発環境設定
PORT=3001
NODE_ENV=development
```

---

## npm スクリプト

```bash
npm run dev          # 開発サーバー（:3001）
npm run build        # 本番ビルド
npm run start        # 本番起動
npm run lint         # ESLint
npm run typecheck    # TypeScript 型チェック
npm run test         # Vitest
npm run db:generate  # Prisma クライアント生成
npm run db:migrate   # DBマイグレーション
npm run db:studio    # Prisma Studio（DB GUI）
npm run db:seed      # 初期データ投入
npm run check-env    # 環境変数が正しく設定されているか確認
```

---

## 既存プロジェクトとの関係

| 項目 | 既存プロジェクト（/public） | このシステム |
|---|---|---|
| リポジトリ | 別リポジトリ | `felia-property-system` |
| URL | `felia-home.co.jp` | `admin.felia-home.co.jp` |
| DB | 既存DB（触らない） | 専用 PostgreSQL |
| ポート（開発） | :3000 など | **:3001** |
| `.env` | 別ファイル | `.env.local`（独立） |
| `node_modules` | 別ディレクトリ | 独立してインストール |
| デプロイ | 独自フロー | GitHub Actions（独立） |

**既存プロジェクトのコードは一切変更しません。**
CRMとの連携は既存CRMのREST APIのみを経由し、DBには直接接続しません。

---

## 自動デプロイの設定

`git push origin main` でVPSに自動デプロイされます（GitHub Actions）。

### GitHub Secrets の登録

GitHubリポジトリの **Settings → Secrets and variables → Actions** に以下を登録：

| Secret名 | 値 |
|---|---|
| `VPS_HOST` | `49.212.210.97` |
| `VPS_USER` | `ubuntu` |
| `VPS_SSH_KEY` | VPSのSSH秘密鍵（`~/.ssh/id_rsa` の内容） |

### SSH鍵の設定（初回のみ）

```bash
# 1. ローカルで鍵ペアを生成（既存の鍵を使う場合はスキップ）
ssh-keygen -t ed25519 -C "github-actions-deploy"

# 2. 公開鍵をVPSに登録
ssh ubuntu@49.212.210.97 "echo '$(cat ~/.ssh/id_ed25519.pub)' >> ~/.ssh/authorized_keys"

# 3. 秘密鍵の内容を GitHub Secrets の VPS_SSH_KEY に貼り付け
cat ~/.ssh/id_ed25519
```

### デプロイフロー

```
git push origin main
  → GitHub Actions 起動
  → SSH で VPS に接続
  → スワップ1GB追加（ビルド用）
  → git pull → npm install → prisma migrate deploy → prisma generate → rm -rf .next → npm run build → pm2 restart
  → スワップ削除
```

デプロイ状況は GitHub リポジトリの **Actions** タブで確認できます。

### VPS永続スワップの設定（初回のみ）

メモリが少ないVPSでビルドが SIGKILL で落ちる場合、永続スワップを設定する。
GitHub Actions のデプロイスクリプトがビルド時に一時スワップ（1GB）を追加するため、
この設定がなくてもデプロイは成功するが、念のため設定しておくと安定する。

```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

設定確認：

```bash
free -h
swapon --show
```
