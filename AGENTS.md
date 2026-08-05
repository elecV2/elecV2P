# AGENTS.md

elecV2P — customize personal network. Node.js MITM proxy / task scheduler / script runner with a web UI.

## Quick Facts

- **Language**: Node.js (>= 14.17), CommonJS. No TS, no backend build step.
- **Frontend**: Vue 3 + Vite, built into `web/dist` (committed to git, served by backend).
- **Docs**: `https://github.com/elecV2/elecV2P-dei` (Chinese). Repo comments/docs are largely Chinese.
- **Runtime memory**: ~90 MB idle, ~150 MB with 100 scheduled tasks. All files + deps ~90 MB on disk.
- **Ports**: 80 (webUI, override via `PORT`), 8001 (ANYPROXY HTTP proxy), 8002 (proxy request viewer).
- **Security**: webUI access is gated by IP whitelist/blacklist + cookie/token auth (`isAuthReq` in `webmodule.js`). Webhook token (UUID) is in `script/Lists/config.json` → `wbrtoken`.

## Commands

| Command | What it does |
|---------|-------------|
| `node index.js` | Main entry. Default port 80; override with `PORT=8000` (PowerShell: `$env:PORT="8000";node index.js`). |
| `yarn start` | pm2 start (`pm2 start index.js -n elecV2P --no-daemon`). Use `yarn` (not npm); `yarn.lock` is tracked, `package-lock.json` is gitignored. |
| `npm run webdev` | Vite dev server for frontend (`web/src`). |
| `npm run build` | Vite build → `web/dist`. **Must rebuild + commit after any frontend edit** — `web/dist` is served directly by backend (`webmodule.js`). |
| `npm run dev` | nodemon on `index.js`, hardcoded Windows `set port=12521`. |

## Architecture

```
index.js          → app.js → webmodule.js (Express app, serves web/dist, auth gate, 404)
                                  ↓
                            webser/*.js     → one Express router module per feature
                            func/*.js       → crontask, schedule, task, exec, crt
                            utils/*.js      → logger, file/list/store, eaxios, websocket, string/time
                            script/*.js     → runJSFile (JS/efh runner), context (VM context), rule (MITM rules)
                            config.js       → loads script/Lists/config.json, merges env overrides (PORT, TOKEN, CONFIG, PROXYEN, TZ)
```

- `webmodule.js` — mounts all `webser/*` route modules, serves `web/dist`, 403 auth gate via `isAuthReq`, 404 handler.
- `webser/*.js` — one router per feature: `wbconfig` (settings), `wbjs` (script mgmt), `wbtask` (scheduled tasks), `wbefss` (file mgmt), `wbrun` (run scripts), etc.
- `func/crontask.js` — cron + countdown task scheduling engine.
- `func/schedule.js` — countdown timer logic.
- `func/task.js` — task lifecycle (start/stop/status).
- `func/exec.js` — child_process wrapper for shell commands.
- `func/crt.js` — root CA cert generation (MITM).
- `utils/store.js` — file-based key-value store (`script/Store/`).
- `utils/file.js` — file read/write helpers.
- `utils/eaxios.js` — axios wrapper with proxy support.
- `utils/websocket.js` — WebSocket server for frontend real-time communication.
- `script/runJSFile.js` — runs JS/efh files in VM context.
- `script/context.js` — builds the VM sandbox with `$axios`, `$store`, `$feed`, `$exec`, `$fend`, `$evui`, `$cheerio`, `$download`, `$ws`, `$cache`, `$env`, `$message`, `$done`, etc.
- `script/rule.js` — MITM rule matching engine.
- `config.js` — loads `script/Lists/config.json` and merges env overrides.

## Scripts & EFH

- **JS files**: `script/JSFile/` — user scripts. Called by filename from RULES/REWRITE/TASK/WEBHOOK. Supports multi-level dirs (e.g. `test/exam.js`).
- **Shell scripts**: `script/Shell/` — default cwd for `$exec` shell commands.
- **Persisted data**: `script/Store/` (key-value constants), `script/Lists/` (config, rules, tasks, rewrites, MITM hosts).
- **EFSS**: virtual file server directory (`./efss` by default), managed via webUI.

### EFH Files

`.efh` = self-contained HTML+JS apps — a simple HTML syntax extension that bundles frontend + backend in one file. Run via `/run/?target=name.efh` or via favend in EFSS.

**Structure:**
```html
<div>regular HTML content</div>
<script>
  // frontend JS — runs in browser
  $fend('key', data).then(res => res.text()).then(console.log)
</script>
<!-- backend script tag — exactly ONE, runs on elecV2P server -->
<script favend>
  // backend JS — has access to $request, $store, $axios, $feed, etc.
  $fend('key', { statusCode: 200, headers: {}, body: 'response' })
</script>
```

**Execution model:**
- First request: splits file into frontend HTML + backend JS, caches both.
- GET request: returns frontend HTML directly.
- POST request (from `$fend()`): executes backend JS, returns result.
- Backend `$fend(key, data)` — `key` must match frontend's key. `data` can be string, `{statusCode, headers, body}`, or function `(reqData) => returnValue`.
- Backend has `$request` (url, headers, body, method, hostname, port, path).
- `$done(result)` returns early; code after it won't execute.

**Key rules:**
- Only ONE `<script favend>` tag (backend). Multiple = treated as frontend.
- Frontend `$fend(key, data)` is an async fetch POST (default 5s timeout, configurable via `{timeout: ms}`).
- Backend `$fend('no_match')` without a matching frontend key → no data sent.
- `$fend.clear()` clears efh cache.
- Frontend can use `src` to load remote/local scripts: `<script src="https://...">` or `<script src="/script/webhook.js">` (local, `/script` prefix).
- Backend `src` supports relative/absolute paths without `/script` prefix: `<script favend src="favend.js">`.
- `$` selector: `$('.cls').value` = `document.querySelector`, `$('div', 'all')` = `querySelectorAll`.

**favend (EFSS backend):** Set in EFSS settings → favend. Type "run script" → target = .efh file. Access via `http://host/efss/<key>`. Supports `$env.key` (favend keyword) and `$env.name` (favend name) in backend. Timeout configurable via `?timeout=20000`.

### Script VM Context (key globals)

| Global | Purpose |
|--------|---------|
| `$axios(req, proxy?)` | HTTP requests (axios-based). Supports proxy override. |
| `$cheerio` | HTML parsing (jQuery-like). |
| `$exec(cmd, opts?)` | Shell commands via `child_process.exec`. Default cwd: `script/Shell` (or `script/JSFile` for `node` commands). Timeout 60s. Supports remote file download in cmd. |
| `$download(url, opts?, cb?)` | File download with progress callback. |
| `$feed.push/title/desc/url` | Notifications (RSS, IFTTT, Bark, custom). |
| `$store.get/put/set/delete(key, opts?)` | File-based key-value store (`script/Store/`). Encrypted storage supported via `pass` option. |
| `$cache.get/put/delete/keys/clear` | In-memory temp store (lost on restart). Faster than `$store`. |
| `$evui(options, callback?)` | Generate a draggable/resizable UI window on frontend via WebSocket. |
| `$message.success/error/loading/close` | Show toast messages on frontend. |
| `$ws.send({type, data})` | Send arbitrary WebSocket messages to frontend. |
| `$ws.sse(sseid, data)` | Send SSE events to frontend (requires `new EventSource('/sse/elecV2P/' + sseid)` on frontend). |
| `$fend(key, data)` | EFH frontend-backend communication. |
| `$done(result)` | Return result from script. Priority over last statement. |
| `$env` | Temp env vars (script-scoped, includes `process.env`). |
| `$task` | Task management (sudo mode only): `add/start/stop/delete/info/nameList/status/save`. |
| `$webhook(type, opts?)` | Call webhook API (sudo mode only). |

### Script Variables (double-underscore prefix)

`__version`, `__vernum`, `__home`, `__efss`, `__name`, `__dirname`, `__filename`, `__userid`, `__md5hash`, `__taskid`, `__taskname`.

### @grant Directives

| Grant | Effect |
|-------|--------|
| `sudo` | Enable `$task`, `$webhook` (task management, webhook calls). |
| `nodejs` | Run in native Node.js environment (no `$axios`/`$store`/`$feed`). |
| `require` | Enable `require()` in vm context (disabled by default for compat). |
| `calm` | No log output, but logs still saved to file. |
| `still` | No log output, notifications still fire. |
| `quiet` | Log output, no notifications. |
| `silent` | No log output, no notifications. |

## RULES & REWRITE

- **RULES** (`script/Lists/default.list`): modify network requests (req/res) by matching url/host/useragent/reqmethod/reqbody/resstatus/restype/resbody. Modify via JS, 307 redirect, block (reject/tinyimg), `$HOLD` (frontend edit), or User-Agent swap.
- **REWRITE** (`script/Lists/rewrite.list`): URL pattern → local file / 302 / JS. Simpler than RULES.
- **MITM hosts** (`script/Lists/mitmhost.list`): which HTTPS hosts to decrypt. Required for HTTPS rule matching. Root CA at `rootCA/rootCA.crt` + `rootCA/rootCA.key`.
- **Task list** (`script/Lists/task.list`): scheduled tasks (cron or countdown). Types: `runjs` (JS file), `exec` (shell), `taskstart`/`taskstop` (control other tasks). Supports remote JS with auto-update (default 86400s).

## Tests

- Playwright e2e suites in `test/*.spec.mjs` — run individually: `node test/e2e.spec.mjs`.
- No `npm test` script; tests are not in CI.
- Each suite starts the real server via `webmodule.js` with `PORT=12521` and drives headless Chromium.
- Requires Playwright's chromium browser installed.
- EFH suites (`e2e-efh.spec.mjs`, `e2e-opencode.spec.mjs`) hit real scripts in `script/JSFile` and write real data to `script/Store` — they clean up after themselves.

## Conventions

- Node >= 14.17 (Docker image: node 22 alpine; `Docker/Dockerfile`).
- Frontend i18n: `web/src/i18n/locales/{zh,en}.json` — strings must be added to both.
- No formatter/linter config; match surrounding style (tabs/4-space per file).
- `web/dist` is generated — never hand-edit; rebuild via `npm run build`.
- All list files (`default.list`, `rewrite.list`, `task.list`, `mitmhost.list`) are strict JSON — do not add comments when editing.

## Docker

```sh
# Recommended (docker-compose)
docker-compose up -d

# Manual
docker run --restart=always -d --name elecv2p \
  -e TZ=Asia/Shanghai \
  -p 8100:80 -p 8101:8001 -p 8102:8002 \
  -v /elecv2p/JSFile:/usr/local/app/script/JSFile \
  -v /elecv2p/Lists:/usr/local/app/script/Lists \
  -v /elecv2p/Store:/usr/local/app/script/Store \
  -v /elecv2p/Shell:/usr/local/app/script/Shell \
  -v /elecv2p/rootCA:/usr/local/app/rootCA \
  -v /elecv2p/efss:/usr/local/app/efss \
  elecv2/elecv2p
```

Ports: 8100=webUI, 8101=proxy, 8102=proxy viewer. Change via `-e PORT=xxxx`.

## Webhook API

Endpoint: `GET/POST /webhook?token=<wbrtoken>&type=<type>&...`

| type | Description |
|------|-------------|
| `runjs` | Run a JS file (`fn` param). |
| `shell` | Execute shell command (`command` param). |
| `status` | Get server status. |
| `info` | Get server info. |
| `task` | Task management (start/stop). |
| `security` | IP blacklist/whitelist management. |
| `devdebug` | Dev tools (minishell, rule info, ws client info). |

## Useful Links

- Docs & examples: `https://github.com/elecV2/elecV2P-dei`
- Issues: `https://github.com/elecV2/elecV2P/issues`
- TG channel: `https://t.me/elecV2`
- TG group: `https://t.me/elecV2G`
