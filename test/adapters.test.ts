import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const root = new URL("../", import.meta.url);
const read = (rel: string) => readFile(fileURLToPath(new URL(rel, root)), "utf8");

test("Claude Code plugin.json is valid and names the package", async () => {
  const plugin = JSON.parse(await read("adapters/claude-code/.claude-plugin/plugin.json"));
  assert.equal(plugin.name, "pi-agent-brief");
  assert.ok(plugin.version, "plugin should declare a version");
  assert.ok(plugin.description, "plugin should declare a description");
});

test("Claude Code command runs the CLI and has valid frontmatter", async () => {
  const md = await read("adapters/claude-code/commands/onboard.md");
  assert.match(md, /^---\n[\s\S]*?\n---/, "command should start with YAML frontmatter");
  assert.match(md, /allowed-tools:.*Bash/, "command must allow the Bash tool");
  assert.match(md, /pi-agent-brief onboard \$ARGUMENTS/, "command must invoke the CLI with args");
  assert.match(md, /Read `PROJECT_CONTEXT\.md`/);
});

test("Codex prompt runs the CLI and reads the output", async () => {
  const md = await read("adapters/codex/prompts/onboard.md");
  assert.match(md, /pi-agent-brief onboard \$ARGUMENTS/, "prompt must invoke the CLI with args");
  assert.match(md, /PROJECT_CONTEXT\.md/);
});
