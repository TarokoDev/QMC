-- Per-revision file attachments (signed quote PDFs, SketchUp files, photos).
-- The bytes live in the private Supabase Storage bucket `quote-documents`;
-- this table is the only index of them.
--
-- ON DELETE CASCADE mirrors the rest of the tree, so deleting a folder,
-- category, client or revision removes these rows. The matching storage
-- objects are collected and removed by the API *before* the delete runs —
-- Postgres cascades silently and there is no trigger to catch them.

CREATE TABLE "revision_documents" (
    "id" TEXT NOT NULL,
    "revision_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'application/octet-stream',
    "size_bytes" INTEGER NOT NULL,
    "storage_path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "uploaded_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revision_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "revision_documents_storage_path_key" ON "revision_documents"("storage_path");

CREATE INDEX "revision_documents_revision_id_created_at_idx" ON "revision_documents"("revision_id", "created_at");

ALTER TABLE "revision_documents"
  ADD CONSTRAINT "revision_documents_revision_id_fkey"
  FOREIGN KEY ("revision_id") REFERENCES "revisions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
