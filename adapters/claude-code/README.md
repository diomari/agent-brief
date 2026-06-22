# agent-brief — Claude Code plugin

Adds the `/brief` slash command to Claude Code. It shells out to the
`agent-brief` CLI (via `npx`) to generate or update a compact `PROJECT_CONTEXT.md`, then
instructs Claude to read it before doing any work.

## Install

This directory is a self-contained Claude Code plugin. Install it from a marketplace
that includes this repo, or point Claude Code at a local marketplace:

```bash
# from a marketplace entry
/plugin install agent-brief@<marketplace>
```

The `/brief` command requires the CLI to be runnable. `npx --yes agent-brief …`
fetches it from npm on first use; alternatively install it globally:

```bash
npm install -g agent-brief
```

## Usage

```txt
/brief
/brief --full
/brief --task "add login page"
/brief --update
/brief --dry-run
```

Claude will ask once to allow the `npx` command (declared in `allowed-tools`).
