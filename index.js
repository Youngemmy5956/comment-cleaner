#!/usr/bin/env node

/**
 * comment-cleaner
 * Scan · Fix · Watch · Report your codebase for commented-out code.
 */

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const os = require("os");

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", white: "\x1b[37m",
  magenta: "\x1b[35m", orange: "\x1b[38;5;208m",
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
  ".go": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Go" },
  ".java": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Java" },
  ".kt": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Kotlin" },
  ".kts": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Kotlin Script" },
  ".rs": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "///", name: "Rust" },
  ".rb": { single: "#", mlStart: "=begin", mlEnd: "=end", doc: null, name: "Ruby" },
  ".php": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "PHP" },
  ".c": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "C" },
  ".cpp": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "C++" },
  ".h": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "C Header" },
  ".swift": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Swift" },
};

// ─── Default ignore paths ─────────────────────────────────────────────────────
const DEFAULT_IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", ".nuxt",
  "__pycache__", ".venv", "venv", "env",
  "coverage", ".nyc_output", ".cache", "vendor",
  "target", "bin", "obj", "pkg", "Pods",
]);

// ─── Severity thresholds ──────────────────────────────────────────────────────
const SEVERITY = {
  HIGH: { minLines: 10, label: "🔴 HIGH", color: "\x1b[31m" },
  MEDIUM: { minLines: 4, label: "🟡 MEDIUM", color: "\x1b[33m" },
  LOW: { minLines: 1, label: "🟢 LOW", color: "\x1b[32m" },
};

function getSeverity(block) {
  const lineCount = block.endLine - block.startLine + 1;
  if (lineCount >= SEVERITY.HIGH.minLines) return SEVERITY.HIGH;
  if (lineCount >= SEVERITY.MEDIUM.minLines) return SEVERITY.MEDIUM;
  return SEVERITY.LOW;
}

// ─── Stats store (~/.comment-cleaner-stats.json) ──────────────────────────────
const STATS_FILE = path.join(os.homedir(), ".comment-cleaner-stats.json");

function loadStats() {
  try {
    if (fs.existsSync(STATS_FILE)) return JSON.parse(fs.readFileSync(STATS_FILE, "utf8"));
  } catch { }
  return { runs: [] };
}

function saveStats(stats) {
  try { fs.writeFileSync(STATS_FILE, JSON.stringify(stats, null, 2), "utf8"); } catch { }
}

function recordRun(meta, findings) {
  const stats = loadStats();
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );
  stats.runs.push({
    date: new Date().toISOString(),
    path: meta.targetPath,
    filesScanned: meta.totalFiles,
    filesWithIssues: Object.keys(findings).length,
    commentedBlocks: totalBlocks,
    linesAffected: totalLines,
  });
  // Keep last 50 runs
  if (stats.runs.length > 50) stats.runs = stats.runs.slice(-50);
  saveStats(stats);
}

function printStats() {
  const stats = loadStats();
  if (!stats.runs.length) {
    console.log(paint(c.yellow, "\n  No scan history yet. Run comment-cleaner on a project first.\n"));
    return;
  }

  console.log(paint(c.cyan + c.bold, "\n📈 comment-cleaner — Scan History\n"));

  // Last 10 runs
  const recent = stats.runs.slice(-10).reverse();
  console.log(paint(c.bold, "  Last 10 scans:\n"));
  console.log(paint(c.dim, "  Date                  Path                          Blocks  Lines"));
  console.log(paint(c.dim, "  " + "─".repeat(70)));

  for (const run of recent) {
    const date = new Date(run.date).toLocaleString();
    const p = run.path.slice(0, 28).padEnd(28);
    const blocks = String(run.commentedBlocks).padStart(6);
    const lines = String(run.linesAffected).padStart(6);
    const col = run.commentedBlocks === 0 ? c.green : run.commentedBlocks > 10 ? c.red : c.yellow;
    console.log(`  ${paint(c.dim, date.slice(0, 20).padEnd(22))} ${paint(c.white, p)} ${paint(col, blocks)} ${paint(c.dim, lines)}`);
  }

  // Trend
  if (stats.runs.length >= 2) {
    const first = stats.runs[0];
    const last = stats.runs[stats.runs.length - 1];
    const diff = last.commentedBlocks - first.commentedBlocks;
    console.log();
    if (diff < 0) {
      console.log(paint(c.green + c.bold, `  📉 Trend: DOWN ${Math.abs(diff)} blocks since first scan — great progress! 🎉`));
    } else if (diff > 0) {
      console.log(paint(c.red + c.bold, `  📈 Trend: UP ${diff} blocks since first scan — time to clean up!`));
    } else {
      console.log(paint(c.cyan, `  ➡️  Trend: No change since first scan.`));
    }
  }

  // All-time totals
  const totalFixed = stats.runs.reduce((s, r) => s + r.commentedBlocks, 0);
  console.log(paint(c.dim, `\n  Total scans recorded: ${stats.runs.length}`));
  console.log(paint(c.dim, `  Stats file: ${STATS_FILE}\n`));
}

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
  /\bfunc\s+\w+\s*\(/,
  /\bfmt\.\w+\s*\(/,
  /\bvar\s+\w+\s+\w+/,
  /\b:=\s*/,
  /\b(public|private|protected|static|final)\s+\w+/,
  /\bSystem\.out\./,
  /\bvoid\s+\w+\s*\(/,
  /\bnew\s+\w+\s*\(/,
  /\bfn\s+\w+\s*\(/,
  /\blet\s+mut\s+\w+/,
  /\bprintln!\s*\(/,
  /\buse\s+\w+::/,
  /\bdef\s+\w+/,
  /\bend\s*$/,
  /\bputs\s+/,
  /\b(attr_accessor|attr_reader|attr_writer)\s+/,
  /\$\w+\s*=/,
  /\becho\s+/,
  /\bfunction\s+\w+\s*\(\s*\$\w*/,
  /\b(int|void|char|float|double|bool|auto)\s+\w+\s*[=(;{]/,
  /\bstd::\w+/,
  /\b#include\s*[<"]/,
  /\bprintf\s*\(/,
  /\b(func|var|let|struct|enum|protocol)\s+\w+/,
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

function hasKeepAnnotation(lines) {
  return lines.some(l => /@keep\b/i.test(l.raw || l));
}

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

// ─── Config file loader ───────────────────────────────────────────────────────
function loadConfig(startDir) {
  const configNames = [".commentcleanerrc", ".commentcleanerrc.json", "commentcleaner.config.json"];
  let dir = startDir;
  for (let i = 0; i < 6; i++) {
    for (const name of configNames) {
      const configPath = path.join(dir, name);
      if (fs.existsSync(configPath)) {
        try {
          const raw = fs.readFileSync(configPath, "utf8");
          const config = JSON.parse(raw);
          console.log(paint(c.dim, `  ⚙️  Config: ${path.relative(process.cwd(), configPath)}\n`));
          return config;
        } catch {
          console.warn(paint(c.yellow, `  ⚠️  Could not parse config: ${configPath}`));
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
  if (config.extensions && opts.extensions === null) {
    opts.extensions = new Set(
      config.extensions.map(e => e.startsWith(".") ? e.toLowerCase() : "." + e.toLowerCase())
    );
  }
  if (config.ignore && opts.extraIgnore.length === 0) opts.extraIgnore = config.ignore;
  if (config.report !== undefined && !opts.report) opts.report = config.report;
  if (config.reportPath && !opts.reportPath) opts.reportPath = config.reportPath;
  if (config.fix !== undefined && !opts.fix) opts.fix = config.fix;
  if (config.threshold !== undefined && opts.threshold === null) opts.threshold = config.threshold;
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

    if (lang.single && trimmed.startsWith(lang.single)) {
      if (trimmed.startsWith("///")) { i++; continue; }
      const text = trimmed.slice(lang.single.length).trim();
      if (/@keep\b/i.test(text)) { i++; continue; }
      if (looksLikeCode(text)) {
        const group = [{ lineNum: i + 1, raw: line }];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j].trim();
          if (next.startsWith(lang.single) && !next.startsWith("///")) {
            const nextText = next.slice(lang.single.length).trim();
            if (/@keep\b/i.test(nextText)) { j++; break; }
            if (looksLikeCode(nextText)) { group.push({ lineNum: j + 1, raw: lines[j] }); j++; continue; }
          }
          break;
        }
        if (!hasKeepAnnotation(group)) {
          blocks.push({ startLine: i + 1, endLine: group[group.length - 1].lineNum, lines: group });
        }
        i = j;
        continue;
      }
    }

    if (lang.mlStart && trimmed.startsWith(lang.mlStart)) {
      if (lang.doc && trimmed.startsWith(lang.doc) && lang.doc !== lang.mlStart) { i++; continue; }
      const group = [{ lineNum: i + 1, raw: line }];
      let closed = trimmed.includes(lang.mlEnd) && trimmed.length > lang.mlStart.length;
      let j = i + 1;
      while (!closed && j < lines.length) {
        group.push({ lineNum: j + 1, raw: lines[j] });
        if (lines[j].includes(lang.mlEnd)) closed = true;
        j++;
      }
      if (hasKeepAnnotation(group)) { i = j; continue; }
      const innerLines = group.map(l => l.raw.replace(/^[\s/*#"=]+/, "").replace(/[\s/*"=]+$/, ""));
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

// ─── Fix: remove commented blocks ────────────────────────────────────────────
function fixFile(filePath, blocks) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  const linesToRemove = new Set();
  for (const block of blocks) {
    for (let i = block.startLine - 1; i < block.endLine; i++) linesToRemove.add(i);
  }
  fs.writeFileSync(filePath, lines.filter((_, idx) => !linesToRemove.has(idx)).join("\n"), "utf8");
}

// ─── Interactive mode ─────────────────────────────────────────────────────────
async function runInteractive(findings) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(res => rl.question(q, res));

  console.log(paint(c.magenta + c.bold, "\n🎛️  Interactive mode — review each block one by one\n"));
  console.log(paint(c.dim, "  Commands: [d] delete  [k] keep  [s] skip file  [q] quit\n"));

  const toRemove = {}; // filePath -> Set of line indices to remove

  for (const [relPath, blocks] of Object.entries(findings)) {
    console.log(paint(c.yellow + c.bold, `\n📄 ${relPath}`));
    let skipFile = false;

    for (const block of blocks) {
      if (skipFile) break;

      const sev = getSeverity(block);
      const range = block.startLine === block.endLine
        ? `line ${block.startLine}`
        : `lines ${block.startLine}–${block.endLine}`;

      console.log(paint(c.dim, `\n  ┌─ ${range} ${"─".repeat(Math.max(0, 36 - range.length))} `) + paint(sev.color + c.bold, sev.label));
      for (const l of block.lines) {
        console.log(paint(c.dim, `  │ ${String(l.lineNum).padStart(4)}  `) + paint(c.red, l.raw));
      }
      console.log(paint(c.dim, `  └${"─".repeat(52)}`));

      let answer = "";
      while (!["d", "k", "s", "q"].includes(answer)) {
        answer = (await ask(paint(c.cyan, "  → [d] delete  [k] keep  [s] skip file  [q] quit: "))).trim().toLowerCase();
      }

      if (answer === "q") {
        console.log(paint(c.yellow, "\n  Quitting interactive mode.\n"));
        rl.close();
        return toRemove;
      }
      if (answer === "s") { skipFile = true; continue; }
      if (answer === "d") {
        if (!toRemove[relPath]) toRemove[relPath] = [];
        toRemove[relPath].push(block);
        console.log(paint(c.green, "  ✅ Marked for deletion"));
      } else {
        console.log(paint(c.dim, "  ⏭️  Kept"));
      }
    }
  }

  rl.close();
  return toRemove;
}

// ─── Directory walker ─────────────────────────────────────────────────────────
function walkDir(dirPath, allowedExts, extraIgnore) {
  const ignore = new Set([...DEFAULT_IGNORE, ...extraIgnore]);
  const files = [];
  function walk(current) {
    const parts = current.split(path.sep);
    if (parts.some(p => ignore.has(p))) return;
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (allowedExts.has(ext)) files.push(full);
      }
    }
  }
  walk(dirPath);
  return files;
}

// ─── Console preview ──────────────────────────────────────────────────────────
function printPreview(findings, meta, opts = {}) {
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );

  if (fileCount === 0) {
    console.log(paint(c.green + c.bold, "\n✅  No commented-out code found. Codebase is clean!\n"));
    return;
  }

  let highCount = 0, medCount = 0, lowCount = 0;

  for (const [filePath, blocks] of Object.entries(findings)) {
    console.log(
      paint(c.yellow + c.bold, `\n📄 ${filePath}`) +
      paint(c.dim, `  (${blocks.length} block${blocks.length > 1 ? "s" : ""})`)
    );
    for (const block of blocks) {
      const sev = getSeverity(block);
      if (sev === SEVERITY.HIGH) highCount++;
      else if (sev === SEVERITY.MEDIUM) medCount++;
      else lowCount++;

      const range = block.startLine === block.endLine
        ? `line ${block.startLine}`
        : `lines ${block.startLine}–${block.endLine}`;

      console.log(
        paint(c.dim, `  ┌─ ${range} ${"─".repeat(Math.max(0, 36 - range.length))} `) +
        paint(sev.color + c.bold, sev.label)
      );
      for (const l of block.lines) {
        console.log(paint(c.dim, `  │ ${String(l.lineNum).padStart(4)}  `) + paint(c.red, l.raw));
      }
      console.log(paint(c.dim, `  └${"─".repeat(52)}`));
    }
  }

  console.log(paint(c.cyan + c.bold, "\n═══════════════════ Summary ═══════════════════"));
  console.log(`  ${paint(c.white, "Files scanned:         ")} ${meta.totalFiles}`);
  console.log(`  ${paint(c.yellow, "Files with issues:     ")} ${fileCount}`);
  console.log(`  ${paint(c.red, "Commented blocks:      ")} ${totalBlocks}`);
  console.log(`  ${paint(c.dim, "Lines affected:        ")} ${totalLines}`);
  console.log(`  ${paint(c.bold, "Severity breakdown:    ")} ${paint(c.red, `🔴 ${highCount} high`)}  ${paint(c.yellow, `🟡 ${medCount} medium`)}  ${paint(c.green, `🟢 ${lowCount} low`)}`);
  if (opts.dryRun) console.log(paint(c.cyan + c.bold, `\n  🧪 Dry run — no files were changed.\n`));
  console.log();
}

// ─── JSON output ──────────────────────────────────────────────────────────────
function renderJson(findings, meta) {
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );
  const output = {
    generatedAt: new Date().toISOString(),
    scannedPath: meta.targetPath,
    extensions: [...meta.extensions],
    summary: { filesScanned: meta.totalFiles, filesWithIssues: fileCount, commentedBlocks: totalBlocks, linesAffected: totalLines },
    files: {},
  };
  for (const [filePath, blocks] of Object.entries(findings)) {
    output.files[filePath] = blocks.map(block => ({
      startLine: block.startLine, endLine: block.endLine,
      lineCount: block.endLine - block.startLine + 1,
      severity: getSeverity(block).label.replace(/[🔴🟡🟢] /, "").toLowerCase(),
      code: block.lines.map(l => l.raw).join("\n"),
    }));
  }
  return JSON.stringify(output, null, 2);
}

// ─── Markdown report ──────────────────────────────────────────────────────────
function renderReport(findings, meta) {
  const now = new Date().toISOString();
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );
  let highCount = 0, medCount = 0, lowCount = 0;
  for (const blocks of Object.values(findings)) {
    for (const block of blocks) {
      const sev = getSeverity(block);
      if (sev === SEVERITY.HIGH) highCount++;
      else if (sev === SEVERITY.MEDIUM) medCount++;
      else lowCount++;
    }
  }
  const lines = [
    "# 🧹 Comment Cleaner Report", "",
    `> **Generated:** ${now}  `,
    `> **Scanned path:** \`${meta.targetPath}\`  `,
    `> **Extensions:** ${[...meta.extensions].join(", ")}`,
    "", "---", "", "## Summary", "",
    "| Metric | Value |", "|--------|-------|",
    `| Files scanned | ${meta.totalFiles} |`,
    `| Files with commented code | ${fileCount} |`,
    `| Commented-out blocks | ${totalBlocks} |`,
    `| Lines of commented code | ${totalLines} |`,
    `| 🔴 High severity (10+ lines) | ${highCount} |`,
    `| 🟡 Medium severity (4–9 lines) | ${medCount} |`,
    `| 🟢 Low severity (1–3 lines) | ${lowCount} |`,
    "", "---", "", "## Findings", "",
  ];
  if (fileCount === 0) {
    lines.push("✅ No commented-out code detected. Your codebase is clean!");
  } else {
    for (const [filePath, blocks] of Object.entries(findings)) {
      lines.push(`### \`${filePath}\``);
      lines.push("");
      for (const block of blocks) {
        const range = block.startLine === block.endLine ? `Line ${block.startLine}` : `Lines ${block.startLine}–${block.endLine}`;
        const sev = getSeverity(block);
        lines.push(`**${range}** — ${block.lines.length} line(s) — ${sev.label}`);
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

// ─── HTML report ──────────────────────────────────────────────────────────────
function renderHtml(findings, meta) {
  const now = new Date().toLocaleString();
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );
  let highCount = 0, medCount = 0, lowCount = 0;
  for (const blocks of Object.values(findings)) {
    for (const block of blocks) {
      const sev = getSeverity(block);
      if (sev === SEVERITY.HIGH) highCount++;
      else if (sev === SEVERITY.MEDIUM) medCount++;
      else lowCount++;
    }
  }
  const escape = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  let filesSections = "";
  for (const [filePath, blocks] of Object.entries(findings)) {
    let blockHtml = "";
    for (const block of blocks) {
      const sev = getSeverity(block);
      const sevClass = sev === SEVERITY.HIGH ? "high" : sev === SEVERITY.MEDIUM ? "medium" : "low";
      const range = block.startLine === block.endLine ? `Line ${block.startLine}` : `Lines ${block.startLine}–${block.endLine}`;
      const code = block.lines.map(l => escape(l.raw)).join("\n");
      blockHtml += `
        <div class="block ${sevClass}">
          <div class="block-header">
            <span class="range">${range}</span>
            <span class="severity-badge ${sevClass}">${sev.label}</span>
            <span class="line-count">${block.lines.length} line(s)</span>
          </div>
          <pre><code>${code}</code></pre>
        </div>`;
    }
    filesSections += `
      <div class="file-card">
        <div class="file-header">
          <span class="file-icon">📄</span>
          <span class="file-path">${escape(filePath)}</span>
          <span class="block-count">${blocks.length} block${blocks.length > 1 ? "s" : ""}</span>
        </div>
        <div class="blocks">${blockHtml}</div>
      </div>`;
  }
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>🧹 Comment Cleaner Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f0f0f; color: #e0e0e0; min-height: 100vh; }
    header { background: linear-gradient(135deg, #1a1a2e, #16213e); padding: 2rem; border-bottom: 1px solid #333; }
    header h1 { font-size: 2rem; font-weight: 700; color: #fff; }
    header p { color: #888; margin-top: 0.4rem; font-size: 0.9rem; }
    .container { max-width: 1100px; margin: 0 auto; padding: 2rem; }
    .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
    .stat-card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 10px; padding: 1.2rem; text-align: center; }
    .stat-card .value { font-size: 2rem; font-weight: 700; color: #fff; }
    .stat-card .label { font-size: 0.8rem; color: #666; margin-top: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em; }
    .severity-row { display: flex; gap: 1rem; margin-bottom: 2rem; flex-wrap: wrap; }
    .sev-pill { padding: 0.5rem 1.2rem; border-radius: 20px; font-weight: 600; font-size: 0.9rem; }
    .sev-pill.high   { background: #3d1515; color: #ff6b6b; border: 1px solid #ff6b6b44; }
    .sev-pill.medium { background: #3d2e00; color: #ffd93d; border: 1px solid #ffd93d44; }
    .sev-pill.low    { background: #0d3d1e; color: #6bcb77; border: 1px solid #6bcb7744; }
    .file-card { background: #141414; border: 1px solid #2a2a2a; border-radius: 12px; margin-bottom: 1.5rem; overflow: hidden; }
    .file-header { display: flex; align-items: center; gap: 0.8rem; padding: 1rem 1.2rem; background: #1c1c1c; border-bottom: 1px solid #2a2a2a; flex-wrap: wrap; }
    .file-path { font-family: 'SF Mono', 'Fira Code', monospace; font-size: 0.9rem; color: #a0cfff; flex: 1; }
    .block-count { background: #2a2a2a; color: #888; font-size: 0.75rem; padding: 0.2rem 0.6rem; border-radius: 10px; }
    .block { margin: 1rem; border-radius: 8px; overflow: hidden; border: 1px solid #2a2a2a; }
    .block.high   { border-left: 4px solid #ff6b6b; }
    .block.medium { border-left: 4px solid #ffd93d; }
    .block.low    { border-left: 4px solid #6bcb77; }
    .block-header { display: flex; align-items: center; gap: 0.8rem; padding: 0.6rem 1rem; background: #1a1a1a; font-size: 0.82rem; flex-wrap: wrap; }
    .range { color: #888; font-family: monospace; }
    .line-count { color: #555; font-size: 0.75rem; }
    .severity-badge { font-size: 0.75rem; font-weight: 600; padding: 0.15rem 0.5rem; border-radius: 6px; }
    .severity-badge.high   { background: #3d1515; color: #ff6b6b; }
    .severity-badge.medium { background: #3d2e00; color: #ffd93d; }
    .severity-badge.low    { background: #0d3d1e; color: #6bcb77; }
    pre { background: #0a0a0a; padding: 1rem; overflow-x: auto; }
    code { font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace; font-size: 0.82rem; color: #ff8080; line-height: 1.6; }
    .empty { text-align: center; padding: 4rem; color: #555; font-size: 1.1rem; }
    footer { text-align: center; padding: 2rem; color: #333; font-size: 0.8rem; border-top: 1px solid #1a1a1a; margin-top: 2rem; }
  </style>
</head>
<body>
  <header>
    <div class="container">
      <h1>🧹 Comment Cleaner Report</h1>
      <p>Generated: ${escape(now)} · Scanned: <code>${escape(meta.targetPath)}</code></p>
    </div>
  </header>
  <div class="container">
    <div class="stats">
      <div class="stat-card"><div class="value">${meta.totalFiles}</div><div class="label">Files Scanned</div></div>
      <div class="stat-card"><div class="value">${fileCount}</div><div class="label">Files with Issues</div></div>
      <div class="stat-card"><div class="value">${totalBlocks}</div><div class="label">Dead Blocks</div></div>
      <div class="stat-card"><div class="value">${totalLines}</div><div class="label">Lines Affected</div></div>
    </div>
    <div class="severity-row">
      <div class="sev-pill high">🔴 ${highCount} High (10+ lines)</div>
      <div class="sev-pill medium">🟡 ${medCount} Medium (4–9 lines)</div>
      <div class="sev-pill low">🟢 ${lowCount} Low (1–3 lines)</div>
    </div>
    ${fileCount === 0
      ? `<div class="empty">✅ No commented-out code detected. Your codebase is clean!</div>`
      : filesSections
    }
  </div>
  <footer>Generated by <strong>comment-cleaner</strong> · <a href="https://npmjs.com/package/@youngemmy/comment-cleaner" style="color:#555">npmjs.com/package/@youngemmy/comment-cleaner</a></footer>
</body>
</html>`;
}

// ─── Watch mode ───────────────────────────────────────────────────────────────
function runWatch(targetPath, opts) {
  console.log(paint(c.magenta + c.bold, `\n👀 Watch mode active — monitoring for changes...`));
  console.log(paint(c.dim, `   Press Ctrl+C to stop.\n`));
  const debounceMap = {};
  function scanFile(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const lang = LANGUAGES[ext];
    if (!lang) return;
    let blocks;
    try { blocks = parseFile(filePath, lang); } catch { return; }
    const relPath = path.relative(process.cwd(), filePath);
    if (blocks.length > 0) {
      const timestamp = new Date().toLocaleTimeString();
      console.log(paint(c.yellow + c.bold, `\n⚠️  [${timestamp}] Commented-out code in: ${relPath}`));
      for (const block of blocks) {
        const sev = getSeverity(block);
        const range = block.startLine === block.endLine ? `line ${block.startLine}` : `lines ${block.startLine}–${block.endLine}`;
        console.log(paint(sev.color + c.bold, `   ${sev.label} `) + paint(c.dim, `${range}:`));
        for (const l of block.lines) console.log(paint(c.red, `     ${l.raw.trim()}`));
      }
      console.log(paint(c.dim, `\n   Run: comment-cleaner ${relPath} --fix  to remove\n`));
    }
  }
  function watchDir(dirPath) {
    const ignore = new Set([...DEFAULT_IGNORE, ...opts.extraIgnore]);
    fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;
      const fullPath = path.join(dirPath, filename);
      if (fullPath.split(path.sep).some(p => ignore.has(p))) return;
      const ext = path.extname(filename).toLowerCase();
      if (!opts.extensions.has(ext)) return;
      clearTimeout(debounceMap[fullPath]);
      debounceMap[fullPath] = setTimeout(() => { if (fs.existsSync(fullPath)) scanFile(fullPath); }, 300);
    });
  }
  const files = fs.statSync(targetPath).isFile() ? [targetPath] : walkDir(targetPath, opts.extensions, opts.extraIgnore);
  const findings = {};
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const lang = LANGUAGES[ext];
    if (!lang) continue;
    try { const blocks = parseFile(filePath, lang); if (blocks.length > 0) findings[path.relative(process.cwd(), filePath)] = blocks; } catch { continue; }
  }
  if (Object.keys(findings).length > 0) { console.log(paint(c.yellow, `Found existing issues on startup:\n`)); printPreview(findings, { totalFiles: files.length, extensions: opts.extensions, targetPath }); }
  else { console.log(paint(c.green, `✅  No issues found on startup. Watching for new changes...\n`)); }
  if (fs.statSync(targetPath).isFile()) { fs.watch(targetPath, () => { clearTimeout(debounceMap[targetPath]); debounceMap[targetPath] = setTimeout(() => scanFile(targetPath), 300); }); }
  else { watchDir(targetPath); }
}

// ─── Arg parser ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    targetPath: ".", report: false, reportPath: null, extensions: null,
    extraIgnore: [], noPreview: false, fix: false, dryRun: false,
    watch: false, json: false, jsonPath: null, html: false, htmlPath: null,
    interactive: false, stats: false, threshold: null, outputDir: null, help: false,
  };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") { opts.help = true; }
    else if (a === "-r" || a === "--report") { opts.report = true; if (args[i + 1] && !args[i + 1].startsWith("-")) opts.reportPath = args[++i]; }
    else if (a === "-f" || a === "--fix") { opts.fix = true; }
    else if (a === "--dry-run") { opts.dryRun = true; }
    else if (a === "-w" || a === "--watch") { opts.watch = true; }
    else if (a === "-i" || a === "--interactive") { opts.interactive = true; }
    else if (a === "--stats") { opts.stats = true; }
    else if (a === "--threshold") { opts.threshold = parseInt(args[++i], 10) || 0; }
    else if (a === "--output-dir") { opts.outputDir = args[++i]; }
    else if (a === "--json") { opts.json = true; if (args[i + 1] && !args[i + 1].startsWith("-")) opts.jsonPath = args[++i]; }
    else if (a === "--html") { opts.html = true; if (args[i + 1] && !args[i + 1].startsWith("-")) opts.htmlPath = args[++i]; }
    else if (a === "-e" || a === "--ext") { const raw = args[++i] || ""; opts.extensions = new Set(raw.split(",").map(e => e.startsWith(".") ? e.toLowerCase() : "." + e.toLowerCase())); }
    else if (a === "--ignore") { opts.extraIgnore = (args[++i] || "").split(",").map(s => s.trim()); }
    else if (a === "--no-preview") { opts.noPreview = true; }
    else if (!a.startsWith("-")) { opts.targetPath = a; }
  }
  return opts;
}

function printHelp() {
  console.log(`
${paint(c.cyan + c.bold, "comment-cleaner")} — Find, fix, and watch for commented-out code

${paint(c.bold, "Usage:")}
  comment-cleaner [path] [options]

${paint(c.bold, "Options:")}
  -h, --help                Show this help
  -r, --report [file]       Save findings as a Markdown report
  -f, --fix                 Auto-remove all commented-out code
  -i, --interactive         Step through each block and choose what to delete
      --dry-run             Preview what --fix would remove (no changes made)
  -w, --watch               Watch mode — real time alerts as you code
      --stats               Show scan history and trend over time
      --threshold <n>       Exit with error if commented blocks exceed n (for CI)
      --output-dir <dir>    Save all reports (HTML, JSON, MD) to a folder
      --json [file]         Output results as JSON (stdout or file)
      --html [file]         Generate a beautiful HTML report
  -e, --ext .js,.ts         Only scan specific extensions
      --ignore dir1,dir2    Extra directories to skip
      --no-preview          Suppress terminal output

${paint(c.bold, "@keep annotation:")}
  Add @keep to any comment to permanently exclude it from detection:
  ${paint(c.dim, "// @keep const OLD_API = 'https://legacy.api.com';")}

${paint(c.bold, "Severity levels:")}
  🔴 HIGH    — 10+ lines of commented-out code
  🟡 MEDIUM  — 4–9 lines
  🟢 LOW     — 1–3 lines

${paint(c.bold, "Supported languages:")}
  JS/TS/JSX/TSX · Python · CSS/SCSS/Sass/Less
  Go · Java · Kotlin · Rust · Ruby · PHP · C/C++ · Swift

${paint(c.bold, "Examples:")}
  comment-cleaner ./src                    Preview with severity
  comment-cleaner ./src --dry-run          Show what --fix would remove
  comment-cleaner ./src --fix              Remove all dead comments
  comment-cleaner ./src -i                 Interactive — pick block by block
  comment-cleaner ./src --stats            Show scan history & trend
  comment-cleaner ./src --threshold 5      Fail CI if more than 5 blocks
  comment-cleaner ./src --output-dir ./reports  Save all reports to folder
  comment-cleaner ./src --watch            Watch for new commented code
  comment-cleaner ./src --html             Generate HTML report
  comment-cleaner ./src -r                 Save Markdown report
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  let opts = parseArgs(process.argv);
  if (opts.help) { printHelp(); process.exit(0); }

  console.log(paint(c.cyan + c.bold, `
╔══════════════════════════════════════╗
║      🧹  comment-cleaner  🧹         ║
║  Scan · Fix · Watch · Report         ║
╚══════════════════════════════════════╝`));

  // --stats: show history and exit
  if (opts.stats) { printStats(); process.exit(0); }

  const targetPath = path.resolve(opts.targetPath);
  if (!fs.existsSync(targetPath)) { console.error(paint(c.red, `\n❌  Path not found: ${targetPath}\n`)); process.exit(1); }

  const config = loadConfig(path.dirname(targetPath));
  opts = applyConfig(opts, config);
  if (!opts.extensions) opts.extensions = new Set(Object.keys(LANGUAGES));

  console.log(paint(c.blue, `\n🔍 Scanning: ${paint(c.bold + c.blue, targetPath)}`));
  console.log(paint(c.dim, `   Extensions : ${[...opts.extensions].join("  ")}`));
  if (opts.fix) console.log(paint(c.yellow, `   Mode       : --fix`));
  if (opts.dryRun) console.log(paint(c.cyan, `   Mode       : --dry-run`));
  if (opts.interactive) console.log(paint(c.magenta, `   Mode       : --interactive`));
  if (opts.watch) console.log(paint(c.magenta, `   Mode       : --watch`));
  if (opts.threshold !== null) console.log(paint(c.yellow, `   Threshold  : fail if > ${opts.threshold} blocks`));
  if (opts.outputDir) console.log(paint(c.cyan, `   Output dir : ${opts.outputDir}`));
  if (opts.extraIgnore.length) console.log(paint(c.dim, `   Extra ignore: ${opts.extraIgnore.join(", ")}`));
  console.log();

  if (opts.watch) { runWatch(targetPath, opts); return; }

  const isFile = fs.statSync(targetPath).isFile();
  const files = isFile ? [targetPath] : walkDir(targetPath, opts.extensions, opts.extraIgnore);
  console.log(paint(c.dim, `  Found ${files.length} file(s) to analyse...\n`));

  const findings = {};
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const lang = LANGUAGES[ext];
    if (!lang) continue;
    let blocks;
    try { blocks = parseFile(filePath, lang); }
    catch (err) { console.warn(paint(c.dim, `  ⚠️  Could not read ${filePath}: ${err.message}`)); continue; }
    if (blocks.length > 0) findings[path.relative(process.cwd(), filePath)] = blocks;
  }

  const meta = { targetPath: path.relative(process.cwd(), targetPath) || ".", totalFiles: files.length, extensions: opts.extensions };
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);

  // Record this run in stats history
  recordRun(meta, findings);

  if (!opts.noPreview && !opts.json) printPreview(findings, meta, opts);

  // JSON
  if (opts.json) {
    const jsonStr = renderJson(findings, meta);
    const outPath = opts.outputDir ? path.join(opts.outputDir, "comment-cleaner.json") : opts.jsonPath;
    if (outPath) { fs.mkdirSync(path.dirname(outPath), { recursive: true }); fs.writeFileSync(outPath, jsonStr, "utf8"); console.log(paint(c.green + c.bold, `📦 JSON saved → ${outPath}\n`)); }
    else { console.log(jsonStr); }
  }

  // HTML
  if (opts.html) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const htmlPath = opts.outputDir ? path.join(opts.outputDir, "comment-cleaner.html") : (opts.htmlPath || `comment-cleaner-${timestamp}.html`);
    fs.mkdirSync(path.dirname(htmlPath), { recursive: true });
    fs.writeFileSync(htmlPath, renderHtml(findings, meta), "utf8");
    console.log(paint(c.green + c.bold, `🌐 HTML report saved → ${htmlPath}\n`));
  }

  // Markdown report
  if (opts.report) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const reportPath = opts.outputDir ? path.join(opts.outputDir, "comment-cleaner.md") : (opts.reportPath || `comment-cleaner-${timestamp}.md`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, renderReport(findings, meta), "utf8");
    console.log(paint(c.green + c.bold, `📊 Report saved → ${reportPath}\n`));
  }

  // --output-dir: save all three if flag used without specific flags
  if (opts.outputDir && !opts.json && !opts.html && !opts.report) {
    const timestamp = new Date().toISOString().slice(0, 10);
    fs.mkdirSync(opts.outputDir, { recursive: true });
    fs.writeFileSync(path.join(opts.outputDir, "comment-cleaner.json"), renderJson(findings, meta), "utf8");
    fs.writeFileSync(path.join(opts.outputDir, "comment-cleaner.html"), renderHtml(findings, meta), "utf8");
    fs.writeFileSync(path.join(opts.outputDir, `comment-cleaner.md`), renderReport(findings, meta), "utf8");
    console.log(paint(c.green + c.bold, `📁 All reports saved to: ${opts.outputDir}/\n`));
    console.log(paint(c.dim, `   comment-cleaner.html · comment-cleaner.json · comment-cleaner.md\n`));
  }

  // Interactive mode
  if (opts.interactive && !opts.dryRun) {
    const toRemove = await runInteractive(findings);
    const filesToFix = Object.keys(toRemove);
    if (filesToFix.length === 0) {
      console.log(paint(c.green, "\n✅  No blocks selected for deletion.\n"));
    } else {
      console.log(paint(c.yellow + c.bold, `\n🔧 Applying deletions to ${filesToFix.length} file(s)...\n`));
      for (const [relPath, blocks] of Object.entries(toRemove)) {
        try {
          fixFile(path.resolve(relPath), blocks);
          console.log(paint(c.green, `  ✅ ${relPath}`) + paint(c.dim, `  (${blocks.length} block${blocks.length > 1 ? "s" : ""} removed)`));
        } catch (err) {
          console.warn(paint(c.red, `  ❌ Could not fix ${relPath}: ${err.message}`));
        }
      }
      console.log(paint(c.green + c.bold, `\n🎉 Done!\n`));
    }
  }

  // Fix (non-interactive)
  if (opts.fix && !opts.dryRun && !opts.interactive) {
    const fileCount = Object.keys(findings).length;
    if (fileCount === 0) {
      console.log(paint(c.green, "✅  Nothing to fix — codebase is already clean!\n"));
    } else {
      console.log(paint(c.yellow + c.bold, `\n🔧 Fixing ${fileCount} file(s)...\n`));
      let fixedCount = 0;
      for (const [relPath, blocks] of Object.entries(findings)) {
        try {
          fixFile(path.resolve(relPath), blocks);
          console.log(paint(c.green, `  ✅ ${relPath}`) + paint(c.dim, `  (${blocks.length} block${blocks.length > 1 ? "s" : ""} removed)`));
          fixedCount++;
        } catch (err) {
          console.warn(paint(c.red, `  ❌ Could not fix ${relPath}: ${err.message}`));
        }
      }
      console.log(paint(c.green + c.bold, `\n🎉 Done! Fixed ${fixedCount} file(s).\n`));
    }
  }

  if (!opts.fix && !opts.dryRun && !opts.json && !opts.html && !opts.report && !opts.interactive && !opts.outputDir) {
    console.log(paint(c.dim, "  💡 --fix · -i · --dry-run · -r · --html · --json · --watch · --stats · --output-dir\n"));
  }

  // --threshold: fail CI if block count exceeds limit
  if (opts.threshold !== null) {
    if (totalBlocks > opts.threshold) {
      console.log(paint(c.red + c.bold, `\n❌  Threshold exceeded: ${totalBlocks} blocks found, limit is ${opts.threshold}\n`));
      process.exit(1);
    } else {
      console.log(paint(c.green + c.bold, `\n✅  Threshold passed: ${totalBlocks} blocks found, limit is ${opts.threshold}\n`));
    }
  } else if (!opts.fix && !opts.dryRun && totalBlocks > 0) {
    process.exitCode = 1;
  }
}

main();