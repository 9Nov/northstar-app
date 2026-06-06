# Northstar Management System — Setup Guide

## Prerequisites
- Node.js 18+
- Supabase account (free tier is sufficient)

## 1. Supabase Setup

1. Create a new Supabase project at https://supabase.com
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Enable Realtime for the `registrations` table:
   - Go to **Database → Replication**
   - Enable `registrations` and `round_section_quotas` tables

## 2. Environment Variables

Copy `.env.local` and fill in your values:

```
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

- Get `SUPABASE_URL` and keys from: **Supabase → Settings → API**

## 3. Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## 4. First Login

Default admin account (from seed):
- **Username:** `admin`
- **Password:** `admin1234`

> Change the password by updating the hash in `supabase/schema.sql` and re-running the seed, or by adding a change-password feature.

## 5. Excel Import Format

| username | password | section | name | surname | round |
|----------|----------|---------|------|---------|-------|
| user001 | pass1234 | HR | สมชาย | ใจดี | รอบ Q1/2025 |

- **round** must match an existing round name created in Admin Panel
- **section** is created automatically if it doesn't exist

## 6. Production Deployment (Vercel)

```bash
vercel --prod
```

Set all environment variables in Vercel dashboard under **Settings → Environment Variables**.
