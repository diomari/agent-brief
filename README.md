# Brief Context

**The missing handoff tool for AI coding agents.**

Do not start another AI coding session cold.

Brief gives coding agents the project context they need before they touch the codebase. It creates and maintains a lean, refreshable handoff document that explains what the project is, how it works, what recently changed, and what the next agent needs to know.

It is not a repo dump.  
It is not another bloated `AGENTS.md`.  
It is not a conversation summary.

It is the missing project handoff layer between AI coding sessions.

```txt
/brief
```

Run it before a new session.  
Run it after major changes.  
Run it before handing work from one agent to another.

---

**Package:** `brief-ctx`  
**Repository:** <https://github.com/diomari/brief-ctx>  
**Output:** `PROJECT_CONTEXT.md`

`brief-ctx` gives Pi, Claude Code, Codex, Cursor/Windsurf-style rule files, and terminal workflows a shared briefing layer. In Pi, Claude Code, and Codex it exposes `/brief`; everywhere else it can run as `brief-ctx brief` or export small rules that tell the next agent to read the generated handoff first.

## Why this exists

AI coding agents are most useful after they understand a project’s shape: stack, commands, key files, risky systems, conventions, and unknowns. Today that context is often scattered across:

- `README.md`, which is written for humans and often focused on product/setup
- `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, or `.windsurfrules`, which are usually hand-maintained and can drift
- long first-turn prompts that disappear after compaction or session reset
- agent-specific memories that do not travel across tools
- full repo scans that waste context and can overfit to irrelevant files

`brief-ctx` creates a **small, factual, generated project map** that any agent can read before doing work.

## What makes it useful

- **Agent-neutral:** one core powers Pi, Claude Code, Codex, and the CLI; export helpers cover Cursor/Windsurf-style rule files.
- **Lean by default:** compact output targets roughly 50–80 lines, not a giant audit.
- **Idempotent:** re-run `/brief` as the project evolves; it updates `PROJECT_CONTEXT.md` in place.
- **Safe:** skips secrets, generated folders, large files, `.git`, `node_modules`, build output, and real `.env` files.
- **Factual:** architecture claims come from files, folders, package scripts, and config signals.
- **Workflow-friendly:** generated brief plus kickoff prompt nudges agents to inspect relevant files before editing.
- **Dependency-light:** no runtime dependencies, no embeddings, no daemon, no database requirement.

## Who it is for

`brief-ctx` is designed for:

- developers who switch between Pi, Claude Code, Codex, Cursor, Windsurf, and terminal agents
- maintainers who want every agent session to start with the same project context
- teams with fast-moving architecture where hand-written agent files get stale
- consultants or freelancers opening unfamiliar repos repeatedly
- solo builders who want compact context after session resets or compaction
- package authors who want a simple, host-agnostic briefing primitive

It is especially useful when a repo is too large to dump into chat, but not large enough to justify a full indexing/search system.

## How it compares

| Approach | Strength | Limitation | Where `brief-ctx` fits |
| --- | --- | --- | --- |
| `README.md` | Great human-facing docs | Often product/setup focused; may omit agent risks and commands | Generates an agent-facing operational map |
| `AGENTS.md` | Good persistent agent instructions | Manual, easy to forget, often repo-specific prose | Generates fresh architecture facts; can complement `AGENTS.md` |
| `CLAUDE.md` | Useful for Claude Code behavior | Claude-specific and hand-maintained | Works across Claude Code, Pi, Codex, and CLI |
| `.cursorrules` / `.windsurfrules` | Editor-specific style guidance | Not portable across agents; usually rules not repo map | Produces portable project context, not editor rules |
| Agent memory | Convenient across sessions | Tool-specific and sometimes invisible | Writes explicit repo-local context any agent can read |
| Full repo indexing / RAG | Powerful for search-heavy repos | More moving parts, more cost, more stale index risk | Keeps a tiny generated summary for first orientation |
| Prompt-only templates | Easy to install | Cannot reliably inspect files or write/update context | Actually scans and writes `PROJECT_CONTEXT.md` |

`brief-ctx` is intentionally smaller than an agent framework and more automated than a hand-written instruction file.

## Install

### Pi

From this package directory:

```bash
pi install -l .
```

Or install the published package:

```bash
pi install npm:brief-ctx
```

Or run the extension directly while developing:

```bash
pi -e ./extensions/brief.ts
```

> **Local tarball note:** do not pass `brief-ctx-*.tgz` directly to `pi install` or `pi -e`.
> Pi treats local file paths as single extension files, so a `.tgz` path fails with
> “Unknown file extension .tgz”. For local testing, install the package directory (`pi install -l .`)
> or extract the tarball and install the extracted directory:
>
> ```bash
> npm pack
> rm -rf /tmp/brief-ctx-pack
> mkdir -p /tmp/brief-ctx-pack
> tar -xzf brief-ctx-*.tgz -C /tmp/brief-ctx-pack --strip-components=1
> pi install -l /tmp/brief-ctx-pack
> ```

### Claude Code

Install the plugin in `adapters/claude-code/` (see its README). It exposes `/brief`, which shells out to the `brief-ctx` CLI.

### Codex

Copy `adapters/codex/prompts/brief.md` into `~/.codex/prompts/` (see its README).

### CLI: any agent or terminal

```bash
npx --yes brief-ctx brief
npx --yes brief-ctx brief --full

# or install globally
npm install -g brief-ctx
brief-ctx brief
```

The CLI is the shared entrypoint used by the Claude Code and Codex adapters. Status goes to stderr; the kickoff prompt goes to stdout so agents can capture it. Requires Node 22.6+.

## Agent switching install/export helpers

`brief-ctx` can print setup instructions for each host so the same `PROJECT_CONTEXT.md` travels across tools:

```bash
brief-ctx install pi
brief-ctx install claude-code
brief-ctx install codex
brief-ctx install cursor
brief-ctx install windsurf
brief-ctx install all
```

It can also export tiny rule/prompt snippets for agents that do not install executable slash commands:

```bash
brief-ctx export agents-md > AGENTS.md
brief-ctx export cursor > .cursor/rules/brief-ctx.md
brief-ctx export windsurf > .windsurfrules
brief-ctx export prompt
```

The generated snippets point agents to `PROJECT_CONTEXT.md` instead of duplicating context.

## Usage

```txt
/brief
/brief --full
/brief --update
/brief --task "add login page"
/brief --dry-run
/brief --output .pi/PROJECT_CONTEXT.md
```

`/brief` is idempotent. If `PROJECT_CONTEXT.md` already exists, it updates that file in place rather than creating a duplicate. `--update` is accepted as an explicit form of the default update behavior.

## What it generates

By default, `/brief` writes a compact `PROJECT_CONTEXT.md` in the current project. It summarizes:

- stack: project type, package identity, Pi gallery metadata, language, runtime, package manager, framework, database/ORM, deployment, and project size
- commands: install, dev, build, typecheck, lint, test, database scripts, and package validation when detected
- map: entry points, core source, CLI, Pi extensions, prompts, adapters, tests, types, routes, API/server, components, logic, data, and config/deploy areas
- key files ranked by relevance
- risk areas such as auth, billing, migrations, secrets, package publishing, deployment, and jobs
- an Agent Switching section so the next tool knows how to refresh and reuse `PROJECT_CONTEXT.md`
- grouped unknowns instead of repeated “Not detected” lines
- safe editing rules and a short fresh-session prompt

It also writes `.pi/brief.json`, a machine-readable cache with stable detection data. The cache is for tooling and comparisons, not for bloating the agent context.

## How the scanner finds high-signal files

`brief-ctx` is intentionally selective. It does **not** recursively read your whole source tree or paste code into the brief. Instead, it combines a shallow project inventory with a small set of safe metadata reads and scoring rules.

### 1. Start with top-level project shape

The scanner reads the project root and records top-level files and directories. This catches the signals agents need first:

- manifests: `package.json`
- lockfiles: `pnpm-lock.yaml`, `bun.lock`, `yarn.lock`, `package-lock.json`
- framework config: `next.config.*`, `vite.config.*`, `astro.config.*`, `app.config.*`
- deployment config: `wrangler.toml`, `Dockerfile`, `docker-compose.yml`, `vercel.json`
- common app folders: `src/`, `app/`, `pages/`, `routes/`, `server/`, `api/`, `components/`, `lib/`, `db/`, `prisma/`, `supabase/`
- package/tool folders: `extensions/`, `prompts/`, `adapters/`, `test/`, `types/`
- agent/human docs: `README.md`, `AGENTS.md`, `CLAUDE.md`

Top-level shape is usually enough to orient an agent without spending tokens on every file.

### 2. Read only small, known-safe metadata

The core reads a tiny allowlist of useful metadata files when they exist and are under the size cap:

- `package.json` — dependencies and scripts
- `.env.example` — safe documented environment shape
- `wrangler.toml` — Cloudflare resources and deployment hints

Real `.env` files are skipped entirely. Files over the read cap are ignored. Source files are not embedded.

### 3. Count source/config files without reading them

To estimate project size, `brief-ctx` walks countable source/config extensions and skips noisy or unsafe directories. This gives categories like `tiny`, `small`, `medium`, or `large`, which controls how aggressively the brief summarizes.

Skipped directories include:

- `.git/`
- `node_modules/`
- `dist/`, `build/`, `out/`, `.next/`
- `.vercel/`, `.turbo/`, `.cache/`
- `coverage/`

The count has depth and file caps, so large repos do not turn into unbounded scans.

### 4. Convert signals into facts

Detection is based on concrete signals, for example:

- `next` dependency, `next.config.*`, `app/`, or `pages/` → Next.js
- `vite` dependency or `vite.config.*` → Vite
- `astro` dependency or `astro.config.*` → Astro
- `wrangler.toml` or Cloudflare worker dependencies → Cloudflare Workers
- `prisma/`, `prisma`, or `@prisma/client` → Prisma
- `drizzle.config.*` or `drizzle-orm` → Drizzle
- `DATABASE_URL` in `.env.example` → database signal, without reading secrets
- `pi-package`, `pi.image`, `pi.extensions`, or `pi.prompts` in `package.json` → Pi package/gallery signals
- `bin` in `package.json` → CLI tool signal
- `adapters/` → multi-agent adapter package signal
- scripts like `test`, `lint`, `typecheck`, `db:migrate` → runnable commands

If a signal is not present, the brief uses `Unknowns` instead of inventing architecture.

### 5. Score key files by usefulness

Key files are ranked before rendering. High-signal files win; low-signal files are omitted unless they explain something important.

Examples of scoring priorities:

- `AGENTS.md`, `CLAUDE.md` — agent instructions
- `README.md` — project documentation
- `package.json` — scripts and dependencies
- framework/tool config — build and runtime behavior
- `.env.example` — safe env contract
- `prisma/`, `supabase/`, `db/` — data layer
- `Dockerfile`, `docker-compose.yml`, `wrangler.toml`, `vercel.json` — deploy/runtime risk
- `extensions/`, `prompts/`, `adapters/` — agent package integration points
- `test/`, `types/`, `CHANGELOG.md`, `preview.jpg` — validation, shims, release notes, and gallery assets
- `src/`, `app/`, `components/`, `lib/`, `server/` — implementation map

Lockfiles are intentionally not listed as key files because package-manager detection already captures their useful signal.

## Example output

A compact generated `PROJECT_CONTEXT.md` looks like this:

```md
# Project Context

Generated by `brief-ctx` via `/brief` (compact). Package version: 1.1.0. Run `/brief --full` for a broader brief. Re-run `/brief` whenever architecture gets stale.

## Stack
- Language: TypeScript
- Runtime: Node.js
- Package manager: pnpm
- Framework: Next.js
- Database / ORM: Prisma, Postgres
- Deployment: Vercel, GitHub Actions
- Size: small (~74 source/config files)

## Commands
- Install: pnpm install
- Dev: pnpm dev
- Build: pnpm build
- Typecheck: pnpm typecheck
- Lint: pnpm lint
- Test: pnpm test
- DB/migrations: pnpm db:migrate
- Package check: npm pack --dry-run

## Map
- Entry: `app/`
- Routes/pages: `app/`
- API/server: `server/`
- UI/components: `components/`
- Logic: `lib/`
- Data: `prisma/`
- Config/deploy: `vercel.json`

## Key Files
- `AGENTS.md` — agent instructions
- `README.md` — project documentation
- `package.json` — scripts and dependencies
- `prisma/` — database schema/migrations
- `app/` — important project area
- `components/` — important project area
- `lib/` — important project area
- `vercel.json` — deployment configuration

## Risks
- Auth: auth/session code present; require approval before changing
- Database: schema/migration files present; avoid unsafe migration edits
- Secrets: env shape exists; never read real .env files
- Deployment: deployment config present; confirm before changing runtime settings

## Agent Switching
- Shared context file: PROJECT_CONTEXT.md
- Refresh command: /brief or `brief-ctx brief`
- Works in: Pi, CLI, Claude Code, Codex
- Rule: refresh before switching agents after architecture changes.

## Changed Since Last Brief
- Runnable checks changed; re-confirm validation commands before editing.

## Unknowns
- No dedicated background job signal detected.

## Rules
- Read this file first.
- Inspect task-relevant files before editing.
- Keep diffs minimal and preserve local patterns.
- Do not add dependencies unless necessary.
- Do not touch secrets, migrations, auth, billing, or deployment without approval.
- Run available checks (typecheck/lint/tests) when possible.

## Fresh Session Prompt
Read this file first, then inspect the specific files relevant to the task.
Propose the smallest safe implementation plan before editing.
```

The goal is not to answer every question. The goal is to give the next agent enough reliable context to ask better questions and inspect the right files.

## Recommended workflows

### 1. Fresh repo orientation

```txt
/brief
```

Then have the agent read `PROJECT_CONTEXT.md`, summarize the stack, list risky areas, and propose a small plan before editing.

### 2. Ongoing architecture updates

Run `/brief` again after meaningful changes:

- new framework or routing structure
- changed package manager or scripts
- new database/ORM setup
- new auth, billing, deployment, or job system
- significant folder restructuring

Because the command is idempotent, repeated runs keep the same context file current.

### 3. Task-focused preparation

```txt
/brief --task "add login page"
```

This adds a short `Task Lens` section with likely areas, risks, and a first inspection step without expanding the whole brief.

### 4. Broader audit when needed

```txt
/brief --full
```

Use this when onboarding to a larger repo or when you explicitly want more layout and convention detail.

### 5. Switch agents without losing orientation

```txt
/brief
```

Then open another agent and ask it to read `PROJECT_CONTEXT.md` first. The generated `Agent Switching` section reminds each tool that `PROJECT_CONTEXT.md` is the shared context file and that `/brief` or `brief-ctx brief` refreshes it.

### 6. Keep generated and human-authored guidance separate

A good setup is:

- `README.md` — human product/setup documentation
- `AGENTS.md` or `CLAUDE.md` — durable team rules and preferences
- `PROJECT_CONTEXT.md` — generated architecture brief from `brief-ctx`

This separation keeps the generated file safe to refresh while preserving human-authored policy.

## Lean architecture

`brief-ctx` has a deliberately small architecture:

- `src/core.ts` — host-agnostic detection, rendering, cache writing, and `brief()` orchestration
- `src/cli.ts` — CLI entrypoint (`brief-ctx`)
- `extensions/brief.ts` — Pi adapter, a thin wrapper over the core
- `adapters/claude-code/` — Claude Code slash command that shells out to the CLI
- `adapters/codex/` — Codex prompt that shells out to the CLI
- `prompts/brief.md` — fallback prompt template

The adapters do not duplicate detection logic. Every host produces the same `PROJECT_CONTEXT.md` because they all call the same core.

## Safety model

`brief-ctx` is conservative by design:

- never reads real `.env` files
- reads only small, known-safe metadata/config files
- skips `node_modules`, `.git`, build outputs, caches, coverage, and generated artifacts
- does not embed full source files in the generated brief
- confines writes to the current project directory
- updates the existing brief in place instead of creating duplicates
- keeps the output short enough to be useful in an agent context window

## Non-goals

`brief-ctx` does not try to be:

- a vector database
- a semantic code search engine
- an agent framework
- a replacement for human documentation
- a replacement for tests, typechecks, or code review
- a full architecture audit

It is a compact, repeatable project briefing step.

## Development

The package is consumed by Pi as source; there is no build step. It has no runtime dependencies. `@earendil-works/pi-coding-agent` is a peer dependency provided by Pi.

```bash
npm install
npm run typecheck
npm test
```

`npm run typecheck` works without the Pi package installed thanks to the ambient shim in `types/pi-coding-agent.d.ts`. The project intentionally has no linter/formatter dependency; it relies on `tsc --strict`, tests, and consistent local style.

CI runs typecheck, tests, and `npm pack --dry-run` on every push and pull request.
