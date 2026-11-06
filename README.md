# ApplyWise

**AI-powered job application tracker.** Track every application through its stages, and let Claude compare your resume with a job description to get a fit score, the skills you match, the skills you're missing, and honest suggestions.

Built with **TypeScript end to end**: React frontend, Node.js + Express REST API, PostgreSQL, Claude API, Docker and GitHub Actions CI.

![CI](https://github.com/Suriya-CK/applywise/actions/workflows/ci.yml/badge.svg)

## Features

- **Accounts:** register and log in with JWT authentication; passwords hashed with bcrypt
- **Application tracker:** create, update, filter and delete applications across 5 stages (wishlist → applied → interview → offer / rejected), with a live count per stage
- **AI resume match:** Claude returns a 0–100 fit score, matching and missing skills, and suggestions as validated, typed JSON; the score can be saved to an application
- **Security:** Helmet headers, CORS allow-list, rate limiting (stricter on the paid AI endpoint), Zod input validation, parameterised SQL, per-user data isolation
- **Quality:** ESLint, strict TypeScript, 31 automated tests (Vitest + Supertest + React Testing Library), CI on every push

## Architecture

```
 Browser                      Docker network
┌──────────────┐   /api/*   ┌───────────────────────┐   SQL    ┌──────────────┐
│ React + TS   │ ─────────▶ │ Node.js + Express API │ ───────▶ │ PostgreSQL   │
│ (Vite build, │ ◀───────── │  routes → middleware  │ ◀─────── │              │
│  nginx)      │    JSON    │  → repositories       │          └──────────────┘
└──────────────┘            │                       │  HTTPS   ┌──────────────┐
                            │  claude.service.ts    │ ───────▶ │ Claude API   │
                            └───────────────────────┘          └──────────────┘
```

**Backend layers** (`server/src`):

| Layer | Folder | Job |
|---|---|---|
| Routes | `routes/` | HTTP endpoints, status codes |
| Middleware | `middleware/` | Auth (JWT), validation (Zod), error handling |
| Repositories | `repositories/` | All SQL lives here |
| Services | `services/` | External APIs (Claude) |

**Frontend** (`client/src`): `api/client.ts` (typed fetch wrapper) · `context/` (Auth + Applications state with `useReducer`) · `pages/` · `components/`.

## REST API

All routes are under `/api/v1`. Routes marked 🔒 need `Authorization: Bearer <token>`.

| Method | Path | Description | Success |
|---|---|---|---|
| POST | `/auth/register` | Create account → `{ user, token }` | 201 |
| POST | `/auth/login` | Log in → `{ user, token }` | 200 |
| GET | `/auth/me` 🔒 | Current user | 200 |
| GET | `/applications?status=applied` 🔒 | List (optional filter) | 200 |
| GET | `/applications/stats` 🔒 | Count per status | 200 |
| GET | `/applications/:id` 🔒 | One application | 200 |
| POST | `/applications` 🔒 | Create | 201 |
| PATCH | `/applications/:id` 🔒 | Partial update | 200 |
| DELETE | `/applications/:id` 🔒 | Delete | 204 |
| POST | `/ai/match` 🔒 | `{ resume, jobDescription, applicationId? }` → AI analysis | 200 |

Errors always look like `{ "error": "message", "details": { ...field errors } }` with 400 / 401 / 404 / 409 / 429 / 5xx.

## Run it

### Option 1: Docker (easiest)

```bash
docker compose up --build
```

Open http://localhost:8080 and create an account. To enable AI matching, run `ANTHROPIC_API_KEY=your-key docker compose up --build` instead.

### Option 2: Locally (for development)

You need Node.js 20+ and PostgreSQL.

```bash
# 1. Database
createdb applywise   # or use: docker compose up db

# 2. API (http://localhost:4000)
cd server
cp .env.example .env        # then edit the values
npm install
npm run migrate             # create tables
npm run seed                # optional: demo@applywise.dev / password123
npm run dev

# 3. Frontend (http://localhost:5173), in a second terminal
cd client
npm install
npm run dev
```

### Tests and checks

```bash
cd server && npm run lint && npm run typecheck && npm test
cd client && npm run lint && npm test
```

## CI/CD

`.github/workflows/ci.yml` runs on every push and pull request:

1. **Server job:** install → lint → type-check → test → build
2. **Client job:** install → lint → test → build (runs in parallel with the server job)
3. **Docker job:** builds both production images, only if both jobs above passed

## Deployment notes (AWS)

The app is containerised, so it can be deployed on AWS like this:

- **ECS Fargate** runs the API container (image pushed to **ECR**)
- **RDS for PostgreSQL** in a private subnet replaces the `db` container
- **S3 + CloudFront** serve the static React build
- **Secrets Manager** holds `JWT_SECRET`, `ANTHROPIC_API_KEY` and the DB password, injected into the task
- **IAM** gives the task role only the permissions it needs (least privilege)

## How AI tools were used

- **Claude, inside the product:** the `/ai/match` endpoint uses the Anthropic TypeScript SDK with **structured outputs** (`messages.parse` + a Zod schema), so the model's answer is validated JSON rather than free text.
- **Claude for development:** used to scaffold code, write tests and docs, and debug. Everything was reviewed, run and tested before committing.

## Project structure

```
applywise/
├── server/                 Node.js + Express + TypeScript API
│   ├── src/
│   │   ├── routes/         auth, applications, ai
│   │   ├── middleware/     auth (JWT), validate (Zod), errorHandler
│   │   ├── repositories/   SQL queries
│   │   ├── services/       Claude integration
│   │   ├── db/             pool, schema.sql, migrate, seed
│   │   ├── app.ts          builds the Express app
│   │   └── index.ts        starts the server
│   ├── tests/              Vitest + Supertest
│   └── Dockerfile
├── client/                 React + TypeScript (Vite)
│   ├── src/{api,context,pages,components}
│   ├── tests/              Vitest + React Testing Library
│   ├── nginx.conf
│   └── Dockerfile
├── docs/ARCHITECTURE.md    Design decisions and trade-offs
├── docker-compose.yml
└── .github/workflows/ci.yml
```
