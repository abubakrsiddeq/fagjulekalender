-- =====================================================================
-- Fagjulekalender – database schema
-- Target: MySQL 8+ or MariaDB 10.4+ (Hostinger / phpMyAdmin)
--
-- How to use in phpMyAdmin:
--   1. Select your database in the left sidebar (e.g. u123456789_fagjul).
--   2. Open the "Import" tab, choose this file, click "Import".
--   3. Then import seed.sql the same way.
--
-- All DATETIME columns are stored in UTC. The app converts to the
-- calendar's time zone (Europe/Oslo) itself, so the MySQL server's
-- time zone tables are not needed.
-- =====================================================================

SET NAMES utf8mb4;
SET time_zone = '+00:00';
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS notification_log;
DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS answers;
DROP TABLE IF EXISTS question_options;
DROP TABLE IF EXISTS questions;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS calendars;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS login_codes;
DROP TABLE IF EXISTS invites;
DROP TABLE IF EXISTS departments;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS organizations;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Core tables (the nine tables from the requirements, section 6)
-- ---------------------------------------------------------------------

CREATE TABLE organizations (
  id                          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  name                        VARCHAR(200) NOT NULL,
  -- Comma-separated list, e.g. "oslo.kommune.no,bkr.no". Empty = no domain rule.
  allowed_email_domains       TEXT NULL,
  allow_department_proposals  TINYINT(1) NOT NULL DEFAULT 0,
  brand_color                 VARCHAR(7) NULL,      -- e.g. #1E4A38
  logo_url                    VARCHAR(500) NULL,
  created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE users (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id         INT UNSIGNED NOT NULL,
  email          VARCHAR(254) NOT NULL,
  display_name   VARCHAR(100) NOT NULL,
  -- Registration (filled in on first sign-in)
  kommune        VARCHAR(100) NULL,
  bydel          VARCHAR(100) NULL,
  ressursnummer  VARCHAR(40) NULL,
  ansvarlig      VARCHAR(120) NULL,
  department_id  INT UNSIGNED NULL,   -- "Avdeling eller seksjon"; used when joining a calendar
  registered_at  DATETIME NULL,
  role           ENUM('participant','lead','admin') NOT NULL DEFAULT 'participant',
  hide_name      TINYINT(1) NOT NULL DEFAULT 0,
  notify_daily   TINYINT(1) NOT NULL DEFAULT 0,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at  DATETIME NULL,
  anonymized_at  DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_org_email (org_id, email),
  CONSTRAINT fk_users_org FOREIGN KEY (org_id) REFERENCES organizations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- The _ci collation makes the unique name check case-insensitive ("Sone 2" = "sone 2").
CREATE TABLE departments (
  id              INT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id          INT UNSIGNED NOT NULL,
  name            VARCHAR(120) NOT NULL,
  status          ENUM('active','pending','archived') NOT NULL DEFAULT 'active',
  proposed_by     INT UNSIGNED NULL,
  merged_into_id  INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_departments_org_name (org_id, name),
  CONSTRAINT fk_departments_org FOREIGN KEY (org_id) REFERENCES organizations (id),
  CONSTRAINT fk_departments_proposed_by FOREIGN KEY (proposed_by) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_departments_merged_into FOREIGN KEY (merged_into_id) REFERENCES departments (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- users and departments reference each other, so this key is added after both exist.
ALTER TABLE users
  ADD CONSTRAINT fk_users_department FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE SET NULL;

CREATE TABLE calendars (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  org_id                INT UNSIGNED NOT NULL,
  name                  VARCHAR(200) NOT NULL,
  slug                  VARCHAR(80) NOT NULL,         -- used in the link: /kalender/<slug>
  year                  SMALLINT UNSIGNED NOT NULL,
  start_date            DATE NOT NULL,                -- door 1 opens 00:00 local time on this date
  door_count            TINYINT UNSIGNED NOT NULL DEFAULT 24,
  timezone              VARCHAR(64) NOT NULL DEFAULT 'Europe/Oslo',
  closes_at             DATETIME NOT NULL,            -- UTC; no answers accepted after this
  points_correct        SMALLINT UNSIGNED NOT NULL DEFAULT 10,
  same_day_bonus        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  late_answers_allowed  TINYINT(1) NOT NULL DEFAULT 1,
  min_answers_to_count  TINYINT UNSIGNED NOT NULL DEFAULT 1,
  shuffle_options       TINYINT(1) NOT NULL DEFAULT 0,
  notify_time           CHAR(5) NULL DEFAULT '07:30', -- local time for the daily email, NULL = off
  status                ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_calendars_slug (slug),
  KEY ix_calendars_org_status (org_id, status),
  CONSTRAINT fk_calendars_org FOREIGN KEY (org_id) REFERENCES organizations (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE memberships (
  calendar_id    INT UNSIGNED NOT NULL,
  user_id        INT UNSIGNED NOT NULL,
  department_id  INT UNSIGNED NOT NULL,
  joined_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (calendar_id, user_id),
  KEY ix_memberships_department (calendar_id, department_id),
  CONSTRAINT fk_memberships_calendar FOREIGN KEY (calendar_id) REFERENCES calendars (id) ON DELETE CASCADE,
  CONSTRAINT fk_memberships_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_memberships_department FOREIGN KEY (department_id) REFERENCES departments (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE questions (
  id                    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  calendar_id           INT UNSIGNED NOT NULL,
  door_number           TINYINT UNSIGNED NOT NULL,
  topic                 VARCHAR(60) NOT NULL,
  text                  TEXT NOT NULL,
  image_url             VARCHAR(500) NULL,
  explanation           TEXT NOT NULL,
  source_title          VARCHAR(255) NULL,
  source_eqs_id         VARCHAR(20) NULL,
  source_revision_date  DATE NULL,
  approved_by           VARCHAR(120) NULL,
  approved_at           DATE NULL,
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_questions_calendar_door (calendar_id, door_number),
  CONSTRAINT fk_questions_calendar FOREIGN KEY (calendar_id) REFERENCES calendars (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- "Option" in the requirements. Named question_options because OPTION is a reserved word.
-- 2–6 per question with exactly one is_correct = 1 (checked by the app).
CREATE TABLE question_options (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  question_id  INT UNSIGNED NOT NULL,
  text         VARCHAR(500) NOT NULL,
  is_correct   TINYINT(1) NOT NULL DEFAULT 0,
  sort_order   TINYINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  KEY ix_options_question (question_id, sort_order),
  CONSTRAINT fk_options_question FOREIGN KEY (question_id) REFERENCES questions (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per attempt. The unique key is what makes "one attempt per door" hold,
-- even if two requests arrive at the same time.
CREATE TABLE answers (
  id              BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  calendar_id     INT UNSIGNED NOT NULL,
  question_id     INT UNSIGNED NOT NULL,
  user_id         INT UNSIGNED NOT NULL,
  option_id       INT UNSIGNED NOT NULL,
  is_correct      TINYINT(1) NOT NULL,
  on_door_day     TINYINT(1) NOT NULL DEFAULT 0,  -- answered on the door's own date (same-day bonus)
  answered_at     DATETIME(3) NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_answers_question_user (question_id, user_id),
  KEY ix_answers_calendar_user (calendar_id, user_id),
  KEY ix_answers_calendar_time (calendar_id, answered_at),
  CONSTRAINT fk_answers_calendar FOREIGN KEY (calendar_id) REFERENCES calendars (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES questions (id),
  CONSTRAINT fk_answers_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_answers_option FOREIGN KEY (option_id) REFERENCES question_options (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE audit_log (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id      INT UNSIGNED NULL,
  action       VARCHAR(60) NOT NULL,
  entity       VARCHAR(40) NOT NULL,
  entity_id    VARCHAR(40) NULL,
  before_data  LONGTEXT NULL,   -- JSON
  after_data   LONGTEXT NULL,   -- JSON
  reason       VARCHAR(500) NULL,
  at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY ix_audit_at (at),
  KEY ix_audit_entity (entity, entity_id),
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Support tables (sign-in, invite list, e-mail bookkeeping)
-- ---------------------------------------------------------------------

CREATE TABLE invites (
  org_id      INT UNSIGNED NOT NULL,
  email       VARCHAR(254) NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (org_id, email),
  CONSTRAINT fk_invites_org FOREIGN KEY (org_id) REFERENCES organizations (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One-time sign-in codes. Only a hash of the code is stored.
CREATE TABLE login_codes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email       VARCHAR(254) NOT NULL,
  code_hash   CHAR(64) NOT NULL,
  ip          VARCHAR(45) NULL,
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_login_codes_email (email, created_at),
  KEY ix_login_codes_ip (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sessions. The cookie holds a random token; only its SHA-256 hash is stored here.
CREATE TABLE sessions (
  id          CHAR(64) NOT NULL,
  user_id     INT UNSIGNED NOT NULL,
  expires_at  DATETIME NOT NULL,
  created_at  DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY ix_sessions_user (user_id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per calendar door once the daily e-mail has been sent, so it is never sent twice.
CREATE TABLE notification_log (
  calendar_id  INT UNSIGNED NOT NULL,
  door_number  TINYINT UNSIGNED NOT NULL,
  sent_at      DATETIME NOT NULL,
  recipients   INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (calendar_id, door_number),
  CONSTRAINT fk_notification_calendar FOREIGN KEY (calendar_id) REFERENCES calendars (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
