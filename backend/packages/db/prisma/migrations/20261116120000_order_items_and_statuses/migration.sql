-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';

-- AlterEnum
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUND_INITIATED';
ALTER TYPE "PaymentStatus" ADD VALUE 'REFUNDED';
ALTER TYPE "PaymentStatus" ADD VALUE 'EXPIRED';

-- CreateEnum
CREATE TYPE "InventoryStatus" AS ENUM ('NONE', 'RESERVED', 'DEDUCTED', 'RELEASED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "inventoryStatus" "InventoryStatus" NOT NULL DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "OrderdProducts" ADD COLUMN     "priceAtPurchase" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- Backfill existing orders so cancel/refund treat their stock correctly.
-- Before this migration, OrderdProducts rows were only written once stock was deducted (after payment).
UPDATE "Order" SET "inventoryStatus" = 'DEDUCTED'
WHERE "status" <> 'CANCELLED'
  AND EXISTS (SELECT 1 FROM "OrderdProducts" op WHERE op."orderId" = "Order"."id");

-- Placed but unpaid orders whose stock was already reserved
UPDATE "Order" SET "inventoryStatus" = 'RESERVED'
WHERE "inventoryStatus" = 'NONE' AND "status" = 'CREATED'
  AND EXISTS (SELECT 1 FROM "Events" e WHERE e."aggregateId" = "Order"."id" AND e."eventType" = 'INVENTORY_RESERVED');
