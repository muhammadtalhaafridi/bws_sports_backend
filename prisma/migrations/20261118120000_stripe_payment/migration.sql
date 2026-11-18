-- AlterTable
ALTER TABLE "orders" ADD COLUMN "payment_status" TEXT NOT NULL DEFAULT 'UNPAID',
ADD COLUMN "stripe_session_id" TEXT,
ADD COLUMN "stripe_payment_id" TEXT,
ADD COLUMN "card_brand" TEXT,
ADD COLUMN "card_last4" TEXT,
ADD COLUMN "card_exp_month" INTEGER,
ADD COLUMN "card_exp_year" INTEGER,
ADD COLUMN "cardholder_name" TEXT,
ADD COLUMN "paid_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "orders_stripe_session_id_key" ON "orders"("stripe_session_id");
