#!/bin/bash
# =============================================================
# フェリアホーム 物件情報管理システム — 初回セットアップスクリプト
# 使い方: bash scripts/setup.sh
# =============================================================

set -e  # エラーで即停止

echo ""
echo "🏠 フェリアホーム 物件情報管理システム セットアップ"
echo "======================================================"
echo "  既存プロジェクトには一切影響しません"
echo "======================================================"
echo ""

# Node.js バージョン確認
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 20 ]; then
  echo "❌ Node.js 20以上が必要です（現在: $(node -v)）"
  echo "   https://nodejs.org からインストールしてください"
  exit 1
fi
echo "✅ Node.js $(node -v)"

# .env.local が存在するか確認
if [ ! -f ".env.local" ]; then
  echo ""
  echo "📋 .env.local が見つかりません。テンプレートからコピーします..."
  cp .env.example .env.local
  echo "✅ .env.local を作成しました"
  echo ""
  echo "⚠️  .env.local を編集して環境変数を設定してください"
  echo "   特に以下は必須です:"
  echo "   - DATABASE_URL（専用PostgreSQLの接続文字列）"
  echo "   - ANTHROPIC_API_KEY"
  echo "   - NEXTAUTH_SECRET（openssl rand -base64 32 で生成）"
  echo ""
  read -p "設定が完了したら Enter キーを押してください..."
else
  echo "✅ .env.local 確認済み"
fi

# npm install
echo ""
echo "📦 依存パッケージをインストール中..."
npm install
echo "✅ インストール完了"

# 環境変数チェック
echo ""
echo "🔍 環境変数をチェック中..."
npm run check-env || {
  echo ""
  echo "❌ 環境変数を設定してから再度実行してください"
  exit 1
}

# Prisma セットアップ
echo ""
echo "🗄️  データベースをセットアップ中..."
echo "   ⚠️  既存DBとは別の専用DBに接続します"
npx prisma generate
npx prisma migrate dev --name init
echo "✅ DB セットアップ完了"

echo ""
echo "======================================================"
echo "🎉 セットアップ完了！"
echo ""
echo "開発サーバーを起動:"
echo "  npm run dev"
echo ""
echo "管理画面にアクセス:"
echo "  http://localhost:3001/admin"
echo ""
echo "※ 既存プロジェクトのポート（3000）とは別の 3001 を使用します"
echo "======================================================"
echo ""
