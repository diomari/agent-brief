Generate a compact onboarding brief for this project, then use it as working context.

1. Run this command in the project root, passing through any flags the user provided
   (for example `--full`, `--task "..."`, `--refresh`, `--dry-run`, `--output PATH`):

   ```bash
   npx --yes pi-agent-brief onboard $ARGUMENTS
   ```

2. Unless `--dry-run` was used, the command wrote `PROJECT_CONTEXT.md`. Read that file.
3. Summarize the current stack and architecture in 5–10 bullets.
4. Identify the most important files for future changes.
5. Identify risky areas that should not be touched without explicit approval.
6. If a task was provided via `--task`, identify the likely files involved and propose a
   minimal plan.
7. Do not edit files yet unless the user explicitly asked for implementation.
