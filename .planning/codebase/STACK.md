# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- JavaScript (CommonJS) - All runtime code: installer, hooks, build script

**Secondary:**
- Markdown - Commands, agents, workflows, templates, references (~85% of codebase by file count)
- YAML - Frontmatter in `.md` files for agent/command metadata
- JSON - Configuration files (`package.json`, `config.json`)

## Runtime

**Environment:**
- Node.js >= 16.7.0 (declared in `package.json` `engines` field)
- Current development environment: Node.js v22.17.1

**Package Manager:**
- npm v10.9.2
- Lockfile: `package-lock.json` (present, lockfileVersion 3)

## Frameworks

**Core:**
- None - This is a zero-dependency Node.js CLI tool. All runtime code uses only Node.js built-in modules.

**Testing:**
- None - No test framework detected. No test files exist in the codebase.

**Build/Dev:**
- esbuild ^0.24.0 (v0.24.2 installed) - devDependency, used for hook bundling via `scripts/build-hooks.js`

## Key Dependencies

**Runtime Dependencies:**
- None (`"dependencies": {}` in `package.json`). The project deliberately has zero runtime dependencies.

**Dev Dependencies:**
- `esbuild` ^0.24.0 - Used by `npm run build:hooks` to copy hook files to `hooks/dist/` for distribution. Despite being esbuild, the current `scripts/build-hooks.js` only copies files (no actual bundling), since hooks are pure Node.js with no external imports.

**Node.js Built-in Modules Used:**
- `fs` - File system operations (reading/writing configs, copying files during install)
- `path` - Path manipulation (cross-platform path handling)
- `os` - Home directory detection (`os.homedir()`)
- `readline` - Interactive terminal prompts during installation
- `child_process` - `spawn`/`execSync` for background update checks (`npm view`)

## Configuration

**Environment Variables (optional, for non-default install locations):**
- `CLAUDE_CONFIG_DIR` - Override Claude Code config directory (default: `~/.claude`)
- `OPENCODE_CONFIG_DIR` - Override OpenCode config directory
- `OPENCODE_CONFIG` - OpenCode config file path (dirname used)
- `XDG_CONFIG_HOME` - XDG base directory for OpenCode (default: `~/.config`)
- `GEMINI_CONFIG_DIR` - Override Gemini config directory (default: `~/.gemini`)

**Project Configuration:**
- `package.json` - npm package metadata, version, scripts, engine requirements
- `get-shit-done/templates/config.json` - Default GSD project configuration template (modes, gates, parallelization settings)

**Build Configuration:**
- `scripts/build-hooks.js` - Build script that copies hooks to `hooks/dist/`
- `npm run build:hooks` - Build command
- `npm run prepublishOnly` - Runs `build:hooks` before npm publish

**Target Runtime Configuration (written during install):**
- `~/.claude/settings.json` - Claude Code settings (hooks, statusline)
- `~/.config/opencode/opencode.json` - OpenCode permissions and config
- `~/.gemini/settings.json` - Gemini settings (hooks, statusline, experimental agents)

## Platform Requirements

**Development:**
- Node.js >= 16.7.0
- npm (for dependency installation and publishing)
- Git (for version control)
- macOS, Windows, or Linux (cross-platform path handling in `bin/install.js`)

**Distribution:**
- Published to npm registry as `get-shit-done-cc`
- Installed via `npx get-shit-done-cc`
- No compilation step needed for end users - JavaScript runs directly

**Target Platforms (where GSD installs to):**
- Claude Code (`~/.claude/`)
- OpenCode (`~/.config/opencode/`)
- Gemini CLI (`~/.gemini/`)

## npm Package Structure

**Published files** (declared in `package.json` `files` field):
- `bin/` - Entry point (`install.js`)
- `commands/` - Slash command definitions (`.md`)
- `get-shit-done/` - Core workflows, templates, references (`.md`)
- `agents/` - Sub-agent definitions (`.md`)
- `hooks/dist/` - Built hook files (`.js`)
- `scripts/` - Build scripts

**Binary:**
- `get-shit-done-cc` → `bin/install.js` (npm bin entry point)

---

*Stack analysis: 2026-02-06*
