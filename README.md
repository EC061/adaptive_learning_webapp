# Adaptive Learning Platform

A Next.js 14 adaptive learning platform for science education with teacher dashboards, class management, and module-based quizzes.

## Tech Stack

- **Next.js 14** (App Router) + TypeScript
- **Prisma ORM** — PostgreSQL
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

Demo teacher account: `edwardcheng@uga.edu` / `nY*H1#6i#t8kqeP`

Run `npm run setup` again at any time to wipe and re-seed a clean database.

## Production

Prerequisites: PostgreSQL instance, Node.js, PM2.

```bash
npm install
cp .env.example .env     # then edit .env:
                         #   DATABASE_URL="postgresql://user:pass@host:5432/adaptive_learning"
npm run deploy           # applies schema, builds, starts PM2
```

## GitHub Deployment Secrets

The GitHub Actions workflow currently needs these repository secrets:

| Secret | Description |
|---|---|
| `EC2_HOST` | Public host/IP of the deployment server |
| `EC2_USER` | SSH username used for deploys |
| `EC2_SSH_KEY` | Private SSH key for that server |

`GITHUB_TOKEN` is used by the workflow too, but GitHub provides that automatically, so you do not need to create it manually.

## Server `.env` For Docker Deploys

The database URL is no longer read from GitHub Actions secrets during the image build.
Instead, Docker Compose expects it on the EC2 server in `~/app/.env`, next to `~/app/docker-compose.yml`.

Example `~/app/.env`:

```bash
PROD_DATABASE_URL="postgresql://user:pass@host:5432/adaptive_learning"
TEACHER_SIGNUP_TOKEN="your-secret-teacher-code"
OPENAI_API_KEY=""
OPENAI_SERVICE_TIER="flex"
OPENAI_MODEL="gpt-5.1"
```

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string used by Prisma for local/manual commands |
| `PROD_DATABASE_URL` | Production PostgreSQL connection string read by Docker Compose |
| `TEACHER_SIGNUP_TOKEN` | Secret token teachers must enter when registering |
| `OPENAI_API_KEY` | OpenAI API key |
| `OPENAI_SERVICE_TIER` | OpenAI service tier |
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
├── seed.ts               # Seeds topics + 26 thermodynamics questions
└── seed-demo.ts          # Creates demo teacher account (dev only)
```
