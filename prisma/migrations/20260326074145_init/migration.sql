-- CreateTable
CREATE TABLE "ad_approvals" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "publish_settings" JSONB,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_approvals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_records" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "sold_price" INTEGER NOT NULL,
    "listed_price" INTEGER NOT NULL,
    "price_diff_pct" DOUBLE PRECISION NOT NULL,
    "days_on_market" INTEGER NOT NULL,
    "inquiry_count" INTEGER NOT NULL DEFAULT 0,
    "viewing_count" INTEGER NOT NULL DEFAULT 0,
    "buyer_type" TEXT,
    "price_per_m2" DOUBLE PRECISION,
    "sold_at" TIMESTAMP(3) NOT NULL,
    "agent_id" TEXT,
    "season" TEXT,
    "property_snapshot" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sale_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "competitor_listings" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "property_type" TEXT,
    "address_city" TEXT,
    "station_name" TEXT,
    "station_walk" INTEGER,
    "price" INTEGER,
    "area_m2" DOUBLE PRECISION,
    "rooms" TEXT,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sold_detected_at" TIMESTAMP(3),
    "price_history" JSONB,

    CONSTRAINT "competitor_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viewings" (
    "id" TEXT NOT NULL,
    "property_id" TEXT NOT NULL,
    "customer_crm_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "notes" TEXT,
    "feedback" TEXT,
    "google_event_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viewings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_parse_logs" (
    "id" TEXT NOT NULL,
    "property_id" TEXT,
    "source_type" TEXT NOT NULL,
    "source_url" TEXT NOT NULL,
    "parse_result" JSONB NOT NULL,
    "confidence" JSONB NOT NULL,
    "confirmed_by" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_parse_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "sale_records_property_id_key" ON "sale_records"("property_id");

-- CreateIndex
CREATE UNIQUE INDEX "competitor_listings_source_source_id_key" ON "competitor_listings"("source", "source_id");
