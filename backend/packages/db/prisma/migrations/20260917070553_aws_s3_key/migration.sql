/*
  Warnings:

  - Added the required column `key` to the `ProductIamges` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProductIamges" ADD COLUMN     "key" TEXT NOT NULL;
