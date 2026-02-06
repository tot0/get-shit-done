# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**npm Registry:**
- Used for version checking and package distribution
- Update check: `npm view get-shit-done-cc version` in `hooks/gsd-check-update.js` (line 45)
- Distribution: Published as `get-shit-done-cc` package, installed via `npx get-shit-done-cc`
- Auth: None required for read (public package); npm auth token required for publishing

**GitHub:**
- Repository: `https://github.com/glittercowboy/get-shit-done`
- Used for: Source hosting, releases, changelog links, GitHub Sponsors
- Funding: `github: glittercowboy` (`.github/FUNDING.yml`)
- PR template: `.github/pull_request_template.md`
- No GitHub Actions CI/CD detected

**Discord:**
- Community server invite: `https://discord.gg/5JJgD5svVS`
- Referenced in: `bin/install.js` (line 1311), `commands/gsd/join-discord.md`
- Purpose: Community support, not a programmatic integration

## Data Storage

**Databases:**
- None - GSD uses the filesystem exclusively for all data storage

**File Storage:**
- Local filesystem only
- Install targets: `~/.claude/`, `~/.config/opencode/`, `~/.gemini/`
- Project data: `.planning/` directory in user's project
- Cache: `~/.claude/cache/gsd-update-check.json` for update check results (`hooks/gsd-check-update.js`, line 13)
- Todos: `~/.claude/todos/` directory read by statusline hook (`hooks/gsd-statusline.js`, line 49)

**Caching:**
- File-based only: `~/.claude/cache/gsd-update-check.json`
- Contains: `update_available`, `installed`, `latest`, `checked` (timestamp)
- Written by: Background process spawned in `hooks/gsd-check-update.js`
- Read by: `hooks/gsd-statusline.js` (line 71) to show update indicator in statusline

## Authentication & Identity

**Auth Provider:**
- None - GSD itself has no authentication
- GSD installs into AI coding assistant config directories that handle their own auth:
  - Claude Code: Anthropic API authentication (managed by Claude Code)
  - OpenCode: Model provider authentication (managed by OpenCode)
  - Gemini CLI: Google authentication (managed by Gemini)

## Monitoring & Observability

**Error Tracking:**
- None - All errors are silently caught to avoid breaking host applications
- Pattern: `try { ... } catch (e) { /* silent */ }` in hooks (`hooks/gsd-statusline.js`, `hooks/gsd-check-update.js`)

**Logs:**
- Console output during installation only (`bin/install.js`)
- No persistent logging
- Hooks produce no log output on failure (by design, to not break statusline)

## CI/CD & Deployment

**Hosting:**
- npm registry (`https://www.npmjs.com/package/get-shit-done-cc`)
- GitHub (`https://github.com/glittercowboy/get-shit-done`)

**CI Pipeline:**
- None detected - No `.github/workflows/` directory, no CI configuration files
- PR template mentions manual testing on macOS, Windows, Linux (`.github/pull_request_template.md`)

**Publishing:**
- Manual via `npm publish`
- `prepublishOnly` script runs `npm run build:hooks` automatically before publish
- Version managed in `package.json` (currently 1.11.3)

## Environment Configuration

**Required env vars:**
- None - GSD works with zero configuration

**Optional env vars (install customization):**
- `CLAUDE_CONFIG_DIR` - Custom Claude Code config path (used in `bin/install.js`, line 102)
- `OPENCODE_CONFIG_DIR` - Custom OpenCode config path (used in `bin/install.js`, line 55)
- `OPENCODE_CONFIG` - OpenCode config file location (used in `bin/install.js`, line 60)
- `XDG_CONFIG_HOME` - XDG base directory override (used in `bin/install.js`, line 66)
- `GEMINI_CONFIG_DIR` - Custom Gemini config path (used in `bin/install.js`, line 93)

**Secrets location:**
- No secrets required by GSD itself
- GSD includes security guidance for protecting user project secrets from being read during codebase mapping (documented in `agents/gsd-codebase-mapper.md`, lines 719-735)

## Webhooks & Callbacks

**Incoming:**
- None

**Outgoing:**
- None

## Host Application Integrations

GSD integrates deeply with three AI coding assistants as a plugin/extension system:

**Claude Code:**
- Commands: Installed to `~/.claude/commands/gsd/` as `.md` files with YAML frontmatter
- Agents: Installed to `~/.claude/agents/` as `gsd-*.md` files
- Hooks: `SessionStart` hook for update checking, `statusLine` for context display
- Settings: Modifies `~/.claude/settings.json` to register hooks and statusline
- Invocation: `/gsd:command-name` slash commands

**OpenCode:**
- Commands: Installed to `~/.config/opencode/command/` as `gsd-*.md` (flat structure)
- Agents: Installed to `~/.config/opencode/agents/` as `gsd-*.md`
- Permissions: Configures `~/.config/opencode/opencode.json` for read access to GSD docs
- Conversion: Claude Code frontmatter auto-converted (tool names, paths, color hex codes) in `bin/install.js` (function `convertClaudeToOpencodeFrontmatter`, line 440)
- Invocation: `/gsd-command-name` slash commands (flat, hyphenated)

**Gemini CLI:**
- Commands: Installed to `~/.gemini/commands/gsd/` as `.toml` files (converted from `.md`)
- Agents: Installed to `~/.gemini/agents/` as `gsd-*.md` (with converted frontmatter)
- Settings: Modifies `~/.gemini/settings.json` for hooks and experimental agents
- Conversion: Claude Code format auto-converted (tool names, TOML format, `<sub>` tag stripping) in `bin/install.js` (functions `convertClaudeToGeminiToml` line 549, `convertClaudeToGeminiAgent` line 370)
- Invocation: `/gsd:command-name` slash commands

---

*Integration audit: 2026-02-06*
