# Ka Education — Self-Hosted

Single-page education portal for Ka Architecture. Mirrors the public site and
appends four live-data sections proxied through an Express server.

## Prerequisites

- Node.js 22+
- npm 10+
- A running Ka Education Backend (Fastify, e.g. on port 3007)
- A read-only service JWT from `npm run svc:token` on the backend

## Quick start

```bash
# 1. Clone
git clone https://github.com/<your-org>/ka-education.git
cd ka-education

# 2. Configure
cp .env.example .env
#   Edit .env — set KA_EDU_API_BASE and KA_EDU_JWT

# 3. Build + run
npm install
npm run build
npm start
```

The server listens on **PORT** (default `3008`).

## Environment variables

| Variable         | Required | Example                        | Notes                                |
|-----------------|----------|--------------------------------|--------------------------------------|
| `PORT`          | no       | `3008`                         | TCP port to listen on                |
| `KA_EDU_API_BASE` | yes    | `http://127.0.0.1:3007`        | Fastify backend base URL             |
| `KA_EDU_JWT`    | yes      | `eyJ...`                       | Read-only service token (never sent to browser) |

Neither `KA_EDU_API_BASE` nor `KA_EDU_JWT` ever leave the Express process.
The browser only calls same-origin `/api/*` routes.

## Build output

```
dist/
  public/     ← Vite-built static SPA (served by Express)
  server.mjs  ← esbuild-bundled Express server
```

## API routes (server-side proxy)

| Method | Path                    | Description                                      |
|--------|-------------------------|--------------------------------------------------|
| GET    | `/api/projects/search`  | Proxies to `KA_EDU_API_BASE/projects/search` with Bearer auth |
| GET    | `/api/handles/search`   | Same — strips `email`, `emailAddress`, `email_address` from every result |
| POST   | `/api/ask-scholar`      | Keyword router → projects + handles endpoints    |

## Systemd service (Linux)

See `deploy/ka-education.service` for a ready-made unit file.

```bash
sudo cp deploy/ka-education.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now ka-education
sudo systemctl status ka-education
```

## Updating

```bash
git pull
npm install
npm run build
sudo systemctl restart ka-education
```

## Attribution

Ka Architecture™ · Dr. Tdka Kilimanjaro · University of KMT  
<https://universityofkmt.myshopify.com>
