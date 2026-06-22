#!/usr/bin/env node
// CLI entrypoint for brief-ctx. Used directly and by the Claude Code and
// Codex adapters (which shell out to `brief-ctx brief …`).
//
// Status goes to stderr; the kickoff prompt goes to stdout so an agent can
// capture it. Requires a Node version that runs TypeScript (Node 23.6+ strips
// types automatically; 22.6–23.5 needs --experimental-strip-types).

import { brief, parseArgs, type BriefOptions } from "./core.ts";

const HELP = `brief-ctx — generate portable PROJECT_CONTEXT.md context for coding agents.

Usage:
  brief-ctx brief [options]
  brief-ctx [options]
  brief-ctx install <target>
  brief-ctx export <target>

Brief options:
  --full              Broader brief (layout + conventions)
  --task "<text>"     Append a focused Task Lens section
  --update            Update an existing PROJECT_CONTEXT.md as architecture changes
  --dry-run           Report what would be written without writing
  --output <path>     Write to a different path inside the project
  -h, --help          Show this help

Install targets:
  pi, claude-code, codex, cursor, windsurf, all

Export targets:
  agents-md, cursor, windsurf, prompt

Status is printed to stderr; generated prompts/instructions are printed to stdout.`;

const INSTALL_TARGETS = new Set(["pi", "claude-code", "codex", "cursor", "windsurf", "all"]);
const EXPORT_TARGETS = new Set(["agents-md", "cursor", "windsurf", "prompt"]);

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const command = argv[0];

  if (argv.includes("-h") || argv.includes("--help")) {
    process.stdout.write(`${HELP}\n`);
    return;
  }

  if (command === "install") {
    process.stdout.write(`${installInstructions(argv[1] || "all")}\n`);
    return;
  }

  if (command === "export") {
    process.stdout.write(`${exportTemplate(argv[1] || "prompt")}\n`);
    return;
  }

  let briefArgs = argv;
  if (briefArgs[0] === "brief") briefArgs = briefArgs.slice(1);

  const options: BriefOptions = parseArgs(briefArgs);
  const result = await brief(process.cwd(), options);
  process.stderr.write(`${result.notice.message}\n`);
  process.stdout.write(`${result.kickoff}\n`);
}

function installInstructions(target: string): string {
  if (!INSTALL_TARGETS.has(target)) {
    throw new Error(`Unknown install target: ${target}. Expected one of: ${[...INSTALL_TARGETS].join(", ")}`);
  }
  const targets = target === "all" ? ["pi", "claude-code", "codex", "cursor", "windsurf"] : [target];
  return [
    "# brief-ctx install instructions",
    "",
    ...targets.flatMap((item) => installBlock(item)),
  ].join("\n").trimEnd();
}

function installBlock(target: string): string[] {
  if (target === "pi") {
    return [
      "## Pi",
      "```bash",
      "pi install npm:brief-ctx",
      "```",
      "Run `/brief` in any project to generate or refresh PROJECT_CONTEXT.md.",
      "",
    ];
  }
  if (target === "claude-code") {
    return [
      "## Claude Code",
      "Install the Claude Code plugin from adapters/claude-code or a marketplace entry, then run `/brief`.",
      "The command shells out to:",
      "```bash",
      "npx --yes brief-ctx brief $ARGUMENTS",
      "```",
      "",
    ];
  }
  if (target === "codex") {
    return [
      "## Codex",
      "```bash",
      "mkdir -p ~/.codex/prompts",
      "cp adapters/codex/prompts/brief.md ~/.codex/prompts/brief.md",
      "```",
      "Then run `/brief` in Codex. The prompt shells out to `npx --yes brief-ctx brief`.",
      "",
    ];
  }
  if (target === "cursor") {
    return [
      "## Cursor",
      "```bash",
      "brief-ctx export cursor > .cursor/rules/brief-ctx.md",
      "```",
      "Use the rule to make Cursor read PROJECT_CONTEXT.md before editing.",
      "",
    ];
  }
  return [
    "## Windsurf",
    "```bash",
    "brief-ctx export windsurf > .windsurfrules",
    "```",
    "Use the rule to make Windsurf read PROJECT_CONTEXT.md before editing.",
    "",
  ];
}

function exportTemplate(target: string): string {
  if (!EXPORT_TARGETS.has(target)) {
    throw new Error(`Unknown export target: ${target}. Expected one of: ${[...EXPORT_TARGETS].join(", ")}`);
  }
  if (target === "agents-md") return agentsMdTemplate();
  if (target === "cursor") return cursorTemplate();
  if (target === "windsurf") return windsurfTemplate();
  return promptTemplate();
}

function sharedRules(): string {
  return [
    "- Read `PROJECT_CONTEXT.md` before implementation work.",
    "- If the file is missing or stale, run `brief-ctx brief` first.",
    "- Treat `PROJECT_CONTEXT.md` as generated context; do not hand-edit it unless explicitly asked.",
    "- Inspect task-relevant files before editing and keep diffs minimal.",
    "- Do not touch secrets, migrations, auth, billing, or deployment without approval.",
  ].join("\n");
}

function agentsMdTemplate(): string {
  return `# Agent Instructions\n\n## Project context\n\nThis repo uses brief-ctx for portable agent context.\n\n${sharedRules()}\n`;
}

function cursorTemplate(): string {
  return `---\ndescription: Use brief-ctx project context before editing\nalwaysApply: true\n---\n\n# brief-ctx\n\n${sharedRules()}\n`;
}

function windsurfTemplate(): string {
  return `# brief-ctx\n\n${sharedRules()}\n`;
}

function promptTemplate(): string {
  return `Read PROJECT_CONTEXT.md and use it as the working context for this session.\n\nIf PROJECT_CONTEXT.md is missing or stale, ask to run:\n\n\`\`\`bash\nbrief-ctx brief\n\`\`\`\n\nThen summarize the stack, identify important files and risks, inspect task-relevant files, and propose the smallest safe plan before editing.\n`;
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`brief failed: ${message}\n`);
  process.exitCode = 1;
});
