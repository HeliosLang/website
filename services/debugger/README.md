# Debugger Worker

This service lives in the **website** repository at `services/debugger`. The website workflow tests, provisions storage and deploys the Worker before uploading the frontend, all from the same commit. See the website README for Cloudflare credentials, production deployment, health checks and rollback. The tx-utils npm package contains only the client and library code.

- `pnpm install --frozen-lockfile`
- `pnpm exec wrangler d1 migrations apply DB --local`
- `pnpm dev`
- `pnpm test`: signed CIP-30 challenge, key/session/API behavior against SQLite SQL
- `pnpm test:runtime`: real workerd/D1/R2 race and retrieval test
- `pnpm check`: Worker deployment dry run
- `pnpm types`: regenerate binding declarations

API v1: `GET /v1/health`; website-only `POST /v1/auth/session`, `POST /v1/auth/challenge`, `POST /v1/auth/verify`, `POST /v1/auth/logout`, `GET/POST /v1/keys`, `DELETE /v1/keys/:id`; bearer-key `GET /v1/project`, `POST/GET /v1/captures`, `GET /v1/captures/:captureId`.

`POST /v1/auth/challenge` takes an address's raw hex bytes. Sign the returned hex payload with CIP-30 `signData`, then submit `{id,signature,key}`. Challenges expire after five minutes and are atomically consumed. A successful verification establishes a one-hour HttpOnly session bound to the address's spending public key hash. Authentication supports public-key Shelley payment addresses; hashed/detached CIP-30 payloads and script credentials are rejected.

Key creation takes `{name}` and returns `{id,apiKey}` once. Subsequent listing contains no secret or hash. Keys can upload and read only their own feed, including when embedded in a public browser app. Never treat a browser-distributed key as a private capability.

Capture v1 is documented in the tx-utils package at `src/debugger/capture-v1.schema.json`. Listing accepts `?cursor=<seq>` and returns `{captures,cursor}` in ascending sequence order, up to 100 entries. Upload retries with the same key/capture ID are idempotent. Payload objects use unique upload names so racing retries cannot overwrite a published payload. An R2 lifecycle removes interrupted-upload orphans; hourly cleanup removes expired payloads and database rows.

Defaults: 10 MiB request limit, 30-day retention, 120 requests/minute/IP and 60 requests/minute/key. Deployment must enable the R2 lifecycle configured by the website provisioner. D1 stores only SHA-256 hashes of random 256-bit API keys and session secrets. Credentialed CORS is restricted to `WEBSITE_ORIGIN`; bearer capture endpoints allow browser origins without cookies.

Reconnect checks the HttpOnly session cookie with `POST /v1/auth/session` and the connected wallet address. An unexpired session is reused only when its payment-key hash matches; challenges remain single-use. Logout invalidates the server session. The browser stores only its preferred wallet provider ID in localStorage, never signatures, session tokens or API keys. Session expiry requires signing again.

`GET /v1/project` resolves the project associated with `Authorization: Bearer <api-key>` and returns `{id,name,created_at}`. The project ID is the API-key record ID; `created_at` is a Unix timestamp in seconds. No wallet session is needed. Missing, invalid, or revoked keys return 401. The response contains no wallet identity, secret, or key hash, is not cached, and uses the same per-key/IP rate limits and cookie-free browser CORS as capture endpoints.

```sh
curl https://debugger.helios-lang.io/v1/project \
  -H "Authorization: Bearer $HELIOS_DEBUGGER_API_KEY"
```
