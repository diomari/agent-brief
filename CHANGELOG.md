# Changelog

All notable changes to `pi-agent-brief` are documented here. This project adheres to
[Semantic Versioning](https://semver.org/).

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
