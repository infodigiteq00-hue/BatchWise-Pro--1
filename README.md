# BatchWise Pro

BatchWise Pro is designed to run **entirely on your own computer**. There is no required cloud database: the API stores users, firms, BMR requests, settings, and uploaded PDFs as files on disk.

## Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- npm (included with Node.js)

## Install on your PC

### 1. Get the project

Download or clone this repository to a folder on your machine, for example `C:\BatchWise-Pro`.

### 2. One-time setup

From the project root:

```bash
npm run setup
npm run install:all
```

`npm run setup` creates `backend/.env` and `frontend/.env.local` (if missing) and creates the local data directory.

Edit **`backend/.env`** before first use:

| Variable | Purpose |
|----------|---------|
| `SUPER_ADMIN_EMAIL` | Login email for the built-in super admin |
| `SUPER_ADMIN_PASSWORD` | Password for that account |
| `JWT_SECRET` | Long random string (keeps sessions secure on your machine) |
| `DATA_DIR` | Optional. Defaults to `backend/data` — all app data lives here |

### 3. Run the application

```bash
npm run dev
```

- **Web app:** http://localhost:8080  
- **API:** http://localhost:3001/api  

Sign in with the super admin email and password from `backend/.env`. Create firms, teams, templates, and BMR requests — everything is saved locally.

To run API and UI in separate terminals:

```bash
npm run dev:api
npm run dev:web
```

## Where your data is stored

By default, all data is under **`backend/data/`**:

| Path | Contents |
|------|----------|
| `users.json` | Accounts and roles |
| `firms.json` | Companies |
| `templates.json` | BMR template metadata |
| `requests.json` | BMR requests |
| `signatures.json` | QA signatures |
| `settings.json` | Per-firm settings |
| `template-pdfs/` | Uploaded template PDF files |
| `stamped-pdfs/` | Generated stamped PDF files |

To store data elsewhere (e.g. `D:\BatchWiseData`), set in `backend/.env`:

```env
DATA_DIR=D:/BatchWiseData
```

**Backup:** copy the entire `DATA_DIR` folder. **Restore:** stop the API, replace the folder, start again.

## Password reset (local)

If SMTP is not configured in `backend/.env`, forgot-password links are printed in the **API terminal** instead of being emailed. Optional SMTP settings are documented in `backend/.env.example`.

## Frontend API URL

For local use, `frontend/.env.local` should contain:

```env
VITE_API_URL=http://localhost:3001/api
```

The app falls back to this URL if the variable is unset. Do not point `VITE_API_URL` at a hosted API unless you intentionally use a remote backend.

## Project layout

```
batchwise-pro/
├── backend/          # Express API, JSON + PDF storage
├── frontend/         # React / TanStack Start UI
├── scripts/          # setup-local.mjs
└── package.json      # npm run dev, setup, install:all
```

## Desktop app (Windows, macOS, Linux)

The login page includes **Download desktop app** for installers built with **GitHub Actions** and [Electron](https://www.electronjs.org/).

### End users

1. Open `/download` in the web app (or use the link on the login page).
2. Download the installer for your OS (Windows `.exe`, macOS `.dmg`, Linux `.zip`).
3. Install and open **BatchWise Pro** — the app starts the local API and UI automatically.
4. Data is stored under your user profile (see app data folder), not in the cloud.

Download URLs point to:

`https://github.com/<your-org>/<your-repo>/releases/latest/download/`

Set `VITE_GITHUB_REPO` in `frontend/.env.local` if your GitHub repo path differs.

### Publish a new desktop release

1. Update version in `desktop/package.json` if needed.
2. Create and push a tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

3. The workflow [`.github/workflows/release-desktop.yml`](.github/workflows/release-desktop.yml) builds all three platforms and attaches installers to the GitHub Release.

### Build installers locally

```bash
npm run build:desktop
cd desktop && npm install && npm run dist:win   # or dist:mac / dist:linux
```

Output: `desktop/release/`

## Hybrid model (Digiteq control + local BMR data)

For production (Cursor-style): **login and pause on Digiteq’s server**, **BMR/PDF data on each user’s PC**.

| What | Where |
|------|--------|
| Super admin, accounts, pause/active | **Control server** (this API deployed online, `APP_MODE=full`) |
| Templates, BMR requests, PDFs | **User’s PC** (desktop app, `APP_MODE=hybrid`) |

### 1. Deploy the control server (once)

Deploy `backend/` to Render, Railway, a VPS, etc. Example env:

```env
APP_MODE=full
PORT=3001
DATA_DIR=/data
JWT_SECRET=<long-random-string>
SUPER_ADMIN_EMAIL=...
SUPER_ADMIN_PASSWORD=...
CORS_ORIGIN=https://app.batchwisepro.com,http://localhost:8080
FRONTEND_URL=https://app.batchwisepro.com
```

Deploy `frontend/` to Vercel (or similar) with:

```env
VITE_API_URL=https://api.batchwisepro.com/api
```

Super admin uses this web app. Firm users use it to **sign in** and **download** the desktop installer.

### 2. Build desktop installers (hybrid)

Bake the control API URL into the installer:

```bash
CONTROL_API_URL=https://api.batchwisepro.com/api npm run dist:desktop:win
```

Or set GitHub Actions variable **`CONTROL_API_URL`** before tagging a release (see `.github/workflows/release-desktop.yml`).

The desktop app then:

1. Stores BMR data under the user’s AppData / profile folder (`DATA_DIR`).
2. Proxies **login**, **signup**, and **team invites** to the control server.
3. Re-checks **pause/active** with the control server (cached ~90s) on each API call.
4. Blocks all BMR routes when the account or company is paused — even on the local PC.

### 3. Test hybrid mode locally (pause sync)

One command (control on :3001, hybrid desktop API on :3002):

```bash
npm run dev:control+hybrid
```

In another terminal, point the UI at the hybrid API:

```env
# frontend/.env.local
VITE_API_URL=http://localhost:3002/api
```

Then `npm run dev:web`. Super admin pauses a company on **http://localhost:8080** with `VITE_API_URL=http://localhost:3001/api` (control). The hybrid session on :3002 shows **Dashboard paused** on next login or navigation (internet to control server required).

### Flow for end users

1. Browser → sign in on Digiteq web app (control server).
2. Download desktop app → install.
3. Same email/password in the app → BMR work saved locally.
4. Super admin **pauses** company → next login or API check → app shows “Dashboard paused” on that PC too (internet required).

## Optional: fully local deployment

The setup at the top of this README (`npm run dev`) keeps everything on one machine with no control server. Use that for development only; production desktop releases should set `CONTROL_API_URL`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 3001 in use | Stop the other process or set `PORT` in `backend/.env` |
| UI cannot reach API | Confirm `VITE_API_URL=http://localhost:3001/api` and that `npm run dev:api` is running |
| Session expired after restart | Sign in again (normal if the API was restarted) |
| CORS errors | Add your UI origin to `CORS_ORIGIN` in `backend/.env` (defaults include `http://localhost:8080`) |
| Desktop pause not working | Rebuild installer with `CONTROL_API_URL` pointing at your online control API |
| “Cannot reach control server” | User needs internet; verify `CONTROL_API_URL` in the installer matches your deployed API |
