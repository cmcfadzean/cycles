# Deployment Guide

This app uses **SQLite** for local development and **PostgreSQL** for production.

## Local Development

1. Create a `.env` file:
```bash
DATABASE_URL="file:./dev.db"
```

2. Set up the database:
```bash
npm run db:setup:dev
npm run db:seed  # Optional: seed with sample data
```

3. Start the dev server:
```bash
npm run dev
```

---

## Production Deployment

### Option 1: Vercel + Neon (Recommended - 100% Free)

**Neon** offers a generous free tier for PostgreSQL.

#### Step 1: Set up Neon Database
1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy the connection string (looks like `postgresql://user:pass@host/db?sslmode=require`)

#### Step 2: Deploy to Vercel
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add the environment variable:
   - `DATABASE_URL` = your Neon connection string
4. Deploy!

Vercel will automatically:
- Run `npm run build` (which runs `prisma generate && next build`)
- Deploy your app

#### Step 3: Run Migrations
After first deploy, run migrations via Vercel CLI or set up in build:
```bash
npx vercel env pull .env.production.local
npx prisma db push
npx prisma db seed  # Optional
```

---

### Option 2: Railway (All-in-One)

Railway provides both hosting and PostgreSQL in one place.

1. Go to [railway.app](https://railway.app)
2. Create a new project from GitHub
3. Add a PostgreSQL database to your project
4. Railway will auto-set `DATABASE_URL`
5. Deploy!

---

### Option 3: Vercel + Supabase

Similar to Neon, Supabase offers free PostgreSQL.

1. Create a project at [supabase.com](https://supabase.com)
2. Go to Settings → Database → Connection string
3. Copy the connection string (use "Transaction" mode for serverless)
4. Add to Vercel as `DATABASE_URL`

---

## Database Commands

| Command | Description |
|---------|-------------|
| `npm run db:setup:dev` | Generate client + push schema (SQLite) |
| `npm run db:generate` | Generate Prisma client (PostgreSQL) |
| `npm run db:generate:dev` | Generate Prisma client (SQLite) |
| `npm run db:push` | Push schema to database (PostgreSQL) |
| `npm run db:push:dev` | Push schema to database (SQLite) |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio (PostgreSQL) |
| `npm run db:studio:dev` | Open Prisma Studio (SQLite) |

---

## Environment Variables

| Variable | Local Dev | Production |
|----------|-----------|------------|
| `DATABASE_URL` | `file:./dev.db` | PostgreSQL connection string |

---

## Troubleshooting

### "Can't reach database server"
- Check your `DATABASE_URL` is correct
- For Neon/Supabase, ensure `?sslmode=require` is in the URL

### "Migration failed"
- Run `npx prisma db push --force-reset` to reset (⚠️ deletes data)

### Local dev not working after switching
- Delete `node_modules/.prisma` and run `npm run db:setup:dev`




