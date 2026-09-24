-- Pyramid — Health Prioritization App (v1)
-- Schema: two core tables from the spec (`interventions`, `user_assessments`)
-- plus a minimal supporting `users` table to satisfy the user_id FK (no auth in v1).
--
-- MySQL 9.x. PostgreSQL types from the spec are mapped to MySQL:
--   jsonb   -> JSON
--   text[]  -> JSON (array)          (keeps the spec's "two core tables" constraint)
--   enums   -> native ENUM(...)
--
-- Re-runnable: drops tables in reverse-FK order, then recreates. Run `seed.sql` after.

CREATE DATABASE IF NOT EXISTS pyramid
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;
USE pyramid;

-- Interpret this file's bytes as UTF-8 regardless of the client's default
-- charset. Without this, a latin1 default mangles em-dashes etc. on import.
SET NAMES utf8mb4;

DROP TABLE IF EXISTS user_assessments;
DROP TABLE IF EXISTS interventions;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------------
-- users — minimal supporting table (v1 targets one user, no authentication).
-- The spec lists only two tables but `user_assessments.user_id` is a FK, so we
-- add this purely to satisfy the constraint. Flagged for the user in the plan.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  label      VARCHAR(120) NULL,                    -- optional human label; no auth
  created_at TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ---------------------------------------------------------------------------
-- interventions — the evidence database. This is the real product.
-- Every row is hand-curated; every citation must be personally verified before
-- it ships (spec §1/§4). Seeded citations carry a per-source `verified` flag.
-- ---------------------------------------------------------------------------
CREATE TABLE interventions (
  id             BIGINT AUTO_INCREMENT PRIMARY KEY,
  signal_key     VARCHAR(40) NOT NULL,             -- e.g. sleep, exercise, diet_protein
  tier           INT         NOT NULL DEFAULT 1,   -- 1 = foundational basics (all of v1)
  claim          TEXT        NOT NULL,             -- the intervention, plainly stated

  -- Effect size drives the "recommend vs. keep doing what you're doing" threshold.
  effect_size    ENUM('large','moderate','small')         NOT NULL,
  -- Evidence quality is SEPARATE from effect size (spec §4). GRADE, simplified to
  -- its four certainty levels.
  evidence_grade ENUM('high','moderate','low','very_low') NOT NULL,
  effort_cost    ENUM('low','moderate','high')            NOT NULL,

  prereq_of      JSON NOT NULL,                    -- array of signal_keys this is upstream of
  citations      JSON NOT NULL,                    -- array of {title, url, verified}

  msg_unmet      TEXT NOT NULL,                    -- feedback when below threshold
  msg_borderline TEXT NOT NULL,                    -- feedback when marginal
  msg_met        TEXT NOT NULL,                    -- feedback when fine ("keep it up")

  -- Guard the JSON columns actually hold arrays.
  CONSTRAINT chk_prereq_is_array   CHECK (JSON_TYPE(prereq_of) = 'ARRAY'),
  CONSTRAINT chk_citations_is_array CHECK (JSON_TYPE(citations) = 'ARRAY'),

  INDEX idx_signal_key (signal_key),
  INDEX idx_tier (tier)
);

-- ---------------------------------------------------------------------------
-- user_assessments — one row per user submission. Store raw bucketed answers
-- AND computed scores so logic can be re-run without re-asking the user.
-- ---------------------------------------------------------------------------
CREATE TABLE user_assessments (
  id            BIGINT AUTO_INCREMENT PRIMARY KEY,
  user_id       BIGINT    NOT NULL,
  created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  answers       JSON NOT NULL,   -- raw bucketed inputs, keyed by signal
  signal_scores JSON NOT NULL,   -- computed met/borderline/unmet per signal
  input_source  JSON NOT NULL,   -- per-signal self_report|wearable (v2 forward-hook)

  CONSTRAINT fk_ua_user FOREIGN KEY (user_id) REFERENCES users(id),
  INDEX idx_user_created (user_id, created_at)
);
