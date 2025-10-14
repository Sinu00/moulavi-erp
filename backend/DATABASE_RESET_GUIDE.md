# Database Reset and Fresh Setup Guide

## ⚠️ CLEAN DATABASE SETUP

Since you have failed migrations, let's do a complete clean reset.

## Option 1: Complete Database Reset (RECOMMENDED)

### Step 1: Drop and Recreate Database
```bash
# Connect to PostgreSQL
psql -U postgres

# Drop the database
DROP DATABASE IF EXISTS moulavi_erp;

# Recreate it
CREATE DATABASE moulavi_erp;

# Exit psql
\q
```

### Step 2: Reset Prisma Migrations
```bash
cd backend

# Remove migration history
rm -rf prisma/migrations

# Create fresh migration from schema
npx prisma migrate dev --name init_clean_schema
```

### Step 3: Seed Data
```bash
node scripts/seed-all.js
```

---

## Option 2: Reset Migrations Only (If you want to keep some data)

### Step 1: Mark Failed Migration as Resolved
```bash
cd backend

# Mark the failed migration as rolled back
npx prisma migrate resolve --rolled-back "20251013141257_add_booking_mode_field"

# Reset migration history
npx prisma migrate reset --force
```

This will:
- Drop all tables
- Apply all migrations from scratch
- Run seed scripts if configured

---

## Option 3: Manual Database Cleanup

If the above don't work, manually clean up:

```sql
-- Connect to your database
psql -U postgres -d moulavi_erp

-- Drop all tables (careful!)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Exit
\q
```

Then run:
```bash
cd backend
npx prisma migrate deploy
node scripts/seed-all.js
```

---

## ✅ RECOMMENDED APPROACH (Cleanest)

```bash
# 1. Navigate to backend
cd backend

# 2. Reset everything with Prisma
npx prisma migrate reset --force

# 3. This will:
#    - Drop the database
#    - Recreate it
#    - Run all migrations
#    - (Optionally run seeds)

# 4. If seeds didn't run automatically:
node scripts/seed-all.js

# 5. Generate Prisma Client
npx prisma generate

# 6. Start your server
npm run dev
```

---

## 🎯 What This Will Do

The `prisma migrate reset --force` command will:
1. ✅ Drop all tables and data
2. ✅ Recreate the database
3. ✅ Apply all migrations in order (including our new cleanup migration)
4. ✅ Generate Prisma Client
5. ✅ Give you a fresh start

---

## After Reset - Verify

```bash
# Check migrations applied
npx prisma migrate status

# Should show all migrations as applied, including:
# - 20251013120643_redesign_umrah_booking_workflow
# - 20251014000000_cleanup_master_tables (our new one)
```

---

## 📝 Note About Failed Migration

The error mentions `20251013141257_add_booking_mode_field` which seems to be an old/failed migration. By resetting, we'll remove this and apply only the clean migrations.

---

## ⚡ QUICK START (Copy-Paste This)

```bash
cd backend
npx prisma migrate reset --force
node scripts/seed-all.js
npx prisma generate
npm run dev
```

Done! Your database will be clean with all the new simplified schema.

