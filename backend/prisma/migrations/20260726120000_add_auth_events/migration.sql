-- Login/logout audit trail for the admin dashboard. Append-only; `email` and
-- `role` are snapshots because there is no user table here to join against.

CREATE TABLE "auth_events" (
    "id" TEXT NOT NULL,
    "auth_user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_events_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "auth_events_created_at_idx" ON "auth_events"("created_at");
CREATE INDEX "auth_events_auth_user_id_created_at_idx" ON "auth_events"("auth_user_id", "created_at");
