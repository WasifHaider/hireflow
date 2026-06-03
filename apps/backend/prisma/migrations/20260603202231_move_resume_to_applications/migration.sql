/*
  Warnings:

  - You are about to drop the column `resume_text` on the `candidates` table. All the data in the column will be lost.
  - You are about to drop the column `resume_url` on the `candidates` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "applications" ADD COLUMN     "resume_filename" TEXT,
ADD COLUMN     "resume_mime_type" TEXT,
ADD COLUMN     "resume_size_bytes" INTEGER,
ADD COLUMN     "resume_text" TEXT,
ADD COLUMN     "resume_url" TEXT;

-- AlterTable
ALTER TABLE "candidates" DROP COLUMN "resume_text",
DROP COLUMN "resume_url";
