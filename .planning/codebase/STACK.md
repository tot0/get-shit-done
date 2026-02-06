# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- JavaScript (Node.js) - CLI and hook scripts in `bin/install.js`, `hooks/gsd-check-update.js`, `hooks/gsd-statusline.js`, `scripts/build-hooks.js`

**Secondary:**
- Markdown - command and reference content in `commands/`, `agents/`, `get-shit-done/`

## Runtime

**Environment:**
- Node.js >=16.7.0 - specified in `package.json`

**Package Manager:**
- npm - inferred from `package-lock.json`
- Lockfile: present in `package-lock.json`

## Frameworks

**Core:**
- Not detected in `package.json`

**Testing:**
- Not detected in `package.json`

**Build/Dev:**
- esbuild ^0.24.0 - build tool dependency in `package.json`

## Key Dependencies

**Critical:**
- esbuild ^0.24.0 - build tooling dependency in `package.json`

**Infrastructure:**
- Not detected in `package.json`

## Configuration

**Environment:**
- Config directory selection via env vars `CLAUDE_CONFIG_DIR`, `GEMINI_CONFIG_DIR`, `OPENCODE_CONFIG_DIR`, `OPENCODE_CONFIG`, `XDG_CONFIG_HOME` in `bin/install.js`
- CLI config override via `--config-dir` flag in `bin/install.js`

**Build:**
- Build script entry points in `package.json`
- Hook packaging logic in `scripts/build-hooks.js`

## Platform Requirements

**Development:**
- Node.js >=16.7.0 per `package.json`
- npm with lockfile support per `package-lock.json`

**Production:**
- npm-distributed CLI entry point `bin/install.js` per `package.json`

---

*Stack analysis: 2026-02-06*
