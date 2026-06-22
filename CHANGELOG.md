# Changelog

All notable changes to `brief-ctx` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [1.2.0] - 2026-06-22

Agent handoff and publishing polish.

### Added

- Project-type, package identity, Pi gallery, package publishing, generated-by identity, stale-context change hints, and agent-switching signals in generated briefs.
- CLI install helpers for Pi, Claude Code, Codex, Cursor, Windsurf, and all hosts.
- CLI export helpers for `AGENTS.md`, Cursor rules, Windsurf rules, and generic prompts.
- Pi package gallery preview image metadata.

### Changed

- Repositioned README around Brief as the missing handoff tool for AI coding agents.
- Improved package/tool repo maps, key-file scoring, task routing, and auth risk precision.
- Renamed package metadata and documentation to `brief-ctx`.

## [1.1.0] - 2026-06-22

Multi-agent support (Scenario A: shared core + thin per-host adapters) plus the `/brief`
command rename.

### Added

- **Host-agnostic core** (`src/core.ts`) with a `brief()` orchestrator; all detection
  and rendering logic now lives here, independent of any coding-agent host.
- **CLI** (`src/cli.ts`, `bin: brief-ctx`): runs brief generation anywhere Node runs;
  prints status to stderr and the kickoff prompt to stdout.
- **Claude Code adapter** (`adapters/claude-code/`): a plugin exposing `/brief` that
  shells out to the CLI via `npx`.
- **Codex adapter** (`adapters/codex/`): a `/brief` custom prompt that runs the CLI.

### Changed

- The Pi extension (`extensions/brief.ts`) is now a thin adapter that delegates to the core.
- Renamed the package and CLI to `brief-ctx` for multi-agent support.
- Renamed the user-facing command from `/onboard` to `/brief`.
- Added `--update` for regenerating stale architecture context as projects evolve.
- Made `/brief` idempotent: existing `PROJECT_CONTEXT.md` files are updated in place by default.
- Added repository, homepage, and issues metadata for `https://github.com/diomari/brief-ctx`.
- `engines.node` set to `>=22.6.0` (the CLI runs TypeScript directly; Node 23.6+ needs no
  flags).

### Notes

- No new runtime dependencies; the same `PROJECT_CONTEXT.md` and safety guarantees apply
  across all three hosts.

## [1.0.0] - 2026-06-22

First stable release.

### Added

- `/onboard` command generating a **compact** `PROJECT_CONTEXT.md` (~50–80 lines) optimized
  for an agent's working memory.
- `--full` flag for a broader brief (top-level layout + conventions).
- `--task "…"` appends a focused `Task Lens` section without expanding the whole brief.
- `--refresh`, `--dry-run`, and `--output` flags.
- Signal scoring for key files (lockfiles and generic folders dropped).
- Grouped `Unknowns` section instead of repeated "Not detected" lines.
- Project-size awareness (tiny/small/medium/large) that scales file listings.
- Machine-readable cache at `.pi/onboard.json` (not embedded in agent context).
- Automated test suite (`node --test`) and CI (typecheck + tests).

### Safety

- Never reads real `.env` files; reads only small, known-safe metadata.
- Skips `node_modules`, `.git`, and build/cache directories.
- Confines all writes to the current project directory.

### Notes

- `repository`, `homepage`, and `bugs` metadata are intentionally deferred until the public
  GitHub repository exists; add them before the first `npm publish`.
