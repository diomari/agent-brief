# pi-agent-brief

Adds `/onboard` for generating a compact AI coding agent project context file. Works with
**Pi**, **Claude Code**, and **Codex** — all three share one host-agnostic core
(`src/core.ts`) and produce the identical `PROJECT_CONTEXT.md`.

## Install

### Pi

From this package directory:

```bash
pi install -l .
```

Or run the extension directly while developing:

```bash
pi -e ./extensions/brief.ts
```

### Claude Code

Install the plugin in `adapters/claude-code/` (see its README). It exposes `/onboard`,
which shells out to the `pi-agent-brief` CLI.

### Codex

Copy `adapters/codex/prompts/onboard.md` into `~/.codex/prompts/` (see its README).

### CLI (any agent or terminal)

```bash
npx --yes pi-agent-brief onboard --full
# or install globally
npm install -g pi-agent-brief
```

The CLI is the shared entrypoint the Claude Code and Codex adapters call. It prints status
to stderr and the kickoff prompt to stdout. Requires Node 22.6+ (23.6+ runs the TypeScript
CLI with no flags).

## Usage

```txt
/onboard
/onboard --full
/onboard --refresh
/onboard --task "add login page"
/onboard --dry-run
/onboard --output .pi/PROJECT_CONTEXT.md
```

## What it generates

By default, `/onboard` writes a **compact** `PROJECT_CONTEXT.md` (~50–80 lines) in the
current project, optimized for an agent's working memory. The file summarizes:

- stack: language, runtime, package manager, framework, database/ORM, deployment, and project size
- install/dev/build/typecheck/lint/test/database commands (only the ones that exist)
- a factual map of routes, API/server, components, logic, data, and config — backed by real files/folders
- high-value key files, ranked by relevance (lockfiles and generic folders are dropped)
- risky areas such as auth, billing, migrations, secrets, deployment, and jobs
- a grouped `Unknowns` section instead of repeated "Not detected" lines
- safe agent rules and a short fresh-session prompt

Use `/onboard --full` for a broader brief (more detail, top-level layout, and conventions) when you
explicitly want wider repository context.

`/onboard --task "…"` appends a short `Task Lens` section (likely areas, risks, first step) without
expanding the rest of the brief.

It also writes a machine-readable cache to `.pi/onboard.json` with the stable detection data — used
for refresh comparisons, not embedded into the agent context.

After generation, the command sends a kickoff prompt telling the agent to read the context before
editing. If `PROJECT_CONTEXT.md` already exists and `--refresh` is not passed, the existing file is
preserved and the prompt tells the agent to read it (and how to regenerate).

## Safety

`/onboard` is intentionally conservative:

- never reads real `.env` files
- reads only small, known-safe project metadata files
- skips `node_modules`, `.git`, build outputs, caches, and generated artifacts
- does not embed full source files in the generated brief
- does not overwrite an existing `PROJECT_CONTEXT.md` unless `--refresh` is provided
- keeps all writes inside the current project directory

## Included resources

- `src/core.ts` — host-agnostic detection + rendering core (the `onboard()` orchestrator)
- `src/cli.ts` — CLI entrypoint (`pi-agent-brief` bin)
- `extensions/brief.ts` — Pi adapter (thin wrapper over the core)
- `prompts/brief.md` — Pi fallback prompt template
- `adapters/claude-code/` — Claude Code plugin (`/onboard` slash command)
- `adapters/codex/` — Codex `/onboard` custom prompt

## Development

The package is consumed by Pi **as source** — there is no build step. It has no runtime
dependencies; `@earendil-works/pi-coding-agent` is a peer dependency that Pi provides.

```bash
npm install            # dev dependencies (TypeScript, @types/node)
npm run typecheck      # strict tsc; the Pi host API is shimmed in types/
npm test               # node --test (fixtures generated in a temp dir)
```

`npm run typecheck` works without the Pi package installed thanks to the ambient shim in
`types/pi-coding-agent.d.ts`. No linter/formatter is configured by design — the project relies
on `tsc --strict` and a consistent local style; keep new code matching the surrounding file.

CI (`.github/workflows/ci.yml`) runs the typecheck, the test suite, and `npm pack --dry-run`
on every push and pull request.
