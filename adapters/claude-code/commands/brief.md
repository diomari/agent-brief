---
description: Generate or update a compact PROJECT_CONTEXT.md for this repo
argument-hint: "[--full] [--task \"...\"] [--update] [--dry-run] [--output PATH]"
allowed-tools: Bash(npx:*), Read
---

Generate or update the project brief by running the generator:

!`npx --yes brief-ctx brief $ARGUMENTS`

The command above scanned the project and — unless `--dry-run` was passed — wrote or updated
`PROJECT_CONTEXT.md`. Its stdout above is a kickoff prompt.

Now, using that file as your working context:

1. Read `PROJECT_CONTEXT.md`.
2. Summarize the current stack and architecture in 5–10 bullets.
3. Identify the most important files for future changes.
4. Identify risky areas that should not be touched without explicit approval.
5. If a task was provided via `--task`, identify the likely files involved and propose a
   minimal plan.
6. Do not edit files yet unless the user explicitly asked for implementation.
