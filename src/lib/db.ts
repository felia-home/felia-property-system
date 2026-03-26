/**
 * Prisma クライアント — フェリアホーム 物件情報管理システム専用
 *
 * ⚠️ このファイルが接続する DB は既存プロジェクトの DB とは別です。
 *    DATABASE_URL 環境変数で専用 PostgreSQL に接続します。
 *    既存 CRM との連携は src/lib/crm-client.ts 経由（API のみ）で行います。
 */

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
