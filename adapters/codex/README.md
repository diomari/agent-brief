# brief-ctx — Codex prompt

Adds a `/brief` custom prompt to Codex CLI. It runs the `brief-ctx` CLI to
generate or update a compact `PROJECT_CONTEXT.md`, then has Codex read it before doing any work.

## Install

Copy the prompt into your Codex prompts directory:

```bash
mkdir -p ~/.codex/prompts
cp prompts/brief.md ~/.codex/prompts/brief.md
```

Make sure the CLI is runnable — `npx --yes brief-ctx …` fetches it from npm on first
use, or install it globally:

```bash
npm install -g brief-ctx
```

## Usage

In Codex, run the prompt and pass any flags as arguments:

```txt
/brief
/brief --full
/brief --task "add login page"
/brief --update
/brief --dry-run
```

`$ARGUMENTS` is substituted with whatever you type after the prompt name. Codex will ask
to run the command the first time.
