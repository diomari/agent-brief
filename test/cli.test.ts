import { test } from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

type CliRun = { stdout: string; stderr: string; code: number };

async function cli(cwd: string, args: string[]): Promise<CliRun> {
  try {
    const { stdout, stderr } = await run(process.execPath, [CLI, ...args], { cwd });
    return { stdout, stderr, code: 0 };
  } catch (error) {
    const e = error as { stdout?: string; stderr?: string; code?: number };
    return { stdout: e.stdout ?? "", stderr: e.stderr ?? "", code: e.code ?? 1 };
  }
}

async function fixture(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "brief-cli-"));
  await writeFile(
    path.join(dir, "package.json"),
    JSON.stringify({ name: "demo", scripts: { dev: "vite", test: "vitest" }, dependencies: { vite: "^5" } }),
    "utf8",
  );
  await writeFile(path.join(dir, "README.md"), "# Demo\n", "utf8");
  return dir;
}

test("CLI writes the brief and prints the kickoff to stdout", async () => {
  const dir = await fixture();
  try {
    const r = await cli(dir, ["brief"]);
    assert.equal(r.code, 0);
    assert.match(r.stderr, /Generated PROJECT_CONTEXT\.md/);
    assert.match(r.stdout, /working context for this session/);
    const file = await readFile(path.join(dir, "PROJECT_CONTEXT.md"), "utf8");
    assert.match(file, /# Project Context/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI --dry-run writes nothing", async () => {
  const dir = await fixture();
  try {
    const r = await cli(dir, ["--dry-run"]);
    assert.equal(r.code, 0);
    assert.match(r.stderr, /Dry run/);
    const exists = await readFile(path.join(dir, "PROJECT_CONTEXT.md"), "utf8").catch(() => null);
    assert.equal(exists, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI --help prints usage and exits 0", async () => {
  const dir = await fixture();
  try {
    const r = await cli(dir, ["--help"]);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /Usage:/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI install helper prints agent-specific setup", async () => {
  const dir = await fixture();
  try {
    const r = await cli(dir, ["install", "all"]);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /pi install npm:brief-ctx/);
    assert.match(r.stdout, /Claude Code/);
    assert.match(r.stdout, /~\/\.codex\/prompts/);
    assert.match(r.stdout, /brief-ctx export cursor/);
    assert.match(r.stdout, /brief-ctx export windsurf/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI export helper prints portable agent rules", async () => {
  const dir = await fixture();
  try {
    const r = await cli(dir, ["export", "agents-md"]);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /# Agent Instructions/);
    assert.match(r.stdout, /Read `PROJECT_CONTEXT\.md`/);
    assert.match(r.stdout, /brief-ctx brief/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI reports unknown install/export targets", async () => {
  const dir = await fixture();
  try {
    const install = await cli(dir, ["install", "nope"]);
    assert.equal(install.code, 1);
    assert.match(install.stderr, /Unknown install target/);
    const exported = await cli(dir, ["export", "nope"]);
    assert.equal(exported.code, 1);
    assert.match(exported.stderr, /Unknown export target/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("CLI reports unknown flags with a non-zero exit", async () => {
  const dir = await fixture();
  try {
    const r = await cli(dir, ["--nope"]);
    assert.equal(r.code, 1);
    assert.match(r.stderr, /Unknown argument/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
