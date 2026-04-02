CREATE TABLE "inquiries" (
  "id" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "source_email_id" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL,
  "raw_email" TEXT,
  "property_id" TEXT,
  "property_number" TEXT,
  "property_name" TEXT,
  "inquiry_type" TEXT NOT NULL DEFAULT 'PROPERTY',
  "message" TEXT,
  "visit_hope" BOOLEAN NOT NULL DEFAULT false,
  "document_hope" BOOLEAN NOT NULL DEFAULT false,
  "customer_id" TEXT,
  "customer_name" TEXT,
  "customer_email" TEXT,
  "customer_tel" TEXT,
  "customer_address" TEXT,
  "customer_note" TEXT,
  "assigned_to" TEXT,
  "assigned_at" TIMESTAMP(3),
  "assigned_by" TEXT,
  "assignment_reason" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "first_contact_at" TIMESTAMP(3),
  "response_time_min" INTEGER,
  "priority" TEXT NOT NULL DEFAULT 'NORMAL',
  "ai_score" INTEGER,
  "ai_notes" TEXT,
  "internal_memo" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "inquiries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "inquiries_source_email_id_key" ON "inquiries"("source_email_id");

CREATE TABLE "inquiry_activities" (
  "id" TEXT NOT NULL,
  "inquiry_id" TEXT NOT NULL,
  "staff_id" TEXT,
  "type" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "inquiry_activities_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "staffs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "inquiry_activities" ADD CONSTRAINT "inquiry_activities_inquiry_id_fkey" FOREIGN KEY ("inquiry_id") REFERENCES "inquiries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
