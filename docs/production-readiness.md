# Production Readiness Plan: `agent-brief`

A checklist-driven plan for double-checking the existing package and getting it to a
confident `1.0.0` (or first public) release. Each item states **what to verify**, **how**,
the **current status**, and the **action** required.

Status legend: ✅ done / verified · ⚠️ needs work before release · ❌ missing

> **Update (2026-06-22):** the blocking items below have been implemented — `files`
> whitelist, LICENSE holder, automated test suite (`node --test`, 11 tests passing), CI,
> `.gitignore`, `CHANGELOG.md`, version bump to `1.0.0`, and the initial git commit. The only
> remaining items are external: filling `repository`/`homepage`/`bugs` once the GitHub repo
> exists, and running the publish procedure.

Current snapshot: `agent-brief@1.1.0` — a package registering `/brief`, which
generates or updates a compact `PROJECT_CONTEXT.md` (plus `--full`, `--task`, `--update`, `--dry-run`,
`--output`) and a `.pi/brief.json` cache. Consumed by Pi **as source** — no build step.

---

## 1. Functionality & correctness

- [ ] **All flags behave as documented.** Verify `/brief`, `--full`, `--update`,
  `--task`, `--dry-run`, `--output`.
  How: load the extension with a fake Pi/ctx (or run inside Pi) against 2–3 fixture repos.
  Status: ✅ verified via harness — compact 64 lines, full 75, task adds `Task Lens` (+6),
  tiny repo 44 lines, dry-run reports line count and writes nothing.
- [ ] **`--dry-run` writes nothing** (neither `PROJECT_CONTEXT.md` nor `.pi/brief.json`).
  Status: ✅ (cache + file writes are gated behind the non-dry-run branch).
- [ ] **Default `/brief` is idempotent.** Existing `PROJECT_CONTEXT.md` is updated in place
  (no duplicate brief files); `--update` remains an explicit form of the same behavior.
- [ ] **`--output` stays inside the project** (path traversal rejected).
  Status: ✅ `resolveSafeOutputPath` rejects escapes and NUL bytes — add an explicit
  regression check for `../outside` and absolute paths.
- [x] **Graceful on odd inputs:** unknown flags, missing `package.json`, non-JSON
  `package.json`, empty repo, huge repo (file-count cap).
  Status: ✅ covered by tests (unknown flag → error; missing and malformed `package.json`
  both generate without throwing).

## 2. Code quality & types

- [ ] **Strict typecheck passes.** How: `tsc --strict` (CI uses a shim for the Pi peer dep).
  Status: ✅ `tsc` exit 0 against the type shim.
- [ ] **No dead code / TODO / FIXME.** Status: ✅ none found.
- [x] **Lint/format baseline.** Status: ✅ decision documented in README "Development":
  no linter by design — relies on `tsc --strict` and consistent local style.

## 3. Safety & security (the package's core promise)

- [ ] **Never reads real `.env` files.** How: confirm `SECRET_FILE_RE` filters both
  `readdir` listing and `readTextIfExists`; add a fixture with `.env` + `.env.example` and
  assert `.env` is never read while `.env.example` is. Status: ✅ guarded and proven by test
  (a unique secret in `.env` never appears in the brief or cache; `.env.example` still referenced).
- [ ] **No source files embedded** in the brief. Status: ✅ only metadata is read; brief
  contains paths/notes, never file bodies.
- [ ] **Skips `node_modules`, `.git`, build/cache dirs** during the size walk and listing.
  Status: ✅ `IGNORED_DIRS` + hidden-dir skip in `countTrackedFiles`.
- [ ] **All writes confined to the project dir.** Status: ✅ (`resolveSafeOutputPath`,
  cache under `.pi/`).
- [ ] **Read size cap** prevents pathological reads. Status: ✅ `MAX_READ_BYTES` (100 KB).

## 4. Packaging & npm metadata

- [ ] **`files` whitelist present** so internal docs don't ship.
  How: `npm pack --dry-run`. Status: ✅ added
  `"files": ["extensions", "prompts", "README.md", "LICENSE"]`; pack now ships only those
  five files (verified).
- [ ] **Name availability / scope decided.** How: `npm view agent-brief`.
  Status: ⚠️ confirm the unscoped name is free, else move to `@org/agent-brief`.
- [x] **`repository`, `homepage`, `bugs`, `author` set.** Status: ✅ metadata points to
  `https://github.com/diomari/agent-brief` and author is Diomari Madulara.
- [ ] **`peerDependencies` correct** (`@earendil-works/pi-coding-agent`). Status: ✅
  Consider pinning a minimum version (`">=x.y"`) instead of `"*"` once a baseline is known.
- [ ] **`pi.extensions` / `pi.prompts` point at shipped paths.** Status: ✅ both included by
  the `files` whitelist above.
- [x] **Version bump** to the intended release. Status: ✅ bumped to `1.0.0`.

## 5. Documentation

- [ ] **README covers install, all flags, output, and safety.** Status: ✅ updated for
  compact default, `--full`, Task Lens, cache, overwrite behavior.
- [ ] **Install command matches reality** (`pi install npm:agent-brief`). Status: ⚠️
  verify against the published package after first publish.
- [x] **CHANGELOG.** Status: ✅ `CHANGELOG.md` added with the `1.0.0` entry.
- [x] **LICENSE complete.** Status: ✅ `Copyright (c) 2026 Diomari Madulara`.

## 6. Repo hygiene & CI

- [x] **First commit.** Status: ✅ initial commit created locally. ⚠️ remote push deferred
  until the GitHub repo URL is provided.
- [x] **`.gitignore`** for `node_modules`, `*.tgz`, and generated artifacts
  (`PROJECT_CONTEXT.md`, `.pi/`). Status: ✅ added.
- [x] **CI workflow** running `tsc` (with the Pi type shim) and the test suite on PRs.
  Status: ✅ `.github/workflows/ci.yml` (typecheck + `node --test` + `npm pack --dry-run`).

## 7. Automated tests

- [x] **Test suite exists and runs in CI.** Status: ✅ `test/brief.test.ts` (`node --test`,
  11 tests, all passing) covers each flag, line-budget bounds, `.env` exclusion, unknowns
  grouping, path-traversal rejection, dry-run no-write, and missing/malformed `package.json`.

---

## Must-fix before release (blocking)

1. ✅ `files` whitelist added (stops shipping internal docs). _(§4)_
2. ✅ Copyright holder added to `LICENSE`. _(§5)_
3. ✅ Automated test suite + CI running typecheck and tests. _(§6, §7)_
4. ✅ GitHub repository URL filled in package metadata. **Remaining:** push the local repo to
   `https://github.com/diomari/agent-brief`. _(§4, §6)_

## Should-fix (non-blocking, recommended)

- ✅ `.gitignore`, `CHANGELOG.md` added; lint baseline decided (none, by design).
- ✅ Version set to `1.0.0`. ⚠️ Still consider pinning a peer-dep minimum once a baseline
  Pi version is known.
- ✅ Edge-case coverage added (no/malformed `package.json`, `.env` present).

## Release procedure

Once the blocking items are clear, follow `README.md` / the publishing guide:
`npm pack --dry-run` → `npm login` → local tarball smoke test
(`pi install ./*.tgz`) → `npm publish` (`--access public` if scoped) →
`pi install npm:agent-brief` to verify the live package.

## Sign-off criteria

Ready to publish when: typecheck + test suite pass in CI · `npm pack --dry-run` shows only
expected package files · LICENSE and metadata complete · `--dry-run` proven to write nothing ·
`.env` exclusion proven by test.
