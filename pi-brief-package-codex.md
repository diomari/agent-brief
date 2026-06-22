# Codex Implementation Brief: Build a Pi Package for `/brief`

## Goal

Build a shareable **Pi package** that adds a `/brief` slash command for Pi Agent.

The command should prepare an existing codebase for AI-assisted development by generating a concise, durable project context file. It should help a fresh Pi/Codex/AI coding session understand the repository before making changes.

## Product positioning

Package name suggestion:

```txt
pi-agent-brief
```

Command:

```txt
/brief
```

Purpose:

```txt
Create or refresh a compact project briefing for AI coding agents.
```

This should not be a generic “analyze this repo” prompt only. The value is that it creates consistent project context files and injects a structured prompt into the current Pi session.

---

## Source guide to follow

Use the Pi package guide here:

```txt
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/packages.md
```

Important Pi package rules from the guide:

- Pi packages can bundle extensions, skills, prompt templates, and themes.
- A package can declare resources under the `pi` key in `package.json`.
- Use the `pi-package` keyword for discoverability.
- Conventional directories are supported:
  - `extensions/` loads `.ts` and `.js` files.
  - `skills/` recursively finds `SKILL.md` folders and top-level `.md` files.
  - `prompts/` loads `.md` files.
  - `themes/` loads `.json` files.
- Runtime dependencies belong in `dependencies`.
- Pi core packages imported by extensions should be listed as `peerDependencies` with `"*"`, not bundled:
  - `@earendil-works/pi-ai`
  - `@earendil-works/pi-agent-core`
  - `@earendil-works/pi-coding-agent`
  - `@earendil-works/pi-tui`
  - `typebox`

Relevant extension guide:

```txt
https://github.com/earendil-works/pi/blob/main/packages/coding-agent/docs/extensions.md
```

Important extension rules:

- Extensions are TypeScript modules.
- Extensions can register slash commands using `pi.registerCommand()`.
- Extensions can inject a user message with `pi.sendUserMessage()`.
- TypeScript extensions are loaded through Pi without requiring a separate compile step.
- Use Node built-ins like `node:fs`, `node:path`, and `node:child_process` where needed.

---

## Recommended implementation approach

Build this as a **Pi extension package**, not only as a prompt template.

Reason:

- A prompt template can expand into `/brief`, but it cannot reliably scan files, detect commands, write `PROJECT_CONTEXT.md`, or refresh saved context by itself.
- An extension command can perform filesystem inspection and then send a structured prompt to the agent.

The package should include:

```txt
pi-agent-brief/
  package.json
  README.md
  LICENSE
  extensions/
    brief.ts
  prompts/
    brief.md
```

`extensions/brief.ts` registers the real `/brief` command.

`prompts/brief.md` is optional fallback documentation/prompt content for users who want a pure prompt template.

---

## Expected command behavior

### Basic usage

```txt
/brief
```

Should:

1. Inspect the current working directory.
2. Detect stack, package manager, framework, database/ORM, infra/deployment signals.
3. Identify important files and folders.
4. Detect available npm/package scripts.
5. Detect common risk areas.
6. Write or update a project context file.
7. Send a structured message to the agent telling it to read/use the generated context before editing.

### Optional flags

Support these simple arguments initially:

```txt
/brief --refresh
/brief --task "add login page"
/brief --dry-run
/brief --output .pi/PROJECT_CONTEXT.md
```

Behavior:

- `--refresh`: overwrite/update existing brief.
- `--task "..."`: include a task-specific section asking the agent to identify likely files and risks for that task.
- `--dry-run`: show summary in Pi UI and send prompt, but do not write files.
- `--output <path>`: write the generated brief to a custom path.

Default output file:

```txt
PROJECT_CONTEXT.md
```

Optional secondary output:

```txt
.pi/brief.json
```

The first MVP can skip `.pi/brief.json` if it adds complexity.

---

## What `/brief` should detect

### Package manager

Detect by lockfile priority:

```txt
pnpm-lock.yaml  -> pnpm
bun.lockb       -> bun
bun.lock        -> bun
yarn.lock       -> yarn
package-lock.json -> npm
```

### JavaScript/TypeScript frameworks

Detect from files and dependencies:

```txt
Next.js      -> next.config.*, dependency "next", app/, pages/
Expo         -> app.json, app.config.*, dependency "expo", expo-router
React Native -> dependency "react-native"
Vite         -> vite.config.*
Astro        -> astro.config.*
Hono         -> dependency "hono"
Cloudflare   -> wrangler.toml, worker.ts, dependency "wrangler", "@cloudflare/workers-types"
```

### Backend/database/ORM

Detect:

```txt
Drizzle      -> drizzle.config.*, dependency "drizzle-orm"
Prisma       -> prisma/schema.prisma, dependency "prisma" or "@prisma/client"
Supabase     -> dependency "@supabase/supabase-js", supabase/ folder
Postgres     -> pg dependency, postgres env names in .env.example
D1           -> wrangler.toml contains d1_databases
R2           -> wrangler.toml contains r2_buckets
Durable Objects -> wrangler.toml contains durable_objects
```

### Other project types

Nice-to-have after MVP:

```txt
Django       -> manage.py, settings.py, requirements.txt / pyproject.toml
Frappe       -> sites/, apps/, hooks.py, bench config
Laravel      -> artisan, composer.json, routes/
```

---

## Files and folders to inspect

The command should inspect these if present:

```txt
README.md
AGENTS.md
package.json
pnpm-lock.yaml
package-lock.json
yarn.lock
bun.lock
bun.lockb
tsconfig.json
vite.config.*
next.config.*
astro.config.*
app.json
app.config.*
wrangler.toml
docker-compose.yml
Dockerfile
.github/workflows/
.env.example
src/
app/
pages/
components/
lib/
server/
db/
prisma/
supabase/
```

Do not read these by default:

```txt
.env
.env.local
.env.production
node_modules/
.git/
dist/
build/
.next/
.vercel/
.turbo/
coverage/
```

---

## Output: `PROJECT_CONTEXT.md`

The generated file should be concise. Target 100–200 lines maximum.

Template:

```md
# Project Context

Generated by `/brief`.

## Stack

- Language:
- Package manager:
- Framework:
- Runtime:
- Database / ORM:
- Infrastructure:

## Commands

- Install:
- Dev:
- Build:
- Typecheck:
- Lint:
- Test:
- Database / migrations:

## Architecture

- Entry points:
- Routes / pages:
- API / server:
- Components:
- Business logic:
- Data access:
- Auth:
- Background jobs:
- Deployment:

## Important Files

- `package.json` — package scripts and dependencies
- `README.md` — project documentation
- ...

## Risky Areas

- Auth:
- Billing/payments:
- Database migrations:
- Environment/secrets:
- Deployment config:

## Existing Conventions

- Naming:
- Folder organization:
- State management:
- API patterns:
- Styling:
- Testing:

## Agent Rules

- Inspect relevant files before editing.
- Keep diffs minimal.
- Preserve existing patterns.
- Do not add dependencies unless necessary.
- Do not modify secrets, migrations, auth, billing, or deployment config unless explicitly requested.
- Run typecheck/lint/tests when possible.
- After changes, explain modified files and commands run.

## Fresh Session Prompt

Read this file before making changes. Then inspect the specific files relevant to the task. Propose the smallest safe implementation plan before editing.
```

---

## Output: Agent kickoff prompt

After creating/updating `PROJECT_CONTEXT.md`, the extension should call `pi.sendUserMessage()` with a prompt like this:

```txt
Read PROJECT_CONTEXT.md and use it as the working context for this session.

Before making any implementation changes:
1. Summarize the current stack and architecture in 5–10 bullets.
2. Identify the most important files for future changes.
3. Identify risky areas that should not be touched without explicit approval.
4. If a task was provided, identify likely files involved and propose a minimal plan.
5. Do not edit files yet unless the user explicitly asked for implementation.
```

If `/brief --task "..."` was used, append:

```txt
Task to prepare for:
<task>

For this task, identify likely files, risks, unknowns, and the smallest safe implementation plan. Do not edit yet.
```

---

## `package.json` requirements

Create:

```json
{
  "name": "pi-agent-brief",
  "version": "0.1.0",
  "description": "A Pi package that adds /brief for generating AI coding agent project context.",
  "type": "module",
  "keywords": [
    "pi-package",
    "pi",
    "coding-agent",
    "ai-coding",
    "agent-context",
    "repo-map"
  ],
  "license": "MIT",
  "pi": {
    "extensions": ["./extensions"],
    "prompts": ["./prompts"]
  },
  "peerDependencies": {
    "@earendil-works/pi-coding-agent": "*",
    "typebox": "*"
  },
  "devDependencies": {
    "typescript": "latest"
  }
}
```

If implementation imports only `@earendil-works/pi-coding-agent`, keep only that peer dependency.

If it imports `typebox`, include `typebox`.

---

## Extension implementation requirements

Create:

```txt
extensions/brief.ts
```

It should:

1. Export default function receiving `ExtensionAPI`.
2. Register command:

```ts
pi.registerCommand("brief", {
  description: "Generate or refresh a compact project context briefing",
  handler: async (args, ctx) => {
    // implementation
  }
});
```

3. Use `ctx.cwd` as repository root.
4. Parse arguments minimally.
5. Inspect files safely.
6. Generate markdown.
7. Write `PROJECT_CONTEXT.md` unless `--dry-run` is used.
8. Notify user through `ctx.ui.notify()`.
9. Send kickoff prompt with `pi.sendUserMessage()`.

Important: command should not modify source code except the generated context file.

---

## Suggested internal implementation functions

Inside `extensions/brief.ts`, implement small pure helpers:

```ts
type BriefOptions = {
  refresh: boolean;
  dryRun: boolean;
  outputPath: string;
  task?: string;
};

function parseArgs(args: string): BriefOptions;
async function pathExists(path: string): Promise<boolean>;
async function readTextIfExists(path: string, maxBytes?: number): Promise<string | null>;
async function listTopLevelDirs(cwd: string): Promise<string[]>;
async function readPackageJson(cwd: string): Promise<any | null>;
function detectPackageManager(files: string[]): string | null;
function detectStack(inputs: DetectInputs): StackSummary;
function detectCommands(packageJson: any, packageManager: string | null): CommandSummary;
function detectRiskAreas(inputs: DetectInputs): string[];
function generateProjectContext(summary: ProjectSummary): string;
function generateKickoffPrompt(outputPath: string, task?: string): string;
```

Keep parsing simple. No need for a full CLI parser dependency in v0.1.

---

## Argument parsing expectations

Support:

```txt
/brief
/brief --refresh
/brief --dry-run
/brief --output .pi/PROJECT_CONTEXT.md
/brief --task "add login page"
```

Naive parser is acceptable for v0.1.

If parsing quoted strings is too much, use Node’s `util.parseArgs` if available. Avoid adding dependencies unless clearly necessary.

---

## Safety rules

The command must:

- Never read `.env` files.
- Never print secrets.
- Never scan `node_modules`, `.git`, build outputs, cache folders, or generated artifacts.
- Limit file reads by size. Default max file read: 100 KB per file.
- Keep generated markdown concise.
- Avoid embedding full source files in `PROJECT_CONTEXT.md`.
- Avoid overwriting a manually edited `PROJECT_CONTEXT.md` unless `--refresh` is passed, or ask/notify clearly.

For MVP, if `PROJECT_CONTEXT.md` exists and `--refresh` is not provided:

- Do not overwrite it.
- Send a prompt telling the agent to read the existing file.
- Notify user to run `/brief --refresh` to regenerate.

---

## Prompt template fallback

Create:

```txt
prompts/brief.md
```

Content:

```md
Analyze this existing repository before editing.

Before making any changes:
1. Inspect the project structure.
2. Identify the framework, package manager, language, database/ORM, and deployment target.
3. Read README.md, AGENTS.md if present, package.json, lockfile, env examples, and relevant config files.
4. Identify how to run, test, lint, typecheck, and build the project.
5. Summarize the architecture and important folders.
6. Identify risky areas: auth, billing, migrations, secrets, deployment config, and background jobs.
7. Propose a minimal safe workflow for future changes.
8. Do not modify files yet.
```

This lets users still run a prompt command if the extension command fails or is filtered out.

---

## README requirements

Create a clear README with:

```md
# pi-agent-brief

Adds `/brief` to Pi Agent.

## Install

```bash
pi install npm:pi-agent-brief
```

Local development:

```bash
pi -e ./extensions/brief.ts
```

Or install local package:

```bash
pi install ./path/to/pi-agent-brief
```

## Usage

```txt
/brief
/brief --refresh
/brief --task "add login page"
/brief --dry-run
/brief --output .pi/PROJECT_CONTEXT.md
```

## What it generates

- `PROJECT_CONTEXT.md`
- optional current-session kickoff prompt

## Safety

- Does not read `.env` files.
- Skips `node_modules`, `.git`, build outputs, and cache folders.
- Does not modify source code.
```

---

## Acceptance criteria

Codex should finish when all are true:

1. Package has valid `package.json` with `pi-package` keyword.
2. `extensions/brief.ts` registers `/brief` using `pi.registerCommand()`.
3. `/brief` generates `PROJECT_CONTEXT.md` in the current repo.
4. `/brief --dry-run` does not write files.
5. `/brief --refresh` overwrites/regenerates existing output.
6. `/brief --task "..."` includes task preparation in the kickoff prompt.
7. The implementation skips sensitive/generated directories.
8. The implementation avoids reading `.env` files.
9. The README explains install, usage, and safety behavior.
10. No unnecessary runtime dependencies are added.

---

## Testing checklist

Manually test on a small TypeScript repo:

```bash
pi -e ./extensions/brief.ts
```

Then run inside Pi:

```txt
/brief --dry-run
/brief
/brief --refresh
/brief --task "add a settings page"
```

Check:

- Command appears in slash command completion.
- `PROJECT_CONTEXT.md` is created.
- Existing file is not overwritten unless `--refresh` is used.
- Kickoff prompt is sent to the model.
- Secrets are not read or printed.

---

## Non-goals for v0.1

Do not implement these yet:

- Embeddings
- Semantic search
- MCP server
- Persistent database
- Full dependency graph
- AST parsing
- Web UI
- Deep git history analysis
- Automatic code edits

Keep v0.1 small and boring.

---

## Future versions

After MVP works, consider:

```txt
/brief --diff
/brief --rules
/brief --json
/brief --task "..."
/brief --scope src/app
```

Future features:

- Generate or update `AGENTS.md` suggestion.
- Track project changes since last brief.
- Detect stale context.
- Add framework-specific detectors for Cloudflare, Expo, Next.js, Frappe, Django, Laravel.
- Optional JSON output for other agents.
- Optional repo-map using Tree-sitter.

---

## Implementation style

Keep code readable and dependency-light.

Prefer:

```ts
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
```

Avoid:

- Heavy dependencies
- Long-running background processes
- Watchers
- Recursive scanning of the whole repository
- Reading large files
- Writing outside the current working directory unless explicitly requested

---

## Codex task prompt

Use this exact prompt in Codex after opening the target package repository:

```txt
Build the Pi package described in pi-brief-package-codex.md.

Follow the Pi package guide conventions:
- package.json with `pi` manifest
- `pi-package` keyword
- extension under `extensions/`
- optional prompt template under `prompts/`

Implement `/brief` as a Pi extension command using `pi.registerCommand()`.
Keep the first version dependency-light and safe.
Do not add unnecessary dependencies.
Do not implement MCP, embeddings, AST parsing, or semantic search.

After implementation, show:
1. Files created or changed
2. How to test locally with `pi -e ./extensions/brief.ts`
3. Any assumptions made because of Pi API uncertainty
```
