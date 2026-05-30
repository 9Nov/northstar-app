-- =============================================
-- Northstar Management System — Seed Data
-- Run this AFTER running the DDL in db-schema.md
-- =============================================

-- Northstar Types (6 รายการตายตัว)
INSERT INTO northstar_types (name, display_order) VALUES
    ('SOT+',           1),
    ('Nearmiss+',      2),
    ('JH+',            3),
    ('KAI+',           4),
    ('Risk+',          5),
    ('Safety Mindset+',6)
ON CONFLICT (name) DO NOTHING;

-- Admin Account เริ่มต้น
-- ⚠️ ต้อง replace <bcrypt_hash> ด้วย hash จริงก่อน run
-- สร้าง hash ด้วย: node -e "const b=require('bcryptjs');b.hash('admin1234',10).then(console.log)"
INSERT INTO users (username, password_hash, name, surname, role)
VALUES ('admin', '$2b$10$1V.lTKJhV.4JjxDTpVisyu.It08wf2yxEIj/Euzoq/H0F8OPtfxPG', 'System', 'Admin', 'admin')
ON CONFLICT (username) DO NOTHING;
