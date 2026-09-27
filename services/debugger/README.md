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

Key creation takes `{name}` and returns `{id,apiKey}`. The same key is recoverable through explicitly approved CLI login. Subsequent listing contains no secret or hash. Keys can upload and read only their own feed, including when embedded in a public browser app. Never treat a browser-distributed key as a private capability.

Capture v1 is documented in the tx-utils package at `src/debugger/capture-v1.schema.json`. Listing accepts `?cursor=<seq>` and returns `{captures,cursor}` in ascending sequence order, up to 100 entries. Upload retries with the same key/capture ID are idempotent. Payload objects use unique upload names so racing retries cannot overwrite a published payload. An R2 lifecycle removes interrupted-upload orphans; hourly cleanup removes expired payloads and database rows.

Defaults: 10 MiB request limit, 30-day retention, 120 requests/minute/IP and 60 requests/minute/key. Deployment must enable the R2 lifecycle configured by the website provisioner. D1 stores SHA-256 hashes for API-key and session authentication, plus encrypted API-key secrets for approved CLI login. Credentialed CORS is restricted to `WEBSITE_ORIGIN`; bearer capture endpoints allow browser origins without cookies.

Reconnect checks the HttpOnly session cookie with `POST /v1/auth/session` and the connected wallet address. An unexpired session is reused only when its payment-key hash matches; challenges remain single-use. Logout invalidates the server session. The browser stores only its preferred wallet provider ID in localStorage, never signatures, session tokens or API keys. Session expiry requires signing again.

`GET /v1/project` resolves the project associated with `Authorization: Bearer <api-key>` and returns `{id,name,created_at}`. The project ID is the API-key record ID; `created_at` is a Unix timestamp in seconds. No wallet session is needed. Missing, invalid, or revoked keys return 401. The response contains no wallet identity, secret, or key hash, is not cached, and uses the same per-key/IP rate limits and cookie-free browser CORS as capture endpoints.

```sh
curl https://debugger.helios-lang.io/v1/project \
  -H "Authorization: Bearer $HELIOS_DEBUGGER_API_KEY"
```

## CLI browser authorization

`helios login` (from `@helios-lang/contract-utils`) starts `POST /v1/cli/logins`. Its response is `{id,token,code,expires,interval,verificationUri}`. The request expires in ten minutes; `interval` is five seconds. Only the public request ID appears in the browser URL. The CLI keeps the `hcli_…` bearer token in memory and polls `GET /v1/cli/logins/:id`.

The Console uses wallet-session-authenticated `GET/POST/DELETE /v1/auth/cli-logins/:id` to inspect, approve, or cancel the request, restricted to the exact website origin. Approval requires at least one active project. The code must match the terminal and approval must be explicit. A request can be approved only once and is then bound to the approving wallet.

Polling returns `{state:"pending"}`, `{state:"cancelled"}`, or `{state:"completed"}`. While approved, it returns `{state:"approved",wallet,projects:[{id,name,created_at,apiKey}]}`. Only active keys for that wallet are decrypted. Delivery can be retried until expiry or completion. After saving the JSON file, the CLI acknowledges `POST /v1/cli/logins/:id/complete`; acknowledgments are idempotent, and completed requests cannot retrieve credentials. The browser polls its session-authenticated status and displays success only after this acknowledgment. Requests without the correct private token cannot download keys. Expired requests return 410 and are removed by scheduled cleanup.

Migration `0002_cli_login.sql` adds the login table and encrypted project secrets without resetting existing tables. API-key authentication still uses SHA-256 hashes. Recoverable secrets use AES-256-GCM with a fresh nonce and project/wallet identity as authenticated data. Set `DEBUGGER_KEY_ENCRYPTION_KEY` to a base64-encoded 32-byte Worker secret. For local development put a **local-only** key in ignored `.dev.vars`, then apply local migrations. A missing/wrong key prevents creation/recovery but never causes a plaintext fallback. Metadata endpoints return neither ciphertext nor secrets.

This rollout assumes no existing API keys. Hash-only legacy rows cannot be recovered: revoke and recreate any such keys before CLI login. There is no automated legacy-key recovery. Keep the encryption secret backed up; changing it without re-encrypting existing rows makes those secrets unrecoverable through login. To rotate while preserving keys, stop creation/recovery, back up D1, decrypt/re-encrypt every active row using the old/new keys and unchanged identity, validate them, replace the Worker/GitHub secret, then resume. Rotation is a separate maintenance operation; deployments must reuse the existing secret.

Cross-repository login integration: after `pnpm test:runtime`, run `node test/cli-integration.mjs /path/to/contract-utils` to exercise the actual CLI against workerd and verify local JSON persistence and repeat login.

### Website project capture pages

`/console/project?id=<project-id>` restores the website session and displays the project's failed captures, newest first. Each evaluation shows its validator name (when matching captured source metadata is available), phase, failure, and exact CBOR arguments with copy buttons. Capture rows remain readable by the owning wallet after key revocation until retention expires.

Website-only endpoints, requiring the exact website Origin and session cookie:

- `GET /v1/keys/:id/captures?before=<sequence>`: up to 10 failed captures and a nullable `nextCursor`.
- `GET /v1/keys/:id/captures/:captureId`: the stored capture payload.

These endpoints enforce wallet ownership and never recover or expose project API keys. Successful and expired captures are excluded. API-key-authenticated CLI feeds keep their existing routes and behavior.
