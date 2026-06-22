---
title: Brief Context
description: A lightweight handoff tool that gives AI coding agents a shared, refreshable project context before they edit a repository.
summary: Brief Context solves cold-start AI coding sessions with a compact generated PROJECT_CONTEXT.md, shared CLI core, and adapters for Pi, Claude Code, and Codex.
tags: ["TypeScript", "Node.js", "Pi", "CLI"]
type: project
repo: https://github.com/diomari/brief-ctx
featured: false
order: 0
publishDate: 2026-06-22
---

Brief Context is a small TypeScript package for developers who switch between AI coding agents and do not want each new session to start cold. It scans safe project metadata, generates a concise `PROJECT_CONTEXT.md`, and gives Pi, Claude Code, Codex, and terminal workflows the same factual handoff layer before any agent edits code.

## At a glance

- **Role:** Solo package author and engineer.
- **Scope:** CLI, Pi extension, prompt templates, Claude Code and Codex adapters, scanner heuristics, cache writing, tests, and package metadata.
- **Stack:** TypeScript, Node.js, pnpm, Node test runner, Pi extension API.
- **Status:** Published package with CI coverage and package validation.
- **Proof:** Ships as `brief-ctx`, exposes `/brief` in supported agents, writes `PROJECT_CONTEXT.md`, and validates with typecheck, tests, and `npm pack --dry-run` in CI.

## The problem

AI coding agents work better when they understand the shape of a codebase, but that context is usually scattered across README files, agent-specific rules, stale session memories, and long prompts that disappear after compaction.

- **Cold starts:** Every new agent session has to rediscover stack, commands, key files, and risks before making safe changes.
- **Tool fragmentation:** Pi, Claude Code, Codex, Cursor-style rules, and terminal agents each have different ways to receive context.
- **Context waste:** Full repo dumps and broad scans consume tokens while still missing operational details like risky files or validation commands.

The goal: create a small, repeatable project briefing step that any coding agent can read before touching a repository.

## The solution

Brief Context generates and maintains a lean `PROJECT_CONTEXT.md` from concrete project signals instead of asking users to hand-maintain another long agent file.

- **Shared scanner core** — Detects stack, commands, key files, risks, unknowns, and project map from safe metadata and folder shape.
- **Agent-neutral entrypoints** — Exposes the same behavior through a CLI, Pi extension, Claude Code command, Codex prompt, and export helpers.
- **Safe generated handoff** — Skips secrets, generated folders, build output, large files, and real `.env` files while keeping the output compact enough for agent context windows.

## Technical overview

**Frontend** — No application frontend. The user interface is command-line output, slash-command responses, and generated Markdown.

**Backend/API** — A host-agnostic TypeScript core in `src/core.ts` handles detection, rendering, output path safety, cache writing, and the `brief()` orchestration used by every adapter.

**Data layer** — No database. The package writes `PROJECT_CONTEXT.md` plus a small `.pi/brief.json` cache for stable detection data and change hints.

**Infrastructure** — GitHub Actions runs typecheck, tests, and package validation. npm package metadata defines the CLI bin, Pi extension manifest fields, packaged prompts, and gallery image.

**Reliability/security** — The scanner avoids real environment files, ignores noisy or generated directories, caps reads and walks, rejects unsafe output paths, and reports unknowns instead of inventing architecture.

## How it works

1. A developer runs `/brief`, `brief-ctx brief`, or an adapter-specific command.
2. The package reads safe metadata such as `package.json`, selected config files, and the top-level project shape.
3. Detection heuristics classify stack, commands, project areas, key files, risks, conventions, and unknowns.
4. The renderer writes or updates `PROJECT_CONTEXT.md` and stores stable machine-readable detection data in `.pi/brief.json`.
5. The next agent reads the generated brief, inspects task-relevant files, and starts with a smaller, safer implementation plan.

## Key decisions

### One core, many adapters

The detection and rendering logic lives in `src/core.ts`, while `src/cli.ts`, `extensions/brief.ts`, `adapters/claude-code/`, `adapters/codex/`, and `prompts/` stay thin. This avoids divergent behavior across hosts and keeps every agent output consistent.

### Small factual brief over full indexing

The package intentionally does not embed source files or build a semantic index. It uses shallow inventory, allowlisted metadata reads, scoring, and grouped unknowns so the output stays useful in the first few minutes of an agent session.

### Safety before completeness

Brief Context skips real `.env` files, build artifacts, caches, dependencies, and oversized reads. That means the brief may omit details, but it avoids leaking secrets or overwhelming the model with irrelevant data.

## Challenges

- **Balancing signal and size:** The generated file needed enough detail to guide edits without becoming another bloated context document.
- **Supporting different agents:** Pi, Claude Code, Codex, and terminal workflows each needed a native-feeling entrypoint without duplicating scanner logic.
- **Being honest about unknowns:** The scanner had to avoid false confidence, so missing signals are grouped as unknowns rather than converted into guessed architecture.

## Outcome

Brief Context now provides a portable handoff layer for AI coding sessions across multiple agent tools.

- A single TypeScript core powers CLI usage, Pi `/brief`, Claude Code, Codex, and export helpers.
- Generated briefs include stack, commands, map, key files, risks, change hints, unknowns, and fresh-session rules.
- CI verifies type safety, behavior tests, adapter templates, and package contents before release.

## What I would improve next

- Add more framework-specific detection cases while keeping the brief compact.
- Expand adapter coverage for additional coding agents without changing the core contract.
- Add snapshot examples for more real-world repo shapes to harden the scoring heuristics.
