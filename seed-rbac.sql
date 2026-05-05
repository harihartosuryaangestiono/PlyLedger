-- =========================================================================
-- IMPORTANT INSTRUCTIONS: 
-- In PostgreSQL, you cannot alter an ENUM and use it in the same transaction.
-- 
-- STEP 1: Highlight ONLY the line below and click "Run" (or run it separately):
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'VIEWER';

-- STEP 2: Highlight EVERYTHING from line 10 downwards and click "Run":
-- =========================================================================
-- Insert or Update ADMIN user
INSERT INTO "User" ("id", "email", "password", "name", "role", "updatedAt")
VALUES (
  gen_random_uuid(),
  'hariharto.surya@gmail.com',
  '$2b$10$NZAPwv74I7GozuYMNInTWewNTodZ0cOkJfT7KGLPP1scpq3a0XvaW', -- hashed 'hari123'
  'Admin Hari',
  'ADMIN',
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "password" = EXCLUDED."password",
  "role" = EXCLUDED."role",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

-- Insert or Update SALES user
INSERT INTO "User" ("id", "email", "password", "name", "role", "updatedAt")
VALUES (
  gen_random_uuid(),
  'eilenaangelica99@gmail.com',
  '$2b$10$vEOh5xXHLYqeDrDbdKEoiOhEv0l2PR63SGvNI5nANjKvt.a.dVztG', -- hashed 'elincantik123'
  'Sales Eilena',
  'SALES',
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "password" = EXCLUDED."password",
  "role" = EXCLUDED."role",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

-- Insert or Update FINANCE user
INSERT INTO "User" ("id", "email", "password", "name", "role", "updatedAt")
VALUES (
  gen_random_uuid(),
  'auriel.rahayu@gmail.com',
  '$2b$10$NzXlSBZXSGoyN0.z0kSYO.mosdun0.1i1MjhFI9GQqAkKJnJX8j3i', -- hashed 'oyelcantik123'
  'Finance Auriel',
  'FINANCE',
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "password" = EXCLUDED."password",
  "role" = EXCLUDED."role",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();

-- Insert or Update VIEWER user
INSERT INTO "User" ("id", "email", "password", "name", "role", "updatedAt")
VALUES (
  gen_random_uuid(),
  'rachmat.sendjaja@gmail.com',
  '$2b$10$x9G4PrW0vYsNULPwjTayLuOcYDVq8nqKO3wEd80FlHFwae4K36Oj6', -- hashed 'rachmatganteng123'
  'Viewer Rachmat',
  'VIEWER',
  NOW()
)
ON CONFLICT ("email") DO UPDATE SET
  "password" = EXCLUDED."password",
  "role" = EXCLUDED."role",
  "name" = EXCLUDED."name",
  "updatedAt" = NOW();
