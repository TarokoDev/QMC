-- Rename the "template" concept to "category" throughout, preserving data.

ALTER TABLE "templates" RENAME TO "categories";
ALTER TABLE "categories" RENAME CONSTRAINT "templates_pkey" TO "categories_pkey";
ALTER TABLE "categories" RENAME CONSTRAINT "templates_folder_id_fkey" TO "categories_folder_id_fkey";

ALTER TABLE "clients" RENAME COLUMN "template_id" TO "category_id";
ALTER TABLE "clients" RENAME CONSTRAINT "clients_template_id_fkey" TO "clients_category_id_fkey";

ALTER TABLE "quotes" RENAME COLUMN "template_id" TO "category_id";
ALTER TABLE "quotes" RENAME CONSTRAINT "quotes_template_id_fkey" TO "quotes_category_id_fkey";
ALTER INDEX "quotes_template_id_key" RENAME TO "quotes_category_id_key";
