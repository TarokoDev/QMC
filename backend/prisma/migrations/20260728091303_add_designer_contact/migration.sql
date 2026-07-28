-- AlterTable
ALTER TABLE "master_template" ALTER COLUMN "updated_at" DROP DEFAULT;

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "designer_contact" TEXT NOT NULL DEFAULT '';
