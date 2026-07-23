-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "master_template_id" TEXT;

-- CreateTable
CREATE TABLE "master_template" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "master_template_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotes_master_template_id_key" ON "quotes"("master_template_id");

-- AddForeignKey
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_master_template_id_fkey" FOREIGN KEY ("master_template_id") REFERENCES "master_template"("id") ON DELETE CASCADE ON UPDATE CASCADE;

