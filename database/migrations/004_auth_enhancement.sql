-- =============================================================================
-- ShilpSetu — Database Schema Migration
-- Migration: 004_auth_enhancement.sql
-- Description: Adds authentication fields to users table for password
--              verification and account status.
-- Source of Truth: DATABASE_SCHEMA.md & ARCHITECTURE.md (Step 5I)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Enhance users table: Add password_hash and is_active columns
-- -----------------------------------------------------------------------------
ALTER TABLE users 
    ADD COLUMN IF NOT EXISTS password_hash TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users(LOWER(email));
