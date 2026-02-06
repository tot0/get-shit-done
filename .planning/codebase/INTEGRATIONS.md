# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**Package Registry:**
- npm Registry - update check via `npm view get-shit-done-cc version` in `hooks/gsd-check-update.js`
  - SDK/Client: `child_process.execSync` in `hooks/gsd-check-update.js`
  - Auth: Not required (public registry) in `hooks/gsd-check-update.js`

## Data Storage

**Databases:**
- Not detected in `package.json`, `bin/install.js`, `hooks/gsd-check-update.js`

**File Storage:**
- Local filesystem only (config and assets) in `bin/install.js`
- Cache file at `~/.claude/cache/gsd-update-check.json` in `hooks/gsd-check-update.js`, `hooks/gsd-statusline.js`

**Caching:**
- Local JSON cache file `~/.claude/cache/gsd-update-check.json` in `hooks/gsd-check-update.js`

## Authentication & Identity

**Auth Provider:**
- Not detected in `package.json`, `bin/install.js`, `hooks/gsd-check-update.js`
  - Implementation: Not applicable in `bin/install.js`

## Monitoring & Observability

**Error Tracking:**
- Not detected in `package.json`, `bin/install.js`

**Logs:**
- Console output only in `bin/install.js`, `hooks/gsd-check-update.js`, `hooks/gsd-statusline.js`

## CI/CD & Deployment

**Hosting:**
- npm package distribution via `bin/install.js` specified in `package.json`

**CI Pipeline:**
- Not detected in `package.json`, `scripts/`, `.github/`

## Environment Configuration

**Required env vars:**
- `CLAUDE_CONFIG_DIR`, `GEMINI_CONFIG_DIR`, `OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG`, `XDG_CONFIG_HOME` used for config discovery in `bin/install.js`

**Secrets location:**
- Not detected in `package.json`, `bin/install.js`

## Webhooks & Callbacks

**Incoming:**
- None detected in `bin/install.js`, `hooks/gsd-check-update.js`

**Outgoing:**
- None detected in `bin/install.js`, `hooks/gsd-check-update.js`

---

*Integration audit: 2026-02-06*
