---
description: Generate or refresh a compact PROJECT_CONTEXT.md for this repo
argument-hint: "[--full] [--task \"...\"] [--refresh] [--dry-run] [--output PATH]"
allowed-tools: Bash(npx:*), Read
---

Generate the onboarding brief for this project by running the generator:

!`npx --yes pi-agent-brief onboard $ARGUMENTS`

The command above scanned the project and — unless `--dry-run` was passed — wrote
`PROJECT_CONTEXT.md`. Its stdout above is a kickoff prompt.

Now, using that file as your working context:

1. Read `PROJECT_CONTEXT.md`.
2. Summarize the current stack and architecture in 5–10 bullets.
3. Identify the most important files for future changes.
4. Identify risky areas that should not be touched without explicit approval.
5. If a task was provided via `--task`, identify the likely files involved and propose a
   minimal plan.
6. Do not edit files yet unless the user explicitly asked for implementation.
