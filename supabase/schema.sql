-- =============================================
-- Northstar Management System — PostgreSQL DDL
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. sections
CREATE TABLE IF NOT EXISTS sections (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. rounds
CREATE TABLE IF NOT EXISTS rounds (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name        TEXT        NOT NULL UNIQUE,
    is_open     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. northstar_types (Seed 6 fixed types)
CREATE TABLE IF NOT EXISTS northstar_types (
    id            UUID  PRIMARY KEY DEFAULT gen_random_uuid(),
    name          TEXT  NOT NULL UNIQUE,
    display_order INT   NOT NULL
);

-- 4. users
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    username      TEXT        NOT NULL UNIQUE,
    password_hash TEXT        NOT NULL,
    name          TEXT        NOT NULL,
    surname       TEXT        NOT NULL,
    role          TEXT        NOT NULL DEFAULT 'user'
                              CHECK (role IN ('admin', 'user')),
    section_id    UUID        REFERENCES sections(id) ON DELETE SET NULL,
    round_id      UUID        REFERENCES rounds(id)   ON DELETE SET NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. round_section_quotas
CREATE TABLE IF NOT EXISTS round_section_quotas (
    id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id            UUID        NOT NULL REFERENCES rounds(id)          ON DELETE CASCADE,
    section_id          UUID        NOT NULL REFERENCES sections(id)         ON DELETE CASCADE,
    northstar_type_id   UUID        NOT NULL REFERENCES northstar_types(id)  ON DELETE CASCADE,
    quota               INT         NOT NULL CHECK (quota > 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT uq_round_section_northstar
        UNIQUE (round_id, section_id, northstar_type_id)
);

-- 6. registrations
CREATE TABLE IF NOT EXISTS registrations (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 UUID        NOT NULL UNIQUE
                                        REFERENCES users(id) ON DELETE CASCADE,
    round_section_quota_id  UUID        NOT NULL
                                        REFERENCES round_section_quotas(id) ON DELETE RESTRICT,
    registered_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- =============================================
-- Triggers: auto-update updated_at
-- =============================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_rounds_updated_at
    BEFORE UPDATE ON rounds
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_round_section_quotas_updated_at
    BEFORE UPDATE ON round_section_quotas
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_registrations_updated_at
    BEFORE UPDATE ON registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================
-- Indexes
-- =============================================
CREATE INDEX IF NOT EXISTS idx_registrations_round_section_quota_id
    ON registrations (round_section_quota_id);

CREATE INDEX IF NOT EXISTS idx_users_round_id
    ON users (round_id);

CREATE INDEX IF NOT EXISTS idx_users_section_id
    ON users (section_id);

CREATE INDEX IF NOT EXISTS idx_round_section_quotas_round_id
    ON round_section_quotas (round_id);

-- =============================================
-- Seed: Northstar Types (6 fixed)
-- =============================================
INSERT INTO northstar_types (name, display_order) VALUES
    ('SOT+', 1),
    ('Nearmiss+', 2),
    ('JH+', 3),
    ('KAI+', 4),
    ('Risk+', 5),
    ('Safety mindset+', 6)
ON CONFLICT (name) DO NOTHING;

-- =============================================
-- Seed: Admin Account
-- Password: admin1234 (bcrypt hash)
-- Change this password immediately after first login!
-- =============================================
-- To generate a new hash, run in Node.js:
-- require('bcryptjs').hashSync('admin1234', 10)
INSERT INTO users (username, password_hash, name, surname, role)
VALUES (
    'admin',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
    'System', 'Admin', 'admin'
) ON CONFLICT (username) DO NOTHING;

-- =============================================
-- Enable Realtime (run in Supabase Dashboard > Database > Replication)
-- Or run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE registrations;
-- ALTER PUBLICATION supabase_realtime ADD TABLE round_section_quotas;
-- =============================================
