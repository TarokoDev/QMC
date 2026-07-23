-- Users are Supabase Auth accounts now; display name/email come from the
-- session (auth-context.tsx), not a backend profile table. Nothing else
-- referenced this table (no FKs). See CLAUDE.md "Environments".

DROP TABLE "users";
