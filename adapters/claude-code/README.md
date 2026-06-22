# pi-agent-brief — Claude Code plugin

Adds the `/onboard` slash command to Claude Code. It shells out to the
`pi-agent-brief` CLI (via `npx`) to generate a compact `PROJECT_CONTEXT.md`, then
instructs Claude to read it before doing any work.

## Install

This directory is a self-contained Claude Code plugin. Install it from a marketplace
that includes this repo, or point Claude Code at a local marketplace:

```bash
# from a marketplace entry
/plugin install pi-agent-brief@<marketplace>
```

The `/onboard` command requires the CLI to be runnable. `npx --yes pi-agent-brief …`
fetches it from npm on first use; alternatively install it globally:

```bash
npm install -g pi-agent-brief
```

## Usage

```txt
/onboard
/onboard --full
/onboard --task "add login page"
/onboard --refresh
/onboard --dry-run
```

Claude will ask once to allow the `npx` command (declared in `allowed-tools`).
