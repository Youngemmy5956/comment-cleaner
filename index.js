#!/usr/bin/env node

/**
 * comment-cleaner
 * Scan your codebase for commented-out code and generate a report.
 *
 * Usage:
 *   node index.js [path] [options]
 */

const fs = require("fs");
const path = require("path");

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
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
// These patterns are STRONG signals that a comment contains actual code.
// They require syntax, not just keywords used in plain English.
const CODE_SIGNALS = [
  // Declarations — keyword immediately followed by a name or punctuation
  /\b(const|let|var)\s+\w+\s*[=:({;]/,
  /\bfunction\s+\w+\s*\(/,
  /\bclass\s+\w+[\s{(]/,
  // Import / export statements
  /\bimport\s+.+\s+from\s+['"`]/,
  /\bimport\s*{/,
  /\bexport\s+(default\s+)?(function|class|const|let|var)\b/,
  /\brequire\s*\(/,
  // Return / throw with a value
  /\breturn\s+.+[;)]/,
  /\bthrow\s+new\s+\w+/,
  // Assignments  e.g.  foo = bar(  or  foo.bar = "x"
  /\w[\w.[\]]*\s*=[^=>]\s*.+/,
  // Function calls with arguments e.g. foo(bar) or foo.bar(baz)
  /\w[\w.]*\s*\(.+\)\s*[;{,)]/,
  // Arrow functions
  /\(.*\)\s*=>/,
  /\w+\s*=>\s*[{(]/,
  // Control flow with parens — if (...) not "if this happens"
  /\b(if|while|for)\s*\(.+\)/,
  // JSX / HTML tags that look like code  <Component  or </div>
  /^\s*<[A-Z]\w+[\s/>]/,
  /^\s*<\/\w+>/,
  // Closing braces alone — } or }); or });
  /^\s*[}\]]{1,3}\s*[;,)]*\s*$/,
  // Trailing semicolons on non-trivial lines
  /\w.{4,};\s*$/,
  // Python-specific
  /\bdef\s+\w+\s*\(/,
  /\bself\.\w+\s*[=(]/,
  /\bprint\s*\(.+\)/,
  /^\s*@\w+(\(.*\))?\s*$/,   // Python decorators
];

// These patterns mean it's DEFINITELY prose — skip immediately
const PROSE_SIGNALS = [
  /^(TODO|FIXME|HACK|NOTE|XXX|BUG|OPTIMIZE|REVIEW|WARN|WARNING|NB)\b/i,
  /^https?:\/\//,
  /^[-=*#]+\s/,              // markdown-style or section dividers
  /^@(param|returns?|type|throws?|deprecated|see|example|author)\b/i,
  // Sentences — start with capital letter followed by lowercase words (prose)
  /^[A-Z][a-z]+ [a-z]/,
  // Ends with a period — prose sentence
  /\.\s*$/,
  // Common explanatory starters
  /^(This|The|A |An |We |It |Used|Use|Handles?|Helper|Check|Load|Set|Get|Add|Remove|Create|Update|Delete|Init|Initialize|Format|Convert|Parse|Build|Render|Show|Hide|Listen|Watch|Fetch|Send|Save|Clear|Reset|Toggle|Dispatch|Extract|Calculate|Find|Sort|Filter|Map|Wrap|Only|Also|Note|See|For|When|If this|Cleanup)\b/i,
  // CSS section labels like /* Large Desktop */ or /* Active card */
  /^[A-Z][^{};]+$/,
];

// Require at least this many CODE_SIGNALS to match for multi-line blocks
const MULTI_LINE_THRESHOLD = 2;

function looksLikeCode(text) {
  const t = text.trim();
  if (!t || t.length < 5) return false;

  // Immediately reject prose
  for (const p of PROSE_SIGNALS) if (p.test(t)) return false;

  // Check code signals — need at least one strong match
  let score = 0;
  for (const p of CODE_SIGNALS) if (p.test(t)) score++;
  return score >= 1;
}

function looksLikeCodeBlock(lines) {
  // For multi-line blocks, require stronger evidence
  const combined = lines.map(l => l.trim()).join(" ");
  if (!combined || combined.length < 10) return false;

  for (const p of PROSE_SIGNALS) if (p.test(combined.trim())) return false;

  let score = 0;
  for (const p of CODE_SIGNALS) if (p.test(combined)) score++;
  // Also check individual lines
  for (const line of lines) {
    for (const p of CODE_SIGNALS) if (p.test(line.trim())) score++;
  }
  return score >= MULTI_LINE_THRESHOLD;
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
      if (trimmed.startsWith("///")) { i++; continue; } // skip triple-slash doc comments

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
      // Skip JSDoc /** ... */
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
    extensions: new Set(Object.keys(LANGUAGES)),
    extraIgnore: [],
    noPreview: false,
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
    } else if (!a.startsWith("-")) {
      opts.targetPath = a;
    }
  }

  return opts;
}

function printHelp() {
  console.log(`
${paint(c.cyan + c.bold, "comment-cleaner")} — Find commented-out code in your codebase

${paint(c.bold, "Usage:")}
  node index.js [path] [options]

${paint(c.bold, "Arguments:")}
  path                    Directory or file to scan  (default: current dir)

${paint(c.bold, "Options:")}
  -h, --help              Show this help
  -r, --report [file]     Save findings as a Markdown report
                          Default filename: comment-cleaner-YYYY-MM-DD.md
  -e, --ext .js,.ts,.py   Only scan these extensions (comma-separated)
  --ignore dir1,dir2      Extra directories to skip (added to defaults)
  --no-preview            Skip console output — useful when only generating a report

${paint(c.bold, "Default extensions scanned:")}
  .js  .jsx  .ts  .tsx  .mjs  .cjs  .py  .css  .scss  .sass  .less

${paint(c.bold, "Always-ignored directories:")}
  node_modules  .git  dist  build  .next  __pycache__
  .venv  venv  coverage  .nyc_output  .cache  vendor

${paint(c.bold, "Examples:")}
  node index.js                          Scan current directory
  node index.js ./src                    Scan ./src
  node index.js ./src -r                 Scan and save report
  node index.js ./src -r cleanup.md      Scan and save report to custom file
  node index.js . -e .js,.ts            Only JS and TS files
  node index.js . --ignore tmp,fixtures  Skip extra directories
  node index.js . --no-preview -r        Report only, no terminal output
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  const opts = parseArgs(process.argv);

  if (opts.help) { printHelp(); process.exit(0); }

  console.log(paint(c.cyan + c.bold, `
╔══════════════════════════════════════╗
║      🧹  comment-cleaner  🧹         ║
║   Scan your codebase · Get a report  ║
╚══════════════════════════════════════╝`));

  const targetPath = path.resolve(opts.targetPath);

  if (!fs.existsSync(targetPath)) {
    console.error(paint(c.red, `\n❌  Path not found: ${targetPath}\n`));
    process.exit(1);
  }

  const isFile = fs.statSync(targetPath).isFile();

  console.log(paint(c.blue, `\n🔍 Scanning: ${paint(c.bold + c.blue, targetPath)}`));
  console.log(paint(c.dim, `   Extensions : ${[...opts.extensions].join("  ")}`));
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

  // Console output
  if (!opts.noPreview) {
    printPreview(findings, meta);
  }

  // Report
  if (opts.report) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const reportPath = opts.reportPath || `comment-cleaner-${timestamp}.md`;
    fs.writeFileSync(reportPath, renderReport(findings, meta), "utf8");
    console.log(paint(c.green + c.bold, `📊 Report saved → ${reportPath}\n`));
  } else {
    console.log(paint(c.dim, "  💡 Add -r to save a Markdown report of these findings.\n"));
  }
}

main();