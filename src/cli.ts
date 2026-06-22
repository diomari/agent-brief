#!/usr/bin/env node
// CLI entrypoint for agent-brief. Used directly and by the Claude Code and
// Codex adapters (which shell out to `agent-brief brief …`).
//
// Status goes to stderr; the kickoff prompt goes to stdout so an agent can
// capture it. Requires a Node version that runs TypeScript (Node 23.6+ strips
// types automatically; 22.6–23.5 needs --experimental-strip-types).

import { brief, parseArgs, type BriefOptions } from "./core.ts";

const HELP = `agent-brief — generate a compact PROJECT_CONTEXT.md for the current project.

Usage:
  agent-brief brief [options]
  agent-brief [options]

Options:
  --full              Broader brief (layout + conventions)
  --task "<text>"     Append a focused Task Lens section
  --update            Update an existing PROJECT_CONTEXT.md as architecture changes
  --dry-run           Report what would be written without writing
  --output <path>     Write to a different path inside the project
  -h, --help          Show this help

Status is printed to stderr; the kickoff prompt is printed to stdout.`;

async function main(): Promise<void> {
  let argv = process.argv.slice(2);
  if (argv[0] === "brief") argv = argv.slice(1);

  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const options: BriefOptions = parseArgs(argv);
  const result = await brief(process.cwd(), options);
  process.stderr.write(`${result.notice.message}\n`);
  process.stdout.write(`${result.kickoff}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`brief failed: ${message}\n`);
  process.exitCode = 1;
});
