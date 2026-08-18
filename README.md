<h1 align="center">NestJS Clean Architecture Template</h1>

<p align="center">
  A NestJS 11 + Prisma + PostgreSQL starter organised around Clean Architecture:
  business rules live in framework-free use cases, and everything they touch
  crosses an explicit port.
</p>

---

## Why this layout

Three layers, with dependencies pointing inward:

| Layer | Path | Contains | May depend on |
| --- | --- | --- | --- |
| **Domain** | `src/domain` | Ports (repository, logger, JWT, bcrypt, exceptions, config), models, DI symbols | nothing in this repo |
| **Use cases** | `src/usecases` | One class per business operation. No decorators, no NestJS import | domain only |
| **Infrastructure** | `src/infrastructure` | Controllers, Prisma adapters, Passport strategies, interceptors, filter, config | domain + use cases |

A use case receives its collaborators as constructor parameters typed to
interfaces, so it can be tested with plain in-memory fakes — no database, no
container, no HTTP. See `src/usecases/testing/` for the fakes and
`*.spec.ts` next to each use case for the pattern.

## Quick start

```bash
# 1. Dependencies (pnpm; the lockfile is authoritative)
pnpm install

# 2. Configuration — every value is validated at boot
cp .env.example .env
#    then set JWT_SECRET and JWT_REFRESH_TOKEN_SECRET to 32+ random chars:
#    openssl rand -base64 48

# 3. Database
docker compose up -d postgres
pnpm prisma generate
pnpm run db:deploy         # applies prisma/migrations

# 4. Run
pnpm run start:dev
```

- API base: `http://localhost:3000/api/v1`
- Swagger (non-production only): `http://localhost:3000/docs`
- Probes: `GET /api/health/live`, `GET /api/health/ready`

To run the whole stack in containers instead: `docker compose up --build`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm run start:dev` | Watch-mode server |
| `pnpm run build` | Compile to `dist/` |
| `pnpm run typecheck` | `tsc --noEmit` (strict) |
| `pnpm run lint` | ESLint, no autofix — what CI runs |
| `pnpm run lint:fix` | ESLint with autofix |
| `pnpm test` | Unit tests |
| `pnpm run test:cov` | Unit tests with coverage |
| `pnpm run test:e2e` | Boots the real module graph |
| `pnpm run db:migrate` | Create + apply a migration in development |
| `pnpm run db:deploy` | Apply committed migrations (CI / production) |
| `pnpm run db:studio` | Prisma Studio |

## API

All routes are prefixed `/api` and versioned in the URI (`/api/v1/...`).
Health probes are unversioned.

| Method | Route | Auth | Notes |
| --- | --- | --- | --- |
| `POST` | `/v1/auth/register` | — | 409 if the email exists |
| `POST` | `/v1/auth/login` | local | Sets `Authentication` + `Refresh` cookies |
| `POST` | `/v1/auth/logout` | jwt | Clears cookies **and** revokes the stored refresh token |
| `GET` | `/v1/auth/refresh` | jwt-refresh | Issues a new access cookie |
| `GET` | `/v1/auth/is_authenticated` | jwt | Current user, never including the password |
| `POST` | `/v1/transactions` | jwt | Owner taken from the token, not the body |
| `GET` | `/v1/transactions` | jwt | Paginated; `orderBy` restricted to an allowlist |
| `GET` | `/v1/transactions/:id` | jwt | 404 for another user's record |
| `PATCH` | `/v1/transactions/:id` | jwt | 404 for another user's record |
| `DELETE` | `/v1/transactions/:id` | jwt | 204; 404 for another user's record |
| `GET` | `/health/live` | — | Liveness; does not touch the database |
| `GET` | `/health/ready` | — | Readiness; 503 if the database is unreachable |

Successful responses are wrapped by `ResponseInterceptor`:

```json
{ "data": {}, "isArray": false, "path": "/api/v1/...", "duration": "4ms", "method": "GET" }
```

## Security posture

- Passwords: bcrypt; hashing owned by the register use case, never returned in a response.
- Sessions: JWT in `HttpOnly` cookies; refresh tokens stored **hashed** and revoked on logout.
- Ownership: enforced in the `WHERE` clause of every transaction query, so another
  user's record is indistinguishable from a missing one (404, never 403).
- Headers: `helmet` defaults.
- CORS: explicit origin allowlist from `CORS_ALLOWED_ORIGINS`. Never `*` — the API uses cookies.
- Rate limiting: `@nestjs/throttler`, applied globally via `APP_GUARD`.
- Input: global `ValidationPipe` with `whitelist` **and** `forbidNonWhitelisted`, so
  unknown properties are rejected rather than silently dropped.
- Errors: non-HTTP exceptions return a generic message in production; full detail goes to the log only.

## Configuration

`src/infrastructure/config/environment-config/environment-config.validation.ts`
is the schema. The app refuses to start if a value is missing or malformed, and
both JWT secrets must be at least 32 characters.

Read config through `EnvironmentConfigService` — it is the single place that
validates and defaults values. Do not read `process.env` elsewhere.

## Adding a use case

1. Define or extend a port in `src/domain/`.
2. Write the failing spec beside the use case, using fakes from `src/usecases/testing/`.
3. Write the use case in `src/usecases/<feature>/`.
4. Add a symbol to `src/domain/symbols/index.ts`.
5. Register the provider in the feature's `*-usecases-proxy.module.ts` — the
   `inject` array must match the factory signature exactly. The wiring spec at
   `src/infrastructure/usecases-proxy/usecases-proxy.module.spec.ts` fails if it does not.
6. Expose it from a controller with a DTO and a guard.

## Testing

- Unit specs sit beside the code they cover; use cases use in-memory fakes that
  store real records, so assertions are about resulting state rather than which
  methods were called.
- `test/app.e2e-spec.ts` boots the real `AppModule` with Prisma stubbed, which
  verifies the whole DI graph resolves and routes are mounted where documented.
- CI (`.github/workflows/ci.yml`) runs lint, typecheck, migrations, tests and
  build, then builds the Docker image and asserts the compiled app is inside it.

## License

UNLICENSED — private template.
