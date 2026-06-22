#!/usr/bin/env node
// CLI entrypoint for pi-agent-brief. Used directly and by the Claude Code and
// Codex adapters (which shell out to `pi-agent-brief onboard …`).
//
// Status goes to stderr; the kickoff prompt goes to stdout so an agent can
// capture it. Requires a Node version that runs TypeScript (Node 23.6+ strips
// types automatically; 22.6–23.5 needs --experimental-strip-types).

import { onboard, parseArgs, type BriefOptions } from "./core.ts";

const HELP = `pi-agent-brief — generate a compact PROJECT_CONTEXT.md for the current project.

Usage:
  pi-agent-brief onboard [options]
  pi-agent-brief [options]

Options:
  --full              Broader brief (layout + conventions)
  --task "<text>"     Append a focused Task Lens section
  --refresh           Overwrite an existing PROJECT_CONTEXT.md
  --dry-run           Report what would be written without writing
  --output <path>     Write to a different path inside the project
  -h, --help          Show this help

Status is printed to stderr; the kickoff prompt is printed to stdout.`;

async function main(): Promise<void> {
  let argv = process.argv.slice(2);
  if (argv[0] === "onboard") argv = argv.slice(1);

  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  const options: BriefOptions = parseArgs(argv);
  const result = await onboard(process.cwd(), options);
  process.stderr.write(`${result.notice.message}\n`);
  process.stdout.write(`${result.kickoff}\n`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`onboard failed: ${message}\n`);
  process.exitCode = 1;
});
