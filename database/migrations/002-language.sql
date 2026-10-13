-- =====================================================================
-- Migration 002 – language per user (English / Norwegian)  (13 Oct 2026)
--
-- Run ONCE in phpMyAdmin, after 001-registrering.sql:
-- select the database → "SQL" tab → paste → Go.
-- (New installs don't need this: schema.sql already contains it.)
-- =====================================================================

ALTER TABLE users
  ADD COLUMN locale CHAR(2) NOT NULL DEFAULT 'nb' AFTER notify_daily;
