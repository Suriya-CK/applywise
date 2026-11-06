# Architecture

This document explains how ApplyWise is structured and why.

## Overview

ApplyWise has three parts:

- **Client:** a React single-page app, served as static files
- **Server:** a stateless Node.js + Express REST API
- **Database:** PostgreSQL

The server is the only part that talks to the database and to the Claude API. In production the client is served by nginx, which forwards `/api/*` requests to the server, so the browser only ever talks to one origin.

## Request flow

```
Request
  → helmet (security headers)
  → cors (allow-listed origin)
  → express.json (body parsing, 100 KB limit)
  → rate limiter
  → router (/api/v1/...)
      → requireAuth (verify JWT, set req.userId)
      → validateBody (Zod schema)
      → route handler
          → repository (parameterised SQL)  /  claude.service (Anthropic SDK)
  → JSON response
Errors at any step → errorHandler → { error, details } with the right status code
```

## Server layers

| Layer | Responsibility | Why it's separate |
|---|---|---|
| `routes/` | HTTP concerns: paths, status codes, request and response shapes | Keeps handlers short and readable |
| `middleware/` | Cross-cutting concerns: auth, validation, errors | Written once, reused on every route |
| `repositories/` | All SQL | One place to change queries; easy to mock in tests |
| `services/` | External APIs (Claude) | Isolates third-party code and its error handling |
| `config.ts` | Environment variables, validated at startup | Fails fast on bad configuration |

`app.ts` builds the Express app and `index.ts` starts it. Keeping them apart lets the tests run the app in memory with Supertest.

## Data model

```
users (id, name, email UNIQUE, password_hash, created_at)
  │ 1
  │
  │ *
applications (id, user_id → users.id ON DELETE CASCADE, company, role,
              status CHECK IN (wishlist, applied, interview, offer, rejected),
              job_description, notes, applied_on DATE, match_score 0–100,
              created_at, updated_at)
```

- Integrity rules (unique email, allowed statuses, score range, foreign key) are enforced by the database as well as in the API.
- An index on `applications.user_id` speeds up the most common query.
- Every application query filters by `user_id` taken from the verified token, so users can only ever reach their own data.

## Authentication

- Passwords are hashed with bcrypt and never returned by the API.
- Logging in returns a signed JWT (`sub` = user id, with an expiry). The client sends it as `Authorization: Bearer <token>`.
- The API keeps no sessions, so any number of server instances can handle any request.
- Login returns the same error for an unknown email and a wrong password, so it doesn't reveal which emails are registered.

## AI resume matching

- `POST /api/v1/ai/match` sends the resume and job description to Claude through the Anthropic TypeScript SDK.
- **Structured outputs:** a Zod schema (`MatchResultSchema`) is passed to `messages.parse()`, so the response is validated, typed JSON with `score`, `summary`, `matchingSkills`, `missingSkills` and `suggestions`.
- **Errors are mapped:** no API key → 503, rate limited → 429, other API errors or an unparseable answer → 502.
- The endpoint has its own stricter rate limit, because each call has a real cost.
- If an `applicationId` is given, the score is saved on that application.

## Frontend state

| State | Where it lives | Tool |
|---|---|---|
| Logged-in user | `AuthContext` | `useState` + Context |
| Applications list | `ApplicationsContext` | `useReducer` + Context |
| Form inputs | Each component | `useState` (controlled inputs) |
| Counts per status | Computed from the list | `useMemo` |

All list updates go through a pure reducer (`applicationsReducer.ts`), which keeps state changes predictable and unit-testable. API calls go through one typed client (`api/client.ts`), which attaches the token and turns error responses into `ApiError`.

## Testing

| Suite | Tools | What it covers |
|---|---|---|
| Server | Vitest + Supertest | Every route: success paths, validation errors, auth failures, 404s. Repositories and the Claude service are mocked, so tests are fast, free and deterministic. |
| Client | Vitest + React Testing Library | Reducer logic and the application form's behaviour, tested from the user's point of view |

CI runs lint, type checks, both test suites and both Docker builds on every push.

## Deployment

The images are production-ready: multi-stage builds, the API runs as a non-root user, and the container has a health check and shuts down gracefully on `SIGTERM`. A typical AWS setup:

- API container on **ECS Fargate** (image in **ECR**) behind a load balancer
- **RDS PostgreSQL** in a private subnet
- React build on **S3 + CloudFront**
- Secrets in **AWS Secrets Manager**, read by a least-privilege **IAM** task role

## Known limitations and next steps

- Move the token from `localStorage` to an `httpOnly` cookie to reduce XSS exposure, and add refresh tokens
- Paginate `GET /applications`
- Add integration tests against a real PostgreSQL in CI
- Add a migration tool for schema changes beyond the initial schema
- Define the AWS infrastructure as code (CDK or Terraform) and add a deploy stage to the pipeline
