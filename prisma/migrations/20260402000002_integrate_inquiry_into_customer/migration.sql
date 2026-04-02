-- Customer モデルに反響関連フィールドを追加
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "ai_score" INTEGER;
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'NORMAL';
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "first_contact_at" TIMESTAMP(3);

-- CustomerActivity テーブルを新規作成
CREATE TABLE IF NOT EXISTS "customer_activities" (
  "id" TEXT NOT NULL,
  "customer_id" TEXT NOT NULL,
  "staff_id" TEXT,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "customer_activities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "customer_activities" ADD CONSTRAINT "customer_activities_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
