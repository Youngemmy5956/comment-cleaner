#!/usr/bin/env node

/**
 * comment-cleaner
 * Scan your codebase for commented-out code, preview, fix, and report.
 *
 * Usage:
 *   comment-cleaner [path] [options]
 */

const fs = require("fs");
const path = require("path");

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", white: "\x1b[37m",
};
const paint = (col, text) => `${col}${text}${c.reset}`;

// ─── Language Definitions ─────────────────────────────────────────────────────
const LANGUAGES = {
  ".js": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "JavaScript" },
  ".jsx": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "JSX" },
  ".ts": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "TypeScript" },
  ".tsx": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "TSX" },
  ".mjs": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "ESModule" },
  ".cjs": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "CJS" },
  ".py": { single: "#", mlStart: '"""', mlEnd: '"""', doc: null, name: "Python" },
  ".css": { single: null, mlStart: "/*", mlEnd: "*/", doc: "/**", name: "CSS" },
  ".scss": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "SCSS" },
  ".sass": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Sass" },
  ".less": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Less" },
};

// ─── Default ignore paths ─────────────────────────────────────────────────────
const DEFAULT_IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", ".nuxt",
  "__pycache__", ".venv", "venv", "env",
  "coverage", ".nyc_output", ".cache", "vendor",
]);

// ─── Code detection heuristics ───────────────────────────────────────────────
const CODE_SIGNALS = [
  /\b(const|let|var)\s+\w+\s*[=:({;]/,
  /\bfunction\s+\w+\s*\(/,
  /\bclass\s+\w+[\s{(]/,
  /\bimport\s+.+\s+from\s+['"`]/,
  /\bimport\s*{/,
  /\bexport\s+(default\s+)?(function|class|const|let|var)\b/,
  /\brequire\s*\(/,
  /\breturn\s+.+[;)]/,
  /\bthrow\s+new\s+\w+/,
  /\w[\w.[\]]*\s*=[^=>]\s*.+/,
  /\w[\w.]*\s*\(.+\)\s*[;{,)]/,
  /\(.*\)\s*=>/,
  /\w+\s*=>\s*[{(]/,
  /\b(if|while|for)\s*\(.+\)/,
  /^\s*<[A-Z]\w+[\s/>]/,
  /^\s*<\/\w+>/,
  /^\s*[}\]]{1,3}\s*[;,)]*\s*$/,
  /\w.{4,};\s*$/,
  /\bdef\s+\w+\s*\(/,
  /\bself\.\w+\s*[=(]/,
  /\bprint\s*\(.+\)/,
  /^\s*@\w+(\(.*\))?\s*$/,
];

const PROSE_SIGNALS = [
  /^(TODO|FIXME|HACK|NOTE|XXX|BUG|OPTIMIZE|REVIEW|WARN|WARNING|NB)\b/i,
  /^https?:\/\//,
  /^[-=*#]+\s/,
  /^@(param|returns?|type|throws?|deprecated|see|example|author)\b/i,
  /^[A-Z][a-z]+ [a-z]/,
  /\.\s*$/,
  /^(This|The|A |An |We |It |Used|Use|Handles?|Helper|Check|Load|Set|Get|Add|Remove|Create|Update|Delete|Init|Initialize|Format|Convert|Parse|Build|Render|Show|Hide|Listen|Watch|Fetch|Send|Save|Clear|Reset|Toggle|Dispatch|Extract|Calculate|Find|Sort|Filter|Map|Wrap|Only|Also|Note|See|For|When|If this|Cleanup)\b/i,
  /^[A-Z][^{};]+$/,
];

const MULTI_LINE_THRESHOLD = 2;

function looksLikeCode(text) {
  const t = text.trim();
  if (!t || t.length < 5) return false;
  for (const p of PROSE_SIGNALS) if (p.test(t)) return false;
  let score = 0;
  for (const p of CODE_SIGNALS) if (p.test(t)) score++;
  return score >= 1;
}

function looksLikeCodeBlock(lines) {
  const combined = lines.map(l => l.trim()).join(" ");
  if (!combined || combined.length < 10) return false;
  for (const p of PROSE_SIGNALS) if (p.test(combined.trim())) return false;
  let score = 0;
  for (const p of CODE_SIGNALS) if (p.test(combined)) score++;
  for (const line of lines) {
    for (const p of CODE_SIGNALS) if (p.test(line.trim())) score++;
  }
  return score >= MULTI_LINE_THRESHOLD;
}

// ─── Config file loader (.commentcleanerrc) ───────────────────────────────────
function loadConfig(startDir) {
  const configNames = [".commentcleanerrc", ".commentcleanerrc.json", "commentcleaner.config.json"];
  let dir = startDir;

  // Walk up the directory tree looking for a config file
  for (let i = 0; i < 6; i++) {
    for (const name of configNames) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, "utf8");
          const config = JSON.parse(raw);
          console.log(paint(c.dim, `  ⚙️  Config loaded from: ${path.relative(process.cwd(), configPath)}\n`));
          return config;
        } catch (e) {
          console.warn(paint(c.yellow, `  ⚠️  Could not parse config file: ${configPath}`));
        }
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return {};
}

function applyConfig(opts, config) {
  // Config file values are defaults — CLI flags override them
  if (config.extensions && opts.extensions === null) {
    opts.extensions = new Set(
      config.extensions.map(e => e.startsWith(".") ? e.toLowerCase() : "." + e.toLowerCase())
    );
  }
  if (config.ignore && opts.extraIgnore.length === 0) {
    opts.extraIgnore = config.ignore;
  }
  if (config.report !== undefined && !opts.report) {
    opts.report = config.report;
  }
  if (config.reportPath && !opts.reportPath) {
    opts.reportPath = config.reportPath;
  }
  if (config.fix !== undefined && !opts.fix) {
    opts.fix = config.fix;
  }
  return opts;
}

// ─── File parser ──────────────────────────────────────────────────────────────
function parseFile(filePath, lang) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const blocks = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Single-line comment
    if (lang.single && trimmed.startsWith(lang.single)) {
      if (trimmed.startsWith("///")) { i++; continue; }
      const text = trimmed.slice(lang.single.length).trim();
      if (looksLikeCode(text)) {
        const group = [{ lineNum: i + 1, raw: line }];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j].trim();
          if (next.startsWith(lang.single) && !next.startsWith("///")) {
            const nextText = next.slice(lang.single.length).trim();
            if (looksLikeCode(nextText)) {
              group.push({ lineNum: j + 1, raw: lines[j] });
              j++;
              continue;
            }
          }
          break;
        }
        blocks.push({ startLine: i + 1, endLine: group[group.length - 1].lineNum, lines: group });
        i = j;
        continue;
      }
    }

    // Multi-line comment
    if (lang.mlStart && trimmed.startsWith(lang.mlStart)) {
      if (lang.doc && trimmed.startsWith(lang.doc) && lang.doc !== lang.mlStart) {
        i++; continue;
      }
      const group = [{ lineNum: i + 1, raw: line }];
      let closed = trimmed.includes(lang.mlEnd) && trimmed.length > lang.mlStart.length;
      let j = i + 1;
      while (!closed && j < lines.length) {
        group.push({ lineNum: j + 1, raw: lines[j] });
        if (lines[j].includes(lang.mlEnd)) closed = true;
        j++;
      }
      const innerLines = group
        .map((l) => l.raw.replace(/^[\s/*#"]+/, "").replace(/[\s/*"]+$/, ""));
      if (looksLikeCodeBlock(innerLines)) {
        blocks.push({ startLine: i + 1, endLine: group[group.length - 1].lineNum, lines: group });
      }
      i = j;
      continue;
    }

    i++;
  }

  return blocks;
}

// ─── Fix: remove commented blocks from a file ────────────────────────────────
function fixFile(filePath, blocks) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const linesToRemove = new Set();
  for (const block of blocks) {
    for (let i = block.startLine - 1; i < block.endLine; i++) {
      linesToRemove.add(i);
    }
  }
  const cleaned = lines.filter((_, idx) => !linesToRemove.has(idx)).join("\n");
  fs.writeFileSync(filePath, cleaned, "utf8");
}

// ─── Directory walker ─────────────────────────────────────────────────────────
function walkDir(dirPath, allowedExts, extraIgnore) {
  const ignore = new Set([...DEFAULT_IGNORE, ...extraIgnore]);
  const files = [];

  function walk(current) {
    const parts = current.split(path.sep);
    if (parts.some((p) => ignore.has(p))) return;
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExts.has(ext)) files.push(full);
      }
    }
  }

  walk(dirPath);
  return files;
}

// ─── Console preview ──────────────────────────────────────────────────────────
function printPreview(findings, meta) {
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );

  if (fileCount === 0) {
    console.log(paint(c.green + c.bold, "\n✅  No commented-out code found. Your codebase is clean!\n"));
    return;
  }

  for (const [filePath, blocks] of Object.entries(findings)) {
    console.log(
      paint(c.yellow + c.bold, `\n📄 ${filePath}`) +
      paint(c.dim, `  (${blocks.length} block${blocks.length > 1 ? "s" : ""})`)
    );
    for (const block of blocks) {
      const range = block.startLine === block.endLine
        ? `line ${block.startLine}`
        : `lines ${block.startLine}–${block.endLine}`;
      console.log(paint(c.dim, `  ┌─ ${range} ${"─".repeat(Math.max(0, 46 - range.length))}`));
      for (const l of block.lines) {
        console.log(
          paint(c.dim, `  │ ${String(l.lineNum).padStart(4)}  `) +
          paint(c.red, l.raw)
        );
      }
      console.log(paint(c.dim, `  └${"─".repeat(52)}`));
    }
  }

  console.log(paint(c.cyan + c.bold, "\n═══════════════════ Summary ═══════════════════"));
  console.log(`  ${paint(c.white, "Files scanned:         ")} ${meta.totalFiles}`);
  console.log(`  ${paint(c.yellow, "Files with issues:     ")} ${fileCount}`);
  console.log(`  ${paint(c.red, "Commented blocks:      ")} ${totalBlocks}`);
  console.log(`  ${paint(c.dim, "Lines affected:        ")} ${totalLines}`);
  console.log();
}

// ─── Markdown report ──────────────────────────────────────────────────────────
function renderReport(findings, meta) {
  const now = new Date().toISOString();
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );

  const lines = [
    "# 🧹 Comment Cleaner Report",
    "",
    `> **Generated:** ${now}  `,
    `> **Scanned path:** \`${meta.targetPath}\`  `,
    `> **Extensions:** ${[...meta.extensions].join(", ")}`,
    "",
    "---",
    "",
    "## Summary",
    "",
    "| Metric | Value |",
    "|--------|-------|",
    `| Files scanned | ${meta.totalFiles} |`,
    `| Files with commented code | ${fileCount} |`,
    `| Commented-out blocks | ${totalBlocks} |`,
    `| Lines of commented code | ${totalLines} |`,
    "",
    "---",
    "",
    "## Findings",
    "",
  ];

  if (fileCount === 0) {
    lines.push("✅ No commented-out code detected. Your codebase is clean!");
  } else {
    for (const [filePath, blocks] of Object.entries(findings)) {
      lines.push(`### \`${filePath}\``);
      lines.push("");
      for (const block of blocks) {
        const range = block.startLine === block.endLine
          ? `Line ${block.startLine}`
          : `Lines ${block.startLine}–${block.endLine}`;
        lines.push(`**${range}** — ${block.lines.length} line(s)`);
        lines.push("```");
        for (const l of block.lines) lines.push(l.raw);
        lines.push("```");
        lines.push("");
      }
    }
  }

  lines.push("---");
  lines.push("*Generated by comment-cleaner*");
  return lines.join("\n");
}

// ─── Arg parser ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    targetPath: ".",
    report: false,
    reportPath: null,
    extensions: null,           // null = load from config or use defaults
    extraIgnore: [],
    noPreview: false,
    fix: false,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") {
      opts.help = true;
    } else if (a === "-r" || a === "--report") {
      opts.report = true;
      if (args[i + 1] && !args[i + 1].startsWith("-")) opts.reportPath = args[++i];
    } else if (a === "-e" || a === "--ext") {
      const raw = args[++i] || "";
      opts.extensions = new Set(
        raw.split(",").map((e) => (e.startsWith(".") ? e.toLowerCase() : "." + e.toLowerCase()))
      );
    } else if (a === "--ignore") {
      opts.extraIgnore = (args[++i] || "").split(",").map((s) => s.trim());
    } else if (a === "--no-preview") {
      opts.noPreview = true;
    } else if (a === "--fix" || a === "-f") {
      opts.fix = true;
    } else if (!a.startsWith("-")) {
      opts.targetPath = a;
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
${paint(c.cyan + c.bold, "comment-cleaner")} — Find and remove commented-out code

${paint(c.bold, "Usage:")}
  comment-cleaner [path] [options]

${paint(c.bold, "Arguments:")}
  path                    Directory or file to scan  (default: current dir)

${paint(c.bold, "Options:")}
  -h, --help              Show this help
  -r, --report [file]     Save findings as a Markdown report
                          Default filename: comment-cleaner-YYYY-MM-DD.md
  -f, --fix               Automatically remove all detected commented-out code
  -e, --ext .js,.ts,.py   Only scan these extensions (comma-separated)
  --ignore dir1,dir2      Extra directories to skip (added to defaults)
  --no-preview            Suppress terminal output

${paint(c.bold, "Config file:")}
  Create a ${paint(c.cyan, ".commentcleanerrc")} file in your project root to set defaults:
  {
    "extensions": [".js", ".ts", ".tsx"],
    "ignore": ["tmp", "fixtures"],
    "report": true,
    "reportPath": "reports/comments.md"
  }

${paint(c.bold, "Default extensions scanned:")}
  .js  .jsx  .ts  .tsx  .mjs  .cjs  .py  .css  .scss  .sass  .less

${paint(c.bold, "Always-ignored directories:")}
  node_modules  .git  dist  build  .next  __pycache__
  .venv  venv  coverage  .nyc_output  .cache  vendor

${paint(c.bold, "Examples:")}
  comment-cleaner                        Scan current directory
  comment-cleaner ./src                  Scan ./src
  comment-cleaner ./src -r               Scan and save report
  comment-cleaner ./src --fix            Remove all commented-out code
  comment-cleaner ./src --fix -r         Remove and save report of what was removed
  comment-cleaner . -e .js,.ts           Only JS and TS files
  comment-cleaner . --no-preview -r      Report only, no terminal output
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  let opts = parseArgs(process.argv);

  if (opts.help) { printHelp(); process.exit(0); }

  console.log(paint(c.cyan + c.bold, `
╔══════════════════════════════════════╗
║      🧹  comment-cleaner  🧹         ║
║  Scan · Fix · Report                 ║
╚══════════════════════════════════════╝`));

  const targetPath = path.resolve(opts.targetPath);

  if (!fs.existsSync(targetPath)) {
    console.error(paint(c.red, `\n❌  Path not found: ${targetPath}\n`));
    process.exit(1);
  }

  // Load config file and merge (CLI flags take priority)
  const config = loadConfig(path.dirname(targetPath));
  opts = applyConfig(opts, config);

  // Fall back to all supported extensions if none set
  if (!opts.extensions) {
    opts.extensions = new Set(Object.keys(LANGUAGES));
  }

  const isFile = fs.statSync(targetPath).isFile();

  console.log(paint(c.blue, `\n🔍 Scanning: ${paint(c.bold + c.blue, targetPath)}`));
  console.log(paint(c.dim, `   Extensions : ${[...opts.extensions].join("  ")}`));
  if (opts.fix) console.log(paint(c.yellow, `   Mode       : --fix (will remove commented-out code)`));
  if (opts.extraIgnore.length) {
    console.log(paint(c.dim, `   Extra ignore: ${opts.extraIgnore.join(", ")}`));
  }
  console.log();

  // Collect files
  const files = isFile
    ? [targetPath]
    : walkDir(targetPath, opts.extensions, opts.extraIgnore);

  console.log(paint(c.dim, `  Found ${files.length} file(s) to analyse...\n`));

  // Analyse
  const findings = {};
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const lang = LANGUAGES[ext];
    if (!lang) continue;

    let blocks;
    try { blocks = parseFile(filePath, lang); }
    catch (err) {
      console.warn(paint(c.dim, `  ⚠️  Could not read ${filePath}: ${err.message}`));
      continue;
    }

    if (blocks.length > 0) {
      findings[path.relative(process.cwd(), filePath)] = blocks;
    }
  }

  const meta = {
    targetPath: path.relative(process.cwd(), targetPath) || ".",
    totalFiles: files.length,
    extensions: opts.extensions,
  };

  // Console preview
  if (!opts.noPreview) {
    printPreview(findings, meta);
  }

  // --fix: remove all commented-out code
  if (opts.fix) {
    const fileCount = Object.keys(findings).length;
    if (fileCount === 0) {
      console.log(paint(c.green, "✅  Nothing to fix — codebase is already clean!\n"));
    } else {
      console.log(paint(c.yellow + c.bold, `\n🔧 Fixing ${fileCount} file(s)...\n`));
      let fixedCount = 0;
      for (const [relPath, blocks] of Object.entries(findings)) {
        const absPath = path.resolve(relPath);
        try {
          fixFile(absPath, blocks);
          console.log(
            paint(c.green, `  ✅ ${relPath}`) +
            paint(c.dim, `  (${blocks.length} block${blocks.length > 1 ? "s" : ""} removed)`)
          );
          fixedCount++;
        } catch (err) {
          console.warn(paint(c.red, `  ❌ Could not fix ${relPath}: ${err.message}`));
        }
      }
      console.log(paint(c.green + c.bold, `\n🎉 Done! Fixed ${fixedCount} file(s).\n`));
    }
  }

  // Report
  if (opts.report) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const reportPath = opts.reportPath || `comment-cleaner-${timestamp}.md`;
    fs.writeFileSync(reportPath, renderReport(findings, meta), "utf8");
    console.log(paint(c.green + c.bold, `📊 Report saved → ${reportPath}\n`));
  } else if (!opts.fix) {
    console.log(paint(c.dim, "  💡 Add -r to save a report  |  Add --fix to remove all flagged blocks.\n"));
  }

  // Exit with code 1 if issues found (useful for CI)
  if (opts.fix === false && Object.keys(findings).length > 0) {
    process.exitCode = 1;
  }
}

main();