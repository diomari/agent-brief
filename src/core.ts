// Host-agnostic core for the project brief.
//
// This module contains all of the project detection and rendering logic plus a
// single `brief()` orchestrator. It has no dependency on any coding-agent host
// (Pi, Claude Code, Codex, …) — it only reads the filesystem and returns data.
// Host adapters live elsewhere: `extensions/brief.ts` (Pi) and `src/cli.ts` (CLI,
// used by the Claude Code and Codex wrappers).

import { constants as fsConstants } from "node:fs";
import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const COMMAND_DESCRIPTION = "Generate or update a compact project architecture brief";

const DEFAULT_OUTPUT = "PROJECT_CONTEXT.md";
const CACHE_PATH = path.join(".pi", "brief.json");
const TOOL_NAME = "brief-ctx";
const TOOL_VERSION = "1.2.0";
const MAX_READ_BYTES = 100 * 1024;
const FILE_COUNT_CAP = 5000;
const MAX_WALK_DEPTH = 8;
const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".vercel",
  ".turbo",
  "coverage",
  ".cache",
  "out",
]);
const SECRET_FILE_RE = /^\.env($|\.(?!example$).+)/i;
const COUNTABLE_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".md", ".mdx",
  ".css", ".scss", ".sass", ".less", ".html", ".vue", ".svelte", ".astro",
  ".py", ".go", ".rs", ".rb", ".java", ".kt", ".swift", ".php", ".cs",
  ".toml", ".yaml", ".yml", ".sql", ".sh", ".graphql", ".prisma",
]);

export type BriefOptions = {
  update: boolean;
  dryRun: boolean;
  full: boolean;
  outputPath: string;
  task?: string;
};

export type NoticeLevel = "info" | "success" | "warning" | "error";

export type BriefNotice = { level: NoticeLevel; message: string };

export type BriefResult = {
  displayPath: string;
  outputPath: string;
  existed: boolean;
  wrote: boolean;
  dryRun: boolean;
  lineCount: number;
  kickoff: string;
  notice: BriefNotice;
};

type PackageJson = {
  name?: string;
  version?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  bin?: string | Record<string, string>;
  keywords?: string[];
  files?: string[];
  pi?: { extensions?: string[]; prompts?: string[]; image?: string; video?: string };
};

type SizeCategory = "tiny" | "small" | "medium" | "large";

type ScoredFile = { file: string; note: string; score: number };

type ProjectSummary = {
  cwdName: string;
  task?: string;
  topLevelFiles: string[];
  topLevelDirs: string[];
  fileCount: number;
  size: SizeCategory;
  keyFiles: ScoredFile[];
  stack: {
    projectType: string | null;
    package: string | null;
    piGallery: string | null;
    language: string | null;
    runtime: string | null;
    packageManager: string | null;
    framework: string | null;
    database: string | null;
    deployment: string | null;
  };
  commands: {
    install: string | null;
    dev: string | null;
    build: string | null;
    typecheck: string | null;
    lint: string | null;
    test: string | null;
    database: string | null;
    packageCheck: string | null;
  };
  map: {
    entry: string | null;
    core: string | null;
    cli: string | null;
    piExtension: string | null;
    prompts: string | null;
    adapters: string | null;
    tests: string | null;
    types: string | null;
    routesPages: string | null;
    apiServer: string | null;
    components: string | null;
    logic: string | null;
    data: string | null;
    configDeploy: string | null;
  };
  risks: Array<{ label: string; detail: string }>;
  conventions: Record<string, string | null>;
  unknowns: string[];
  changes: string[];
};

type DetectInputs = {
  cwd: string;
  files: string[];
  dirs: string[];
  packageJson: PackageJson | null;
  packageText: string | null;
  envExample: string | null;
  wranglerToml: string | null;
};

/**
 * Generate or update the project brief for `cwd`. Performs IO (writes the brief
 * and cache unless this is a dry run) and returns a host-neutral result
 * describing what happened, a single status notice, and the kickoff prompt to
 * relay. The operation is idempotent: an existing brief is updated in place.
 */
export async function brief(cwd: string, options: BriefOptions): Promise<BriefResult> {
  const outputPath = resolveSafeOutputPath(cwd, options.outputPath);
  const displayPath = path.relative(cwd, outputPath) || path.basename(outputPath);
  const existed = await pathExists(outputPath);

  const summary = await collectProjectInfo(cwd, options);
  const markdown = generateProjectContext(summary, options);
  const lineCount = markdown.split("\n").length;

  let notice: BriefNotice;
  let wrote = false;
  if (options.dryRun) {
    notice = { level: "info", message: `Dry run: ${options.full ? "full" : "compact"} brief is ${lineCount} lines for ${displayPath}.` };
  } else {
    await mkdir(path.dirname(outputPath), { recursive: true });
    await writeFile(outputPath, markdown, "utf8");
    await writeCache(cwd, summary);
    wrote = true;
    notice = { level: "success", message: `${existed ? "Updated" : "Generated"} ${displayPath}.` };
  }

  return {
    displayPath,
    outputPath,
    existed,
    wrote,
    dryRun: options.dryRun,
    lineCount,
    kickoff: generateKickoffPrompt(displayPath, options, !options.dryRun),
    notice,
  };
}

export function parseArgs(tokens: string[]): BriefOptions {
  const options: BriefOptions = {
    update: false,
    dryRun: false,
    full: false,
    outputPath: DEFAULT_OUTPUT,
  };

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === "--update") options.update = true;
    else if (token === "--dry-run") options.dryRun = true;
    else if (token === "--full") options.full = true;
    else if (token === "--output") {
      const value = tokens[i + 1];
      if (!value || value.startsWith("--")) throw new Error("--output requires a path");
      options.outputPath = value;
      i += 1;
    } else if (token.startsWith("--output=")) {
      options.outputPath = token.slice("--output=".length);
      if (!options.outputPath) throw new Error("--output requires a path");
    } else if (token === "--task") {
      const value = tokens[i + 1];
      if (!value || value.startsWith("--")) throw new Error("--task requires text");
      options.task = value;
      i += 1;
    } else if (token.startsWith("--task=")) {
      options.task = token.slice("--task=".length);
      if (!options.task) throw new Error("--task requires text");
    } else if (token.length > 0) {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return options;
}

/** Split a raw argument string into tokens (used by hosts that pass one string, e.g. Pi). */
export function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let quote: "'" | '"' | null = null;
  let escaping = false;

  for (const char of input) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }
    if (char === "\\") {
      escaping = true;
      continue;
    }
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === "'" || char === '"') {
      quote = char;
      continue;
    }
    if (/\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }
    current += char;
  }

  if (escaping) current += "\\";
  if (quote) throw new Error("Unclosed quote in arguments");
  if (current) tokens.push(current);
  return tokens;
}

function resolveSafeOutputPath(cwd: string, outputPath: string): string {
  if (!outputPath || outputPath.includes("\0")) throw new Error("Invalid output path");
  const resolved = path.resolve(cwd, outputPath);
  const root = path.resolve(cwd);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    throw new Error("--output must stay inside the current project");
  }
  return resolved;
}

async function collectProjectInfo(cwd: string, options: BriefOptions): Promise<ProjectSummary> {
  const entries = await safeReadDir(cwd);
  const topLevelFiles = entries.filter((entry) => entry.kind === "file").map((entry) => entry.name).sort();
  const topLevelDirs = entries.filter((entry) => entry.kind === "dir" && !IGNORED_DIRS.has(entry.name)).map((entry) => entry.name).sort();
  const packageJson = await readPackageJson(cwd);
  const packageText = await readTextIfExists(path.join(cwd, "package.json"));
  const envExample = await readTextIfExists(path.join(cwd, ".env.example"));
  const wranglerToml = await readTextIfExists(path.join(cwd, "wrangler.toml"));
  const inputs: DetectInputs = { cwd, files: topLevelFiles, dirs: topLevelDirs, packageJson, packageText, envExample, wranglerToml };

  const previousCache = await readPreviousCache(cwd);
  const fileCount = await countTrackedFiles(cwd);
  const size = categorizeSize(fileCount);
  const stack = detectStack(inputs);
  const commands = detectCommands(packageJson, stack.packageManager);
  const map = detectMap(inputs);
  const keyFiles = detectKeyFiles(inputs);
  const risks = detectRisks(inputs);

  return {
    cwdName: path.basename(cwd),
    task: options.task,
    topLevelFiles,
    topLevelDirs,
    fileCount,
    size,
    keyFiles,
    stack,
    commands,
    map,
    risks,
    conventions: detectConventions(inputs),
    unknowns: collectUnknowns(stack, commands),
    changes: collectChanges(previousCache, { size, fileCount, stack, commands, map, risks, keyFiles }),
  };
}

async function safeReadDir(dir: string): Promise<Array<{ name: string; kind: "file" | "dir" }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  return entries
    .filter((entry) => !SECRET_FILE_RE.test(entry.name))
    .map((entry) => ({ name: entry.name, kind: entry.isDirectory() ? "dir" : "file" }));
}

async function countTrackedFiles(cwd: string): Promise<number> {
  let count = 0;

  async function walk(dir: string, depth: number): Promise<void> {
    if (count >= FILE_COUNT_CAP || depth > MAX_WALK_DEPTH) return;
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (count >= FILE_COUNT_CAP) return;
      if (entry.isDirectory()) {
        if (entry.name.startsWith(".") || IGNORED_DIRS.has(entry.name)) continue;
        await walk(path.join(dir, entry.name), depth + 1);
      } else if (entry.isFile()) {
        if (SECRET_FILE_RE.test(entry.name)) continue;
        if (COUNTABLE_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) count += 1;
      }
    }
  }

  await walk(cwd, 0);
  return count;
}

function categorizeSize(count: number): SizeCategory {
  if (count < 20) return "tiny";
  if (count < 100) return "small";
  if (count < 500) return "medium";
  return "large";
}

async function pathExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readTextIfExists(filePath: string, maxBytes = MAX_READ_BYTES): Promise<string | null> {
  const base = path.basename(filePath);
  if (SECRET_FILE_RE.test(base)) return null;
  try {
    const info = await stat(filePath);
    if (!info.isFile() || info.size > maxBytes) return null;
    return await readFile(filePath, "utf8");
  } catch {
    return null;
  }
}

async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  const text = await readTextIfExists(path.join(cwd, "package.json"));
  if (!text) return null;
  try {
    return JSON.parse(text) as PackageJson;
  } catch {
    return null;
  }
}

async function readPreviousCache(cwd: string): Promise<Record<string, unknown> | null> {
  const text = await readTextIfExists(path.join(cwd, CACHE_PATH));
  if (!text) return null;
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function collectChanges(previous: Record<string, unknown> | null, current: Pick<ProjectSummary, "size" | "fileCount" | "stack" | "commands" | "map" | "risks" | "keyFiles">): string[] {
  if (!previous) return [];
  const changes: string[] = [];
  const previousStack = objectValue(previous.stack);
  const previousCommands = objectValue(previous.commands);
  const previousMap = objectValue(previous.map);
  const previousRisks = arrayValue(previous.risks).join(", ");
  const previousKeyFiles = arrayValue(previous.keyFiles).map((item) => objectValue(item).file).filter(Boolean).join(", ");
  const currentRisks = current.risks.map((risk) => risk.label).join(", ");
  const currentKeyFiles = current.keyFiles.map((item) => item.file).join(", ");

  if (previous.size && previous.size !== current.size) changes.push(`Project size changed: ${previous.size} → ${current.size}.`);
  if (previousStack.projectType !== current.stack.projectType) changes.push(`Project type changed: ${previousStack.projectType || "unknown"} → ${current.stack.projectType || "unknown"}.`);
  if (previousStack.framework !== current.stack.framework) changes.push(`Framework changed: ${previousStack.framework || "unknown"} → ${current.stack.framework || "unknown"}.`);
  if (previousStack.packageManager !== current.stack.packageManager) changes.push(`Package manager changed: ${previousStack.packageManager || "unknown"} → ${current.stack.packageManager || "unknown"}.`);
  if (previousCommands.test !== current.commands.test || previousCommands.typecheck !== current.commands.typecheck || previousCommands.lint !== current.commands.lint) changes.push("Runnable checks changed; re-confirm validation commands before editing.");
  if (previousMap.entry !== current.map.entry || previousMap.core !== current.map.core || previousMap.adapters !== current.map.adapters) changes.push("Project map changed; inspect updated key areas before editing.");
  if (previousRisks !== currentRisks) changes.push(`Risk areas changed: ${previousRisks || "none"} → ${currentRisks || "none"}.`);
  if (previousKeyFiles && previousKeyFiles !== currentKeyFiles) changes.push("Key files changed; review the Key Files section before editing.");
  return changes.slice(0, 8);
}

function objectValue(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function detectPackageManager(files: string[]): string | null {
  if (files.includes("pnpm-lock.yaml")) return "pnpm";
  if (files.includes("bun.lockb") || files.includes("bun.lock")) return "bun";
  if (files.includes("yarn.lock")) return "yarn";
  if (files.includes("package-lock.json")) return "npm";
  if (files.includes("package.json")) return "npm (no lockfile)";
  return null;
}

function detectStack(inputs: DetectInputs): ProjectSummary["stack"] {
  const deps = dependencySet(inputs.packageJson);
  const files = new Set(inputs.files);
  const dirs = new Set(inputs.dirs);
  const frameworks: string[] = [];
  const projectTypes: string[] = [];
  const db: string[] = [];
  const deployment: string[] = [];
  const runtime: string[] = [];

  if (inputs.packageJson?.pi?.extensions || inputs.packageJson?.pi?.prompts || dirs.has("extensions") || dirs.has("prompts")) projectTypes.push("Pi package");
  if (inputs.packageJson?.bin || files.has("cli.ts") || files.has("src/cli.ts")) projectTypes.push("CLI tool");
  if (dirs.has("adapters")) projectTypes.push("multi-agent adapter package");
  if (inputs.packageJson && projectTypes.length === 0 && !deps.has("next") && !deps.has("vite")) projectTypes.push("Node package");

  if (hasAnyFile(files, /^next\.config\./) || deps.has("next") || dirs.has("app") || dirs.has("pages")) frameworks.push("Next.js");
  if (files.has("app.json") || hasAnyFile(files, /^app\.config\./) || deps.has("expo") || deps.has("expo-router")) frameworks.push("Expo");
  if (deps.has("react-native")) frameworks.push("React Native");
  if (hasAnyFile(files, /^vite\.config\./) || deps.has("vite")) frameworks.push("Vite");
  if (hasAnyFile(files, /^astro\.config\./) || deps.has("astro")) frameworks.push("Astro");
  if (deps.has("hono")) frameworks.push("Hono");
  if (files.has("wrangler.toml") || deps.has("wrangler") || deps.has("@cloudflare/workers-types")) frameworks.push("Cloudflare Workers");

  if (inputs.packageJson) runtime.push("Node.js");
  if (files.has("bun.lock") || files.has("bun.lockb")) runtime.push("Bun");

  if (hasAnyFile(files, /^drizzle\.config\./) || deps.has("drizzle-orm")) db.push("Drizzle");
  if (dirs.has("prisma") || deps.has("prisma") || deps.has("@prisma/client")) db.push("Prisma");
  if (dirs.has("supabase") || deps.has("@supabase/supabase-js")) db.push("Supabase");
  if (deps.has("pg") || /postgres|database_url/i.test(inputs.envExample || "")) db.push("Postgres");
  if (/d1_databases/i.test(inputs.wranglerToml || "")) db.push("Cloudflare D1");

  if (/r2_buckets/i.test(inputs.wranglerToml || "")) deployment.push("Cloudflare R2");
  if (files.has("wrangler.toml")) deployment.push("Cloudflare");
  if (files.has("Dockerfile") || files.has("docker-compose.yml")) deployment.push("Docker");
  if (files.has("vercel.json")) deployment.push("Vercel");
  if (dirs.has(".github")) deployment.push("GitHub Actions");

  return {
    projectType: joinOrNull(projectTypes),
    package: detectPackageIdentity(inputs.packageJson),
    piGallery: detectPiGallery(inputs.packageJson),
    language: detectLanguage(inputs.files, deps),
    runtime: joinOrNull(runtime),
    packageManager: detectPackageManager(inputs.files),
    framework: joinOrNull(frameworks),
    database: joinOrNull(db),
    deployment: joinOrNull(deployment),
  };
}

function detectCommands(packageJson: PackageJson | null, packageManager: string | null): ProjectSummary["commands"] {
  const pm = !packageManager
    ? "npm"
    : packageManager.startsWith("pnpm")
      ? "pnpm"
      : packageManager.startsWith("bun")
        ? "bun"
        : packageManager.startsWith("yarn")
          ? "yarn"
          : "npm";
  const run = pm === "npm" ? "npm run" : pm;
  const scripts = packageJson?.scripts || {};
  const script = (name: string) => (scripts[name] ? `${run} ${name}` : null);
  const dbScript = ["db:migrate", "migrate", "db:push", "prisma:migrate", "drizzle:migrate"].find((name) => scripts[name]);

  return {
    install: packageJson ? (pm === "npm" ? "npm install" : `${pm} install`) : null,
    dev: script("dev"),
    build: script("build"),
    typecheck: scripts.typecheck ? `${run} typecheck` : scripts["type-check"] ? `${run} type-check` : null,
    lint: script("lint"),
    test: script("test"),
    database: dbScript ? `${run} ${dbScript}` : null,
    packageCheck: packageJson ? "npm pack --dry-run" : null,
  };
}

function detectMap(inputs: DetectInputs): ProjectSummary["map"] {
  const dirs = new Set(inputs.dirs);
  const files = new Set(inputs.files);
  const hasSrcCli = dirs.has("src") && /"bin"\s*:/.test(inputs.packageText || "");
  return {
    entry: firstPresent([...inputs.files, ...inputs.dirs], ["src", "app", "pages", "index.ts", "index.js", "main.ts", "worker.ts"]),
    core: dirs.has("src") ? "src/" : null,
    cli: inputs.packageJson?.bin ? "package bin" : hasSrcCli ? "src/cli.ts" : null,
    piExtension: dirs.has("extensions") ? "extensions/" : null,
    prompts: dirs.has("prompts") ? "prompts/" : null,
    adapters: dirs.has("adapters") ? "adapters/" : null,
    tests: dirs.has("test") || dirs.has("tests") ? presentDirs(dirs, ["test", "tests"]) : null,
    types: dirs.has("types") ? "types/" : null,
    routesPages: presentDirs(dirs, ["app", "pages", "routes"]),
    apiServer: presentDirs(dirs, ["server", "api"]) || (files.has("worker.ts") ? "worker.ts" : null),
    components: presentDirs(dirs, ["components", "ui"]),
    logic: presentDirs(dirs, ["lib", "services", "features", "domain"]),
    data: presentDirs(dirs, ["db", "prisma", "supabase", "data"]),
    configDeploy: presentFiles(files, ["wrangler.toml", "Dockerfile", "docker-compose.yml", "vercel.json"]) || (dirs.has(".github") ? ".github/" : null),
  };
}

function detectKeyFiles(inputs: DetectInputs): ScoredFile[] {
  const files = new Set(inputs.files);
  const dirs = new Set(inputs.dirs);
  const scored: ScoredFile[] = [];
  const addFile = (file: string, note: string, score: number) => {
    if (files.has(file)) scored.push({ file, note, score });
  };
  const addDir = (dir: string, note: string, score: number) => {
    if (dirs.has(dir)) scored.push({ file: `${dir}/`, note, score });
  };

  // High value: agent/docs entry points, manifests, and config tied to build/deploy/db.
  addFile("AGENTS.md", "agent instructions", 10);
  addFile("CLAUDE.md", "agent instructions", 10);
  addFile("README.md", "project documentation", 9);
  addFile("package.json", "scripts and dependencies", 8);
  addFile("wrangler.toml", "Cloudflare deployment/resources", 8);
  for (const file of inputs.files.filter((name) => /^(vite|next|astro|app|drizzle)\.config\./.test(name))) {
    scored.push({ file, note: "framework/tool configuration", score: 8 });
  }
  addFile(".env.example", "documented env vars (safe example only)", 7);
  addDir("extensions", "Pi extension entrypoints", 7);
  addDir("prompts", "packaged prompt templates", 7);
  addDir("adapters", "cross-agent integrations", 7);
  addDir("prisma", "database schema/migrations", 7);
  addFile("CHANGELOG.md", "release notes", 6);
  addFile("preview.jpg", "Pi gallery preview asset", 6);
  addFile("docker-compose.yml", "local services/deployment", 6);
  addFile("Dockerfile", "container build", 6);
  addFile("vercel.json", "deployment configuration", 6);
  addDir("supabase", "database/backend platform", 6);
  // Medium value: source layout.
  for (const dir of ["src", "app", "pages", "components", "lib", "server", "db"]) addDir(dir, "important project area", 5);
  addDir("test", "behavior coverage", 5);
  addDir("tests", "behavior coverage", 5);
  addDir("types", "ambient type shims", 5);
  addFile("tsconfig.json", "TypeScript configuration", 4);
  addDir(".github", "CI/CD workflows", 4);

  // Low value (lockfiles) intentionally excluded — package manager is captured in Stack.

  return scored.sort((a, b) => b.score - a.score);
}

function detectRisks(inputs: DetectInputs): Array<{ label: string; detail: string }> {
  const deps = dependencySet(inputs.packageJson);
  const text = `${inputs.packageText || ""}\n${inputs.envExample || ""}`.toLowerCase();
  const dirs = new Set(inputs.dirs);
  const files = new Set(inputs.files);
  const risks: Array<{ label: string; detail: string }> = [];

  if (hasAuthSignal(deps, inputs.envExample || "", inputs.files, inputs.dirs)) {
    risks.push({ label: "Auth", detail: "auth/session code present; require approval before changing" });
  }
  if (/stripe|payment|billing|checkout|invoice/.test(text)) {
    risks.push({ label: "Billing", detail: "billing/payments signals present; avoid touching without approval" });
  }
  if (dirs.has("prisma") || dirs.has("db") || deps.has("drizzle-orm") || deps.has("prisma")) {
    risks.push({ label: "Database", detail: "schema/migrations may affect persisted data" });
  }
  if (files.has(".env.example")) {
    risks.push({ label: "Secrets", detail: "env shape exists; never read real .env files" });
  }
  if (inputs.packageJson?.keywords?.includes("pi-package") || inputs.packageJson?.files || inputs.packageJson?.pi) {
    risks.push({ label: "Package publishing", detail: "npm metadata, files whitelist, and Pi gallery fields affect install/listing" });
  }
  if (files.has("wrangler.toml") || files.has("Dockerfile") || files.has("docker-compose.yml") || dirs.has(".github")) {
    risks.push({ label: "Deployment", detail: "deployment/infra config present" });
  }
  if (dirs.has("jobs") || dirs.has("workers") || dirs.has("cron")) {
    risks.push({ label: "Jobs", detail: "background job/worker behavior may have side effects" });
  }

  return risks;
}

function detectConventions(inputs: DetectInputs): ProjectSummary["conventions"] {
  const dirs = new Set(inputs.dirs);
  const deps = dependencySet(inputs.packageJson);
  return {
    "Folder organization": inputs.dirs.filter((dir) => ["src", "app", "pages", "components", "lib", "server", "db"].includes(dir)).join(", ") || null,
    "State management": ["zustand", "redux", "@reduxjs/toolkit", "jotai", "valtio"].filter((dep) => deps.has(dep)).join(", ") || null,
    "API patterns": presentDirs(dirs, ["api", "server", "routes"]) || (deps.has("hono") ? "Hono" : null),
    Styling: ["tailwindcss", "styled-components", "@emotion/react", "nativewind"].filter((dep) => deps.has(dep)).join(", ") || (inputs.files.some((name) => name.includes("tailwind.config")) ? "Tailwind CSS" : null),
    Testing: ["vitest", "jest", "playwright", "cypress", "@testing-library/react"].filter((dep) => deps.has(dep)).join(", ") || null,
  };
}

function collectUnknowns(stack: ProjectSummary["stack"], commands: ProjectSummary["commands"]): string[] {
  const unknowns: string[] = [];
  if (!stack.framework && !stack.projectType) unknowns.push("No framework or project type detected; inspect the project tree to confirm.");
  if (!stack.database) unknowns.push("No database/ORM signal detected.");
  if (!stack.deployment) unknowns.push("Deployment target unclear.");
  if (!commands.test) unknowns.push("No test command detected.");
  if (!commands.lint) unknowns.push("No lint command detected.");
  if (!commands.typecheck) unknowns.push("No typecheck command detected.");
  return unknowns;
}

function generateProjectContext(summary: ProjectSummary, options: BriefOptions): string {
  return options.full ? renderFull(summary) : renderCompact(summary);
}

function renderCompact(summary: ProjectSummary): string {
  const keyFileLimit = summary.size === "large" ? 6 : summary.size === "medium" ? 8 : 12;
  const lines: string[] = [
    "# Project Context",
    "",
    `Generated by \`${TOOL_NAME}\` via \`/brief\` (compact). Package version: ${TOOL_VERSION}. Run \`/brief --full\` for a broader brief. Re-run \`/brief\` whenever architecture gets stale.`,
    "",
    "## Stack",
    ...stackLines(summary.stack, summary.size, summary.fileCount),
    "",
    "## Commands",
    ...commandLines(summary.commands),
    "",
    "## Map",
    ...mapLines(summary.map),
    "",
    "## Key Files",
    ...keyFileLines(summary.keyFiles.slice(0, keyFileLimit)),
    "",
    "## Risks",
    ...riskLines(summary.risks),
    "",
    "## Agent Switching",
    ...agentSwitchingLines(summary),
  ];

  if (summary.changes.length > 0) {
    lines.push("", "## Changed Since Last Brief", ...summary.changes.map((item) => `- ${item}`));
  }

  if (summary.unknowns.length > 0) {
    lines.push("", "## Unknowns", ...summary.unknowns.map((item) => `- ${item}`));
  }

  lines.push("", "## Rules", ...ruleLines());
  lines.push(
    "",
    "## Fresh Session Prompt",
    "Read this file first, then inspect the specific files relevant to the task.",
    "Propose the smallest safe implementation plan before editing.",
  );

  if (summary.task) {
    lines.push("", ...taskLensLines(summary));
  }

  return `${lines.join("\n")}\n`;
}

function renderFull(summary: ProjectSummary): string {
  const lines: string[] = [
    "# Project Context",
    "",
    `Generated by \`${TOOL_NAME}\` via \`/brief --full\`. Package version: ${TOOL_VERSION}. Re-run \`/brief\` whenever architecture gets stale.`,
    "",
    "## Stack",
    ...stackLines(summary.stack, summary.size, summary.fileCount),
    "",
    "## Commands",
    ...commandLines(summary.commands),
    "",
    "## Map",
    ...mapLines(summary.map),
    "",
    "## Top-Level Layout",
    `- Files: ${summary.topLevelFiles.length > 0 ? summary.topLevelFiles.map((f) => `\`${f}\``).join(", ") : "none"}`,
    `- Directories: ${summary.topLevelDirs.length > 0 ? summary.topLevelDirs.map((d) => `\`${d}/\``).join(", ") : "none"}`,
    "",
    "## Key Files",
    ...keyFileLines(summary.keyFiles.slice(0, 30)),
    "",
    "## Risks",
    ...riskLines(summary.risks),
    "",
    "## Agent Switching",
    ...agentSwitchingLines(summary),
    "",
    "## Conventions",
    ...conventionLines(summary.conventions),
  ];

  if (summary.changes.length > 0) {
    lines.push("", "## Changed Since Last Brief", ...summary.changes.map((item) => `- ${item}`));
  }

  if (summary.unknowns.length > 0) {
    lines.push("", "## Unknowns", ...summary.unknowns.map((item) => `- ${item}`));
  }

  lines.push("", "## Rules", ...ruleLines());
  lines.push(
    "",
    "## Fresh Session Prompt",
    "Read this file first, then inspect the specific files relevant to the task.",
    "Propose the smallest safe implementation plan before editing.",
  );

  if (summary.task) {
    lines.push("", ...taskLensLines(summary));
  }

  return `${lines.join("\n")}\n`;
}

function detectPackageIdentity(packageJson: PackageJson | null): string | null {
  if (!packageJson?.name) return null;
  return packageJson.version ? `${packageJson.name}@${packageJson.version}` : packageJson.name;
}

function detectPiGallery(packageJson: PackageJson | null): string | null {
  if (!packageJson) return null;
  const signals: string[] = [];
  if (packageJson.keywords?.includes("pi-package")) signals.push("pi-package keyword");
  if (packageJson.pi?.image) signals.push("preview image configured");
  if (packageJson.pi?.video) signals.push("preview video configured");
  if (packageJson.pi?.extensions?.length) signals.push("extensions manifest");
  if (packageJson.pi?.prompts?.length) signals.push("prompts manifest");
  return joinOrNull(signals);
}

function hasAuthSignal(deps: Set<string>, envExample: string, files: string[], dirs: string[]): boolean {
  const authDeps = ["next-auth", "better-auth", "lucia", "@clerk/nextjs", "@clerk/clerk-js"];
  if (authDeps.some((dep) => deps.has(dep))) return true;
  if (/(^|\n)\s*(AUTH|SESSION|JWT|OAUTH|CLERK)_/i.test(envExample)) return true;
  if (dirs.some((dir) => /^(auth|session|sessions)$/i.test(dir))) return true;
  if (files.some((file) => /^(middleware|auth|session)\.(ts|tsx|js|jsx)$/i.test(file))) return true;
  return false;
}

function stackLines(stack: ProjectSummary["stack"], size: SizeCategory, fileCount: number): string[] {
  const lines: string[] = [];
  pushIf(lines, "Project type", stack.projectType);
  pushIf(lines, "Package", stack.package);
  pushIf(lines, "Pi gallery", stack.piGallery);
  pushIf(lines, "Language", stack.language);
  pushIf(lines, "Runtime", stack.runtime);
  pushIf(lines, "Package manager", stack.packageManager);
  pushIf(lines, "Framework", stack.framework);
  pushIf(lines, "Database / ORM", stack.database);
  pushIf(lines, "Deployment", stack.deployment);
  const countLabel = fileCount >= FILE_COUNT_CAP ? `${FILE_COUNT_CAP}+` : `~${fileCount}`;
  lines.push(`- Size: ${size} (${countLabel} source/config files)`);
  return lines;
}

function commandLines(commands: ProjectSummary["commands"]): string[] {
  const lines: string[] = [];
  pushIf(lines, "Install", commands.install);
  pushIf(lines, "Dev", commands.dev);
  pushIf(lines, "Build", commands.build);
  pushIf(lines, "Typecheck", commands.typecheck);
  pushIf(lines, "Lint", commands.lint);
  pushIf(lines, "Test", commands.test);
  pushIf(lines, "DB/migrations", commands.database);
  pushIf(lines, "Package check", commands.packageCheck);
  return lines.length > 0 ? lines : ["- No runnable scripts detected."];
}

function mapLines(map: ProjectSummary["map"]): string[] {
  const lines: string[] = [];
  pushIf(lines, "Entry", map.entry);
  pushIf(lines, "Core", map.core);
  pushIf(lines, "CLI", map.cli);
  pushIf(lines, "Pi extension", map.piExtension);
  pushIf(lines, "Prompts", map.prompts);
  pushIf(lines, "Agent adapters", map.adapters);
  pushIf(lines, "Tests", map.tests);
  pushIf(lines, "Types", map.types);
  pushIf(lines, "Routes/pages", map.routesPages);
  pushIf(lines, "API/server", map.apiServer);
  pushIf(lines, "UI/components", map.components);
  pushIf(lines, "Logic", map.logic);
  pushIf(lines, "Data", map.data);
  pushIf(lines, "Config/deploy", map.configDeploy);
  return lines.length > 0 ? lines : ["- Inspect the project tree before editing."];
}

function keyFileLines(keyFiles: ScoredFile[]): string[] {
  if (keyFiles.length === 0) return ["- Not detected from top-level files."];
  return keyFiles.map((item) => `- \`${item.file}\` — ${item.note}`);
}

function riskLines(risks: Array<{ label: string; detail: string }>): string[] {
  if (risks.length === 0) return ["- No high-risk areas detected; still inspect relevant files before editing."];
  return risks.map((risk) => `- ${risk.label}: ${risk.detail}`);
}

function agentSwitchingLines(summary: ProjectSummary): string[] {
  const hosts = ["Pi", "CLI"];
  if (summary.map.adapters) hosts.push("Claude Code", "Codex");
  return [
    "- Shared context file: PROJECT_CONTEXT.md",
    "- Refresh command: /brief or `brief-ctx brief`",
    `- Works in: ${[...new Set(hosts)].join(", ")}`,
    "- Rule: refresh before switching agents after architecture changes.",
  ];
}

function conventionLines(conventions: ProjectSummary["conventions"]): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(conventions)) pushIf(lines, key, value);
  return lines.length > 0 ? lines : ["- Infer conventions from nearby files before editing."];
}

function ruleLines(): string[] {
  return [
    "- Read this file first.",
    "- Inspect task-relevant files before editing.",
    "- Keep diffs minimal and preserve local patterns.",
    "- Do not add dependencies unless necessary.",
    "- Do not touch secrets, migrations, auth, billing, or deployment without approval.",
    "- Run available checks (typecheck/lint/tests) when possible.",
  ];
}

function taskLensLines(summary: ProjectSummary): string[] {
  const areas = taskLikelyAreas(summary);
  const riskLabels = summary.risks.map((risk) => risk.label.toLowerCase());
  return [
    "## Task Lens",
    `- Task: ${summary.task}`,
    `- Likely areas: ${areas.length > 0 ? areas.join(", ") : "inspect the project tree to locate relevant files"}`,
    `- Risks: ${riskLabels.length > 0 ? riskLabels.join(", ") : "none detected, but verify before editing"}`,
    "- First step: inspect existing patterns in the likely areas before editing.",
  ];
}

function taskLikelyAreas(summary: ProjectSummary): string[] {
  const task = (summary.task || "").toLowerCase();
  const areas = new Set<string>();
  const add = (...values: Array<string | null>) => values.filter(Boolean).forEach((value) => areas.add(value!));
  if (/pi|extension|\/brief/.test(task)) add("extensions/brief.ts", "src/core.ts");
  if (/cli|npx|bin|terminal/.test(task)) add("src/cli.ts", "package.json", "test/cli.test.ts");
  if (/claude/.test(task)) add("adapters/claude-code/");
  if (/codex/.test(task)) add("adapters/codex/");
  if (/npm|publish|package|gallery|preview|install/.test(task)) add("package.json", "README.md", "docs/production-readiness.md");
  if (/scanner|detect|risk|map|brief|context/.test(task)) add("src/core.ts", "test/brief.test.ts");
  if (areas.size === 0) add(summary.map.routesPages, summary.map.components, summary.map.apiServer, summary.map.data, summary.map.core);
  return [...areas];
}

async function writeCache(cwd: string, summary: ProjectSummary): Promise<void> {
  const cachePath = path.join(cwd, CACHE_PATH);
  const payload = {
    generatedAt: new Date().toISOString(),
    name: summary.cwdName,
    size: summary.size,
    fileCount: summary.fileCount,
    stack: summary.stack,
    commands: summary.commands,
    map: summary.map,
    risks: summary.risks.map((risk) => risk.label),
    keyFiles: summary.keyFiles.map(({ file, score }) => ({ file, score })),
    unknowns: summary.unknowns,
    changes: summary.changes,
    generatedBy: { name: TOOL_NAME, version: TOOL_VERSION },
  };
  try {
    await mkdir(path.dirname(cachePath), { recursive: true });
    await writeFile(cachePath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  } catch {
    // Cache is best-effort; never fail brief generation because of it.
  }
}

function generateKickoffPrompt(outputPath: string, options: BriefOptions, generated: boolean): string {
  const verb = generated ? "Read" : "Read (after generating)";
  let prompt = `${verb} ${outputPath} and use it as the working context for this session.\n\nBefore making any implementation changes:\n1. Summarize the current stack and architecture in 5–10 bullets.\n2. Identify the most important files for future changes.\n3. Identify risky areas that should not be touched without explicit approval.\n4. If a task was provided, identify likely files involved and propose a minimal plan.\n5. Do not edit files yet unless the user explicitly asked for implementation.`;
  if (options.task) {
    prompt += `\n\nTask to prepare for:\n${options.task}\n\nFor this task, identify likely files, risks, unknowns, and the smallest safe implementation plan. Do not edit yet.`;
  }
  return prompt;
}

function pushIf(lines: string[], label: string, value: string | null): void {
  if (value) lines.push(`- ${label}: ${value}`);
}

function dependencySet(packageJson: PackageJson | null): Set<string> {
  return new Set(Object.keys({
    ...(packageJson?.dependencies || {}),
    ...(packageJson?.devDependencies || {}),
    ...(packageJson?.peerDependencies || {}),
    ...(packageJson?.optionalDependencies || {}),
  }));
}

function detectLanguage(files: string[], deps: Set<string>): string | null {
  if (files.includes("tsconfig.json") || deps.has("typescript")) return "TypeScript";
  if (files.includes("package.json")) return "JavaScript";
  if (files.includes("pyproject.toml") || files.includes("requirements.txt")) return "Python";
  if (files.includes("go.mod")) return "Go";
  if (files.includes("Cargo.toml")) return "Rust";
  return null;
}

function hasAnyFile(files: Set<string>, pattern: RegExp): boolean {
  return [...files].some((file) => pattern.test(file));
}

function presentDirs(dirs: Set<string>, names: string[]): string | null {
  const found = names.filter((name) => dirs.has(name)).map((name) => `${name}/`);
  return found.length > 0 ? found.join(", ") : null;
}

function presentFiles(files: Set<string>, names: string[]): string | null {
  const found = names.filter((name) => files.has(name));
  return found.length > 0 ? found.join(", ") : null;
}

function firstPresent(files: string[], names: string[]): string | null {
  const fileSet = new Set(files);
  return names.find((name) => fileSet.has(name)) || null;
}

function joinOrNull(values: string[]): string | null {
  const unique = [...new Set(values)];
  return unique.length > 0 ? unique.join(", ") : null;
}
