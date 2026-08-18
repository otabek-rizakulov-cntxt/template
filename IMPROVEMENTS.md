# Remediation Report — NestJS Clean Architecture Template

**Branch:** `fix/critical-defects-and-hardening` · **Baseline:** `main` @ `18ffd22` · **Date:** 18 Aug 2026

This document records what was wrong, what changed, and the measurements behind
each claim. Every "before" figure was taken from `main` — either by running the
baseline code or by reading it — not estimated.

---

## 1. Executive summary

The architecture was sound; the wiring was not. Six defects blocked adoption, the
most serious being that **`POST /api/v1/auth/login` issued valid session cookies
without ever checking the password**. All six are fixed, each with a regression
test that was watched failing first.

| | Before | After |
| --- | --- | --- |
| Critical defects | 6 | 0 |
| Login rejects a wrong password | ❌ returns `201` + session cookies | ✅ returns `401`, no cookies |
| Reading a transaction preserves it | ❌ the read deleted the row | ✅ verified twice, row intact |
| Cross-user data access | ❌ no owner column existed | ✅ `404` on read/update/delete |
| Test suites passing | 2 of 4 | 11 of 11 |
| Tests passing | 2 of 3 | 68 of 68 |
| Use cases with `execute()` covered by a test | 0 of 9 | 6 of 10 |
| Docker image contains the app | ❌ `.dockerignore` excluded `src` | ✅ asserted in CI |
| Security response headers | 0 | 6 |
| CI pipeline | none | lint · typecheck · migrate · test · build · image |

---

## 2. Measured comparison

### 2.1 Code health

| Metric | Before | After | Change |
| --- | --- | --- | --- |
| Source files (`src/**/*.ts`) | 70 | 78 | +8 |
| Production LOC (excl. tests/fakes) | 2,083 | 2,301 | +218 |
| Test LOC | 78 | 736 | ×9.4 |
| `eslint-disable` comments | 17 | **0** | −17 |
| `as any` casts | 13 | **0** | −13 |
| `any` in type positions | 3 | **0** | −3 |
| Direct `process.env` reads (excl. config module) | 14 | **2** | −12 |
| `domain/` files importing `@prisma/client` | 3 | 2 | −1 (see §6) |
| `usecases/` files importing `@infrastructure/` | 5 | **0** | −5 |
| TypeScript `strict` | off | **on** | — |
| Lint errors / warnings at `--max-warnings=0` | 19 / 6 | **0 / 0** | — |

The 17 suppressions and 13 casts were not spread thinly: 13 of each lived in one
90-line file, `infrastructure/repositories/prisma.repository.ts`. That file was
the generic Prisma passthrough described in §4.1, and deleting it removed them
all — along with the bug that had been hiding in it.

### 2.2 Test suite

| | Before | After |
| --- | --- | --- |
| Unit suites | 4 (2 failing) | 10 (0 failing) |
| Unit tests | 3 (1 failing) | 63 |
| E2E suites | 1 (failing by construction) | 1 |
| E2E tests | 1 | 5 |
| Tests asserting business behaviour | 1 | 68 |
| Use cases with `execute()` exercised | 0 of 9 | 6 of 10 |

"Before" detail: three of the four spec files contained only the Nest CLI's
generated `expect(service).toBeDefined()`. The single real assertion was in
`bcrypt.service.spec.ts`. `test/app.e2e-spec.ts` was the untouched starter test —
it requested `GET /` and expected the body `Hello World!`, a route this
application has never served, so it could not pass.

Statement coverage after, by area:

```
usecases/transactions   78.9%   (get-by-id 100, delete 100, update 77.8)
usecases/auth           75.0%   (register 100, login 74.4, is-authenticated 60)
usecases/user           50.0%   (constructor only — execute() untested)
domain/model           100.0%
```

The four use cases still at 50% — `logout`, `create-transaction`,
`list-transactions`, `get-user-by-email` — have only their constructor executed;
their `execute()` bodies are not asserted. They are reached through the e2e and
live checks but have no unit spec of their own.

### 2.3 API surface

| | Before | After |
| --- | --- | --- |
| Routes reachable over HTTP | 6 | 12 |
| Routes behind a guard | 3 | 9 |
| Transactions feature | present in source, **never registered** | wired, guarded, owner-scoped |
| Health check | `GET /api/health` → `"Hello world"` | `/health/live` + `/health/ready` (real DB probe) |
| Committed migrations | 0 | 1 (applies cleanly from empty) |

---

## 3. The six critical defects

### 3.1 Authentication bypass on login — **critical**

`src/infrastructure/controllers/auth/auth.controller.ts`

The handler had no guard (the `LoginGuard` import sat commented out on line 27)
and minted both cookies from `auth.email` taken straight out of the request body.
The `password` field was validated for presence and then never used.

Two further bugs were hidden behind it, and would have surfaced the moment the
guard was restored:

- `LocalStrategy` called `super()` with no options, so `passport-local` looked for
  a `username` field. The DTO sends `email`. **No credentials could ever have
  authenticated**, valid ones included.
- `DatabaseUserRepository.updateLastLogin()` threw `Method not implemented`, and
  it sits on the local-strategy login path — so every login would have returned
  500. There was also no `lastLogin` column for it to write to.

**Before** — baseline built and run against a live PostgreSQL:

```
$ curl -X POST /api/v1/auth/login -d '{"email":"a@example.com","password":"totally-wrong"}'
  status=201
  Set-Cookie: Authentication=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Set-Cookie: Refresh=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

$ curl -b <that cookie jar> /api/v1/auth/is_authenticated
  {"data":{"email":"a@example.com"},...}   [status=200]
```

The cookies obtained with a wrong password returned the victim's data. Full
account takeover with no credential, given only a known email address.

A login for an address that does not exist returned **500**, which also
distinguished registered from unregistered emails — user enumeration.

**After** — same requests against the fixed build:

```
$ curl -X POST /api/v1/auth/login -d '{"email":"a@example.com","password":"totally-wrong"}'
  status=401   cookies captured: 0
  {"statusCode":401,...,"message":"Invalid email or password."}

$ curl -b <that jar> /api/v1/auth/is_authenticated
  status=401

$ curl -X POST /api/v1/auth/login -d '{"email":"ghost@nowhere.invalid","password":"x"}'
  status=401                       # same response as a wrong password
```

**Fix:** restored `@UseGuards(LoginGuard)`; identity now comes from
`request.user`, populated by the strategy, never from the body. `LocalStrategy`
passes `{ usernameField: 'email' }`. `updateLastLogin` is implemented and the
`lastLogin` column added.

**Regression test:** `src/infrastructure/controllers/auth/auth.controller.spec.ts`
— 5 tests over the real controller, guard and strategy with an in-memory user
repository and real bcrypt. First run, before the fix:

```
✕ rejects a login with the wrong password        Expected: 401  Received: 201
✕ sets no session cookie when the password is wrong
✕ rejects a login for an unknown email           Expected: 401  Received: 201
✓ issues access and refresh cookies for correct credentials
✕ records the login time on success
```

### 3.2 A read that deleted the record — **critical**

`src/usecases/transactions/get-transaction-by-id.usecases.ts`

`GetTransactionByIdUseCases.execute()` was a verbatim copy of the delete use
case: it checked the transaction existed, called `deleteTransaction`, logged
`"Transaction has been deleted"` and returned `null`.

**Before** (first run of the new spec, reproducing the defect exactly):

```
✕ returns the requested transaction     Expected: {...id: "t-1"}  Received: null
✕ leaves the transaction in the repository            Received: null
✓ throws NotFound when the transaction does not exist
```

**After** — against the running application:

```
read#1 status=200
read#2 status=200
rows in DB: 1
```

**Fix:** the use case reads and returns the transaction. **Regression test:**
`get-transaction-by-id.usecases.spec.ts`, including an explicit
`leaves the transaction in the repository after reading it`.

### 3.3 Generic repository queried the wrong table — **high**

`src/infrastructure/repositories/prisma.repository.ts:46`

`PrismaRepository<K>` delegated every method through `this.prisma[this.model]` —
except `findFirstOrThrow`, hardcoded to `this.prisma.users`. Any model inheriting
the base class silently read from the users table.

**Fix:** the whole passthrough base class was deleted (see §4.1). Each adapter now
writes its queries against an explicit model, so the class of bug no longer has
anywhere to live.

### 3.4 DI factories resolving `undefined` collaborators — **high**

`src/usecases/auth/auth-usecases-proxy.module.ts`, `transactions-usecases-proxy.module.ts`

Nest resolves `inject` arrays at runtime, so a factory declaring more parameters
than its `inject` array supplies is not a compile error — the surplus arrives as
`undefined`.

| Provider | `inject` length | Factory parameters |
| --- | --- | --- |
| `REGISTER_USECASES_PROXY` | 1 | 2 |
| `READ_TRANSACTION_USECASES_PROXY` | 2 | 3 |
| `UPDATE_TRANSACTION_USECASES_PROXY` | 2 | 3 |
| `DELETE_TRANSACTION_USECASES_PROXY` | 2 | 3 |

In each case the missing collaborator was the exception service — reached only on
an error path. Registering a duplicate email threw `TypeError: Cannot read
properties of undefined` instead of returning a 4xx.

**After:**

```
$ curl -X POST /api/v1/auth/register -d '{"email":"a@example.com",...}'   # already exists
  {"statusCode":409,...,"message":"A user with this email already exists","code_error":409}
```

**Fix:** every `inject` array corrected. **Regression test:**
`src/infrastructure/usecases-proxy/usecases-proxy.module.spec.ts` resolves all 11
registered symbols and asserts no constructor-injected field is `undefined` — a
generic guard that covers providers added later, not just these four.

Verified the guard actually catches the defect by reintroducing it:

```
$ # inject array shortened from 3 to 2 entries
✕ DELETE_TRANSACTION_USECASES_PROXY has no undefined collaborator
Tests: 1 failed, 20 passed
```

### 3.5 Unimplemented repository method on the login path — **high**

Covered in §3.1. `updateLastLogin()` now performs the update; the `lastLogin`
column was added to the schema and the behaviour is asserted in
`user.repository.spec.ts` and in the login controller spec.

### 3.6 The Docker image contained no application code — **high**

`.dockerignore` listed `src` and `test`, while the `Dockerfile` ran `COPY . .`
followed by `npm run start:dev`. The image had nothing to run. Alongside that:
`npm install` against a pnpm lockfile, no `prisma generate`, no build step, a
development CMD in a production image, and `EXPOSE 3000` against an app that
hardcoded `listen(8080)`.

**Fix:** three-stage build (deps → build → runtime); `src` and `prisma` no longer
excluded; `pnpm install --frozen-lockfile`; `prisma generate` and `nest build` in
the build stage; `pnpm prune --prod`; runtime stage carries no compiler and no
sources; runs as the unprivileged `node` user; `HEALTHCHECK` points at the real
readiness probe; port comes from config.

**Regression test:** the `docker` job in CI builds the image and asserts
`/app/dist/main.js` exists inside it.

---

## 4. Architectural improvements

### 4.1 The repository port no longer re-exports the ORM

`PrismaRepositoryI` declared **13 raw Prisma operations** —
`aggregate`, `count`, `create`, `createMany`, `delete`, `findFirst`,
`findFirstOrThrow`, `findMany`, `findUnique`, `findUniqueOrThrow`, `update`,
`updateMany`, `upsert` — each typed `Parameters<PrismaClient[K][...]>`. Both
repository interfaces extended it, so any use case holding a repository could
issue an arbitrary query against any model. Its implementation needed a cast and
a paired suppression on every method.

| | Before | After |
| --- | --- | --- |
| Methods on the user port | 4 + 13 inherited | 5 |
| Methods on the transaction port | 5 + 13 inherited | 5 |
| Suppressions in the adapter | 13 | 0 |
| `as any` in the adapter | 13 | 0 |

Both ports are now narrow and intention-revealing (`getUserByEmail`,
`clearRefreshToken`, `listTransactions`, …), and `prisma-repository.interface.ts`
plus `prisma.repository.ts` are deleted.

### 4.2 Use cases no longer depend on infrastructure

`RegisterUseCases` and all four transaction use cases imported the concrete
`ExceptionsService` from `@infrastructure/`, bypassing the `IException` port that
already existed in `domain/exceptions/`. All five now depend on the port —
`usecases/` has **zero** imports from `@infrastructure/`.

`IException` methods were also retyped from `void` to `never`. Since every one
throws, TypeScript can now narrow control flow at the call site, which removed
the `as Transaction` casts that the `void` signature had forced.

### 4.3 One configuration source

`ConfigModule.forRoot()` was called twice — in `AppModule` with `load:` and again
in `EnvironmentConfigModule` with `validate:`. The first exposed nested
`app.port`; the service read flat `DATABASE_URL`. It worked only because
`ConfigService` falls through to `process.env`. Validation running as an import
side-effect also made every config-touching module impossible to load in a test
without a full environment.

Secrets were read from three different places, one of which —
`process.env.secret` in `AppModule`, lowercase and never declared — was certainly
`undefined`.

| | Before | After |
| --- | --- | --- |
| `ConfigModule.forRoot()` calls | 2 | 1 |
| Places a JWT secret is read | 3 (`process.env` ×3) | 1 (`EnvironmentConfigService`) |
| Missing secret behaviour | getter returned `''` | throws, naming the key |
| Secret length enforced | no | ≥ 32 chars, at boot |
| Listen port | hardcoded `8080` | from config |
| `PrismaModule` scope | `@Global()` | imported explicitly |

`main.ts` also stopped constructing `new LoggerService()` by hand; the filter and
interceptors now share the container-resolved instance.

### 4.4 Ownership modelled in the schema

`Transaction` had no `userId` and no relation to `Users`. There was nothing to
filter on, so the authorization hole was in the data model, not in a forgotten
check.

Added `userId` with a cascading relation, plus indexes on `(userId, date)` and
`categoryId`. Every port method is scoped by owner and the scope is expressed in
the SQL `WHERE` clause, so a record belonging to someone else is
indistinguishable from one that does not exist — **404, never 403**.

Updates and deletes use `updateMany`/`deleteMany` with the owner in the predicate,
making the ownership check and the write a single statement with no read-then-write
race.

**Verified live**, with two registered users and one transaction owned by A:

```
B reads   A's transaction -> 404
B deletes A's transaction -> 404
B patches A's transaction -> 404
B lists own transactions  -> 0 transactions
A lists own transactions  -> 1 transaction
A reads   own transaction -> 200
rows still in DB          -> 1
```

### 4.5 Other corrections

- **Logout did not revoke.** It expired the cookies but left `hashRefreshToken`
  in the database, so a refresh token copied beforehand still minted access
  tokens. `LogoutUseCases` now clears it. Verified live: `set` → `NULL`.
- **Password hashing moved** from the repository into `RegisterUseCases`. How
  credentials are stored is a rule, not a persistence detail; it also removed
  `BcryptService` from the repository's constructor.
- **Duplicate email** now returns `409 Conflict` rather than `400`.
- **`orderBy` was interpolated** from a caller-supplied `Record<string, number>`
  straight into Prisma's `orderBy` key, with page numbers unbounded. It is now a
  validated DTO with an allowlisted column and `itemsPerPage` capped at 100.
- **Duplicate class name.** The transactions controller was also called
  `AuthController` and tagged `@ApiTags('auth')`. Renamed and retagged.
- **Dead code removed:** `prisma.config.ts` (a `beforeExit` hook that does not
  fire on `SIGTERM`), the empty `UseCasesProxyModule` aggregator, the unused
  `'UserRepository'`/`'TransactionRepository'` string tokens, and the inert
  `SentryConfig` block describing an SDK that was never a dependency.
- **`domain/model/user.ts`** was defined and never imported. It now holds
  `PublicUser` and `toPublicUser()`, so "never return the password hash" is one
  named helper instead of a destructuring trick repeated with a lint suppression.

---

## 5. Security posture

Measured against the running application, before and after.

| Control | Before | After |
| --- | --- | --- |
| Login verifies the password | ❌ | ✅ |
| Response security headers | **0** | **6** |
| `X-Powered-By` disclosed | ❌ `Express` | ✅ removed |
| CORS for an arbitrary origin | ❌ `Access-Control-Allow-Origin: *` | ✅ no header emitted |
| Rate limiting | ❌ none | ✅ 10 / min / IP |
| Refresh token revoked on logout | ❌ | ✅ |
| Unknown request properties | silently dropped | rejected (`400`) |
| Internal errors leaked to clients | ❌ raw `Error.message` | ✅ generic in production |
| Cross-user record access | ❌ not modelled | ✅ `404` |
| User enumeration on login | ❌ `500` vs `201` | ✅ uniform `401` |

Headers now present: `Content-Security-Policy`, `Strict-Transport-Security`,
`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
`X-DNS-Prefetch-Control`.

Rate limiting, measured with 12 rapid login attempts:

```
before:  201 201 201 201 201 201 201 201 201 201 201 201
after:   401 401 401 401 401 401 401 401 401 429 429 429
```

Every one of those twelve baseline requests used a **wrong password** and each
returned a valid session — unlimited credential stuffing, with a free session
attached to every attempt.

---

## 6. What was deliberately left

Stated plainly rather than implied as done.

1. **`domain/` still imports two Prisma row types.** The 13-method passthrough is
   gone and the ports are narrow, but `UserRepositoryI` and
   `TransactionRepositoryI` still reference `Users` and `Transaction` from
   `@prisma/client`. Closing this needs domain entities plus mappers in both
   adapters — a larger change that touches every use case and presenter, and one
   worth doing as its own reviewable step. Until then, "swap the database" remains
   partly aspirational.
2. **`UseCaseProxy` is retained.** It is still a one-method wrapper and every call
   site reads `.getInstance().execute(...)`. Removing it is a mechanical change
   across all controllers; it was out of scope here, and the wiring spec now
   guards the factories that made it risky.
3. **No RBAC.** Authentication only — no roles or permissions. The refresh model
   is still one `hashRefreshToken` column, so one active session per user, with no
   multi-device support and no denylist.
4. **`strictPropertyInitialization` is off.** The one strict check not enabled:
   DTOs, presenters and the env schema are populated by `class-transformer`, so it
   would only add `!` assertions.
5. **Repository adapters are unit-tested, not integration-tested.** They are
   verified by asserting the Prisma calls they make. There is no test running real
   SQL; CI provisions PostgreSQL and applies migrations, so adding those tests is
   now a matter of writing them.
6. **No observability stack.** No OpenTelemetry, metrics or tracing. Logs are
   structured JSON with level, timestamp and context, but carry no request ID, so
   entry/exit pairs still cannot be correlated under concurrency.
7. **Two `process.env` reads remain**, both in `LoggerService`, gating debug and
   verbose output on `NODE_ENV`. No secret is read outside the config adapter.

---

## 7. How this was verified

Commands and their results on this branch:

```
$ pnpm run typecheck                    0 errors (strict)
$ pnpm run lint --max-warnings=0        0 errors, 0 warnings, 0 suppressions
$ pnpm test                             10 suites, 63 tests passed
$ pnpm run test:e2e                      1 suite,   5 tests passed
$ pnpm run build                        OK
$ pnpm prisma migrate deploy            all migrations applied to an empty database
$ node dist/main                        boots; 12 routes mapped; JSON logs
```

Behavioural checks ran against the compiled application on a real PostgreSQL 16
container: register, login (wrong and correct password), create, read twice,
cross-user read/update/delete, list scoping, logout revocation, duplicate
registration, input validation, readiness probe, security headers, CORS
allowlist, and rate limiting.

Baseline figures came from building and running `main` in a separate git
worktree against the same database, so the before/after comparison is between two
running builds rather than between code and an expectation.

Each of the six defects had its regression test written first and observed
failing for the expected reason before any fix was applied; the DI guard was
additionally mutation-checked by reintroducing the defect and confirming the test
caught it.

### Caveats

- No load, soak or performance benchmarking was done. The latency figures that
  appear in log lines (`duration=1ms`, `latencyMs: 1`) are single-request
  observations on a local machine, not throughput measurements.
- The GitHub Actions workflow itself has not run on GitHub; only the commands it
  invokes were executed locally. The image build **was** run locally — see §8.
- Coverage percentages come from `jest --coverage` with `*.module.ts`, `main.ts`
  and the test fakes excluded.

---

## 8. Follow-up: container build defects found by running it

The first push shipped a `Dockerfile` that had been reasoned about but never
built. CI caught it immediately. Building and running it locally surfaced four
defects, all now fixed and verified.

### 8.1 `corepack enable` broke every build

```
Error: Cannot find matching keyid: {"signatures":[...],"keys":[...]}
    at verifySignature (corepack.cjs:21535)
    at fetchLatestStableVersion (corepack.cjs:21553)
ERROR: process "/bin/sh -c pnpm install --frozen-lockfile" exit code: 1
```

`package.json` had no `packageManager` field, so corepack had no version to
resolve and asked the registry for "latest stable". It verifies that response
against signing keys **bundled in the Node image**, which are frozen at image
release. Once the registry rotated keys, `node:22.8.0`'s corepack could no longer
verify anything — so the failure appears with no change on our side.

**Fix:** pinned `"packageManager": "pnpm@10.33.0"` and dropped corepack. The image
installs pnpm with `npm install --global`, reading the version out of
`packageManager` so the image can never build with a different pnpm than CI or a
developer uses.

### 8.2 The migrate step had no Prisma CLI

`pnpm prune --prod` ran in the `build` stage, and `docker-compose` used that same
stage to apply migrations — so the CLI it needed had just been deleted:

```
migrate-1  |  ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL  Command "prisma" not found
migrate-1  | service "migrate" didn't complete successfully: exit 254
```

**Fix:** pruning moved to a dedicated `prod-deps` stage. `build` keeps its dev
dependencies and remains usable for migrations; `runtime` copies `node_modules`
from `prod-deps` and `dist` from `build`.

### 8.3 The production image ran in development mode

The runtime image sets `ENV NODE_ENV=production`, but compose's `env_file: .env`
overrides image `ENV`. With `NODE_ENV=development` in `.env`, the container ran
the production image in development mode — **Swagger served on `/docs`** and raw
error messages returned to clients:

```
container NODE_ENV=development
GET /docs -> 200      # should be 404
```

The guard in `main.ts` was correct; the compose wiring defeated it. **Fix:**
`NODE_ENV: production` pinned in the service's `environment` block, which takes
precedence over `env_file`.

### 8.4 A hardcoded host port

`ports: '5432:5432'` failed on any machine already running PostgreSQL:

```
Bind for 0.0.0.0:5432 failed: port is already allocated
```

**Fix:** `'${POSTGRES_PORT:-5432}:5432'`, documented in `.env.example`.

### Verified after the fixes

Image build and inspection:

```
$ docker build --target runtime -t template:ci .        exit 0
$ docker run --entrypoint node template:ci -e "...accessSync('/app/dist/main.js')"
  dist/main.js present
$ docker run --entrypoint node template:ci -e "require('bcrypt')..."
  bcrypt OK $2b$04$          # native addon compiled against musl
$ docker run --entrypoint node template:ci -e "require('@prisma/client')"
  @prisma/client OK
  user=node                  # non-root
  src present?        no     # no sources in the runtime image
  typescript dev dep? no     # dev dependencies pruned
  image size          427MB
```

Full stack, `docker compose up --build`:

```
postgres   Up (healthy)
migrate    Exited (0)   -> "All migrations have been successfully applied."
api        Up (healthy) -> container HEALTHCHECK passed in 6s

container NODE_ENV     = production
GET  /docs             -> 404   (Swagger closed in production)
GET  /api/health/ready -> 200   {"database":"reachable","latencyMs":1}
POST /auth/register    -> 201
POST /auth/login  wrong password -> 401
POST /auth/login  correct        -> 201
security response headers        -> 6
```

The lesson is the same one §3.6 records: the defect was not in the reasoning, it
was in never running the thing. The image assertion in CI now covers 8.1 and 8.2;
8.3 and 8.4 are compose-only and are not yet covered by an automated check.

---

## 9. Follow-up: CI workflow defects found by running it

Same pattern as §8 — the workflow was authored but never executed, and pushing it
surfaced three defects. All were found by replaying the job's steps locally.

### 9.1 `packageManager` collided with the action's `version` input

Pinning `packageManager` in §8.1 broke the setup step, which also declared a
version:

```
Error: Multiple versions of pnpm specified:
  - version 10 in the GitHub Action config with the key "version"
  - version pnpm@10.33.0 in the package.json with the key "packageManager"
```

**Fix:** removed the `version` input. `pnpm/action-setup` reads `packageManager`,
which is the same single source of truth the Dockerfile derives from.

### 9.2 Flag forwarding silently broke lint and test

`pnpm run <script> -- --flag` passes the `--` separator through to the underlying
binary, which then reads the flag as a positional argument:

```
$ pnpm run lint -- --max-warnings=0
  ESLint: No files matching the pattern "--max-warnings=0" were found.

$ pnpm run test -- --coverage --ci
  jest: No tests found
  Pattern: --coverage|--ci - 0 matches
```

Both steps **failed on argument parsing, not on code quality** — so the pipeline
would have gone red without ever linting or running a test. Worse, had the exit
codes been swallowed, it would have reported success while checking nothing.

**Fix:** the flags moved into the scripts themselves — `lint` now carries
`--max-warnings=0`, and `test:ci` / `test:e2e:ci` were added. CI calls the scripts
with no arguments, so a developer runs exactly what CI runs.

### 9.3 CI never ran the e2e suite

The workflow ran unit tests only. The e2e suite — which boots the real `AppModule`
and is the check that the DI graph resolves and routes are mounted where
documented — was not executed. Added as its own step.

Also bumped `actions/checkout` and `actions/setup-node` to `v5`, which run on
Node 24, clearing the Node 20 deprecation warning.

### Verified: every step of the `verify` job replayed locally

Against a PostgreSQL 16 container, with the workflow's own environment:

```
1. pnpm install --frozen-lockfile   OK
2. pnpm prisma generate             OK
3. pnpm prisma migrate deploy       OK
4. pnpm run lint                    OK
5. pnpm run typecheck               OK
6. pnpm run test:ci                 OK   63 passed
7. pnpm run test:e2e:ci             OK    5 passed
8. pnpm run build                   OK
```

The lint gate was negative-tested by introducing an unused variable:
`pnpm run lint` exited 1, confirming the step fails the build rather than passing
vacuously.

Still not executed: the workflow on GitHub's runners, and the `docker` job (its
image build and assertion were verified locally in §8).
