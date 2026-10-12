-- =====================================================================
-- Migration 001 – registration fields + open sign-up  (13 Oct 2026)
--
-- Run ONCE in phpMyAdmin on a database that was created with the first
-- version of schema.sql: select the database → "SQL" tab → paste → Go.
-- (New installs don't need this: schema.sql already contains it.)
-- =====================================================================

SET NAMES utf8mb4;

ALTER TABLE users
  ADD COLUMN kommune        VARCHAR(100) NULL AFTER display_name,
  ADD COLUMN bydel          VARCHAR(100) NULL AFTER kommune,
  ADD COLUMN ressursnummer  VARCHAR(40)  NULL AFTER bydel,
  ADD COLUMN ansvarlig      VARCHAR(120) NULL AFTER ressursnummer,
  ADD COLUMN department_id  INT UNSIGNED NULL AFTER ansvarlig,
  ADD COLUMN registered_at  DATETIME     NULL AFTER department_id,
  ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL;

-- Open sign-up: anyone with an e-mail address can register
-- (no domain rule; the invite list stays empty).
UPDATE organizations SET allowed_email_domains = NULL WHERE id = 1;
