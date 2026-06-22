# pi-agent-brief — Codex prompt

Adds an `/onboard` custom prompt to Codex CLI. It runs the `pi-agent-brief` CLI to
generate a compact `PROJECT_CONTEXT.md`, then has Codex read it before doing any work.

## Install

Copy the prompt into your Codex prompts directory:

```bash
mkdir -p ~/.codex/prompts
cp prompts/onboard.md ~/.codex/prompts/onboard.md
```

Make sure the CLI is runnable — `npx --yes pi-agent-brief …` fetches it from npm on first
use, or install it globally:

```bash
npm install -g pi-agent-brief
```

## Usage

In Codex, run the prompt and pass any flags as arguments:

```txt
/onboard
/onboard --full
/onboard --task "add login page"
/onboard --refresh
/onboard --dry-run
```

`$ARGUMENTS` is substituted with whatever you type after the prompt name. Codex will ask
to run the command the first time.
