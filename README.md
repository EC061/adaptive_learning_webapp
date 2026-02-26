# Adaptive Learning Platform

A Next.js 14 adaptive learning platform for science education with teacher dashboards, class management, and module-based quizzes.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** — SQLite (dev) / PostgreSQL (prod)
- **NextAuth.js v5** — credentials-based login (email or username)
- **Tailwind CSS** + shadcn/ui components
- **PM2** for production process management

## Development

```bash
npm install
cp .env.example .env
npm run setup            # creates DB, seeds questions + demo teacher
npm run dev              # starts dev server
```

Open [http://localhost:3000](http://localhost:3000).

Demo teacher account: `teacher@demo.com` / `password123`

Run `npm run setup` again at any time to wipe and re-seed a clean database.

## Production

Prerequisites: PostgreSQL instance, Node.js, PM2.

```bash
npm install
cp .env.example .env     # then edit .env:
                         #   DB_PROVIDER="postgresql"
                         #   DATABASE_URL="postgresql://user:pass@host:5432/adaptive_learning"
                         #   NEXTAUTH_SECRET="long-random-secret"
                         #   NEXTAUTH_URL="https://your-domain.com"
                         #   NEXT_PUBLIC_APP_URL="https://your-domain.com"
npm run deploy           # applies schema, seeds questions, builds, starts PM2
```

## Environment Variables

| Variable | Description |
|---|---|
| `DB_PROVIDER` | `sqlite` (dev) or `postgresql` (prod) |
| `DATABASE_URL` | `file:./dev.db` (dev) or PostgreSQL connection string (prod) |
| `NEXTAUTH_SECRET` | Random string for signing auth tokens |
| `NEXTAUTH_URL` | `http://localhost:3000` (dev) or your production URL |
| `NEXT_PUBLIC_APP_URL` | Same as NEXTAUTH_URL — used for invite link generation |
| `TEACHER_SIGNUP_TOKEN` | Secret token teachers must enter when registering |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_MODEL` | OpenAI model name |

## Project Structure

```
src/
├── app/
│   ├── (auth)/           # Login, Register, Invite pages
│   ├── (dashboard)/
│   │   ├── teacher/      # Teacher dashboard, classes, topics, questions
│   │   └── student/      # Student dashboard, class view, module quiz
│   └── api/              # API routes
├── components/
│   ├── ui/               # shadcn/ui components
│   └── dashboard/        # Sidebar, shared dashboard components
├── lib/
│   ├── auth.ts           # NextAuth config
│   ├── prisma.ts         # Prisma client singleton
│   └── utils.ts          # Helpers
├── types/                # TypeScript types and enums
└── middleware.ts          # Route protection
prisma/
├── schema.prisma         # Database schema
├── set-provider.ts       # Sets DB provider from .env before Prisma commands
├── seed.ts               # Seeds topics + 26 thermodynamics questions
└── seed-demo.ts          # Creates demo teacher account (dev only)
```
