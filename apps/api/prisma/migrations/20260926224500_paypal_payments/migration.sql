-- Payments moved from Stripe to PayPal.
--
-- Stripe does not operate in Honduras, and in Latin America supports only Brazil
-- and Mexico. PayPal does operate there, and the integration has the same shape:
-- the payer leaves for a hosted page and a signed webhook is the only thing
-- allowed to report that the money moved.
--
-- Written by hand as RENAME, not as the DROP + ADD that `prisma migrate dev`
-- generates from a schema diff. Prisma cannot tell a rename from a
-- delete-and-create, so the generated version would have discarded the payment
-- reference of every order already in the table. The columns hold the same kind
-- of value under a new name, so the data travels with them.

ALTER TABLE "orders" RENAME COLUMN "stripeSessionId" TO "paypalOrderId";
ALTER TABLE "orders" RENAME COLUMN "stripePaymentIntentId" TO "paypalCaptureId";

-- Postgres keeps the old index name when its column is renamed, while Prisma
-- derives the expected name from the column. Without this rename the next
-- migration would report drift on an index that is otherwise correct.
ALTER INDEX "orders_stripeSessionId_key" RENAME TO "orders_paypalOrderId_key";

-- Webhook deliveries already applied. The unique constraint on "eventId" is what
-- makes a redelivery a no-op: PayPal retries on any non-2xx and also redelivers
-- on a schedule of its own.
CREATE TABLE "webhook_events" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "transmissionId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "webhook_events_eventId_key" ON "webhook_events"("eventId");

CREATE INDEX "webhook_events_eventType_receivedAt_idx" ON "webhook_events"("eventType", "receivedAt");
