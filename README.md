# Kaeru

Kaeru is a calm, minimal Kanban + Pomodoro app for a quiet personal workflow, letting you organize tasks and focus sessions in a Zen-inspired interface.

## Current Status

Kaeru now runs through a small Node server:

- React 19 + Vite frontend
- Express API/server
- SQLite persistence through `better-sqlite3`
- SQL migrations in `server/db/migrations`
- Reducer-based board actions shared by the UI and API
- First-run admin setup
- Session cookie login/logout
- Password hashing with Node `crypto.scrypt`
- `localStorage` remains as a safety net and one-time import source

TOTP, recovery codes, and fuller multi-user board management are planned next. Public registration is disabled by default.

## Run Locally

```bash
npm install
npm run dev
```

The server starts at `http://127.0.0.1:5173/` by default. In development it serves the API and Vite frontend from the same port.

## Database

The default SQLite database is:

```text
data/kaeru.sqlite
```

Create or update the database manually with:

```bash
npm run migrate
```

`npm run dev` and `npm start` also run migrations before serving the app.

## Build And Production Start

```bash
npm run build
npm start
```

In production, the Node server serves the static `dist/` build and the API from the same process.

## Docker

Build the production image locally:

```bash
docker build -t kaeru:latest .
```

Run it with Docker Compose:

```bash
cp .env.production.example .env
docker compose up -d
```

Compose stores SQLite data in the named `kaeru-data` volume and serves the app at `http://127.0.0.1:5173/` by default. For a VPS, update `.env` first:

```bash
APP_URL=https://kaeru.example.com
SESSION_SECRET=replace-with-a-long-random-secret
KAERU_SETUP_TOKEN=replace-with-a-long-random-setup-token
KAERU_IMAGE=ghcr.io/YOUR_GITHUB_USERNAME/kaeru:latest
```

Then pull and start the published image:

```bash
docker compose pull
docker compose up -d
```

The image exposes port `5173`, runs migrations on startup, serves the built React app from `dist/`, and keeps the SQLite database at `/data/kaeru.sqlite` inside the container.

## GitHub Container Registry

The workflow in `.github/workflows/docker-publish.yml` publishes the image to GitHub Container Registry when you push to `main`, push a `v*.*.*` tag, or run the workflow manually.

The published image name is:

```text
ghcr.io/<github-owner>/kaeru
```

To publish from your machine instead of GitHub Actions:

```bash
docker buildx build --platform linux/amd64,linux/arm64 -t ghcr.io/YOUR_GITHUB_USERNAME/kaeru:latest --push .
```

## Configuration

Copy `.env.example` to `.env` for local or production configuration.

Important variables:

- `APP_URL`
- `HOST`
- `PORT`
- `DATABASE_URL`
- `SESSION_SECRET`
- `KAERU_SETUP_TOKEN`
- `ALLOW_REGISTRATION`
- `ENABLE_TOTP`
- `LOG_LEVEL`

For a VPS behind a reverse proxy, use `HOST=127.0.0.1` if the proxy is on the same machine, or `HOST=0.0.0.0` if the process must listen on the network directly.

## Architecture Notes

Current structure:

- `src/App.jsx`: app orchestration and UI state
- `src/components/`: UI components for header, board, columns, cards, editor, Pomodoro panel
- `src/hooks/usePersistentBoard.js`: frontend persistence bridge
- `src/state/boardReducer.js`: board normalization and mutations
- `src/utils/`: small reusable helpers
- `server/index.js`: Express server, API, Vite dev middleware, static production serving
- `server/middleware/auth.js`: session cookie handling and auth guard
- `server/db/`: SQLite connection and migrations
- `server/repositories/`: database reads/writes
- `server/services/`: action validation and business operations
- `server/routes/`: HTTP API routes

The important rule going forward: integrations, agents, and scripts should call service/API actions instead of writing directly to SQLite.

## API

Current internal API:

- `GET /api/health`
- `GET /api/auth/status`
- `POST /api/auth/setup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/register` when `ALLOW_REGISTRATION=true`
- `GET /api/board`
- `PUT /api/board`
- `POST /api/board/actions`

Board endpoints require an authenticated session. This API is intentionally small; future phases should split board actions into more explicit validated endpoints.

## Backups

Back up the SQLite database file regularly:

```bash
cp data/kaeru.sqlite data/kaeru.backup.sqlite
```

For safer production backups, stop the app briefly or use SQLite online backup tooling.

## Security Notes

Before production use:

- Change `SESSION_SECRET`.
- Set `KAERU_SETUP_TOKEN` before first-run setup on a public VPS, then remove or rotate it after the first admin exists.
- Use HTTPS behind a reverse proxy such as Caddy or Nginx.
- Keep the SQLite database outside publicly served directories.
- Back up the SQLite database regularly.
- Disable public registration unless you explicitly need it.
- Keep the VPS and dependencies updated.
