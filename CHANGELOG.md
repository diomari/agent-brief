# Changelog

All notable changes to `pi-agent-brief` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

## [1.1.0] - 2026-06-22

Multi-agent support (Scenario A: shared core + thin per-host adapters).

### Added

- **Host-agnostic core** (`src/core.ts`) with an `onboard()` orchestrator; all detection
  and rendering logic now lives here, independent of any coding-agent host.
- **CLI** (`src/cli.ts`, `bin: pi-agent-brief`): runs onboarding anywhere Node runs;
  prints status to stderr and the kickoff prompt to stdout.
- **Claude Code adapter** (`adapters/claude-code/`): a plugin exposing `/onboard` that
  shells out to the CLI via `npx`.
- **Codex adapter** (`adapters/codex/`): an `/onboard` custom prompt that runs the CLI.

### Changed

- The Pi extension (`extensions/brief.ts`) is now a thin adapter that delegates to the core.
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
