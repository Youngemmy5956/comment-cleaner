#!/usr/bin/env node

/**
 * comment-cleaner
 * Scan · Fix · Watch · Report your codebase for commented-out code.
 */

const fs = require("fs");
const path = require("path");

// ─── ANSI Colors ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", cyan: "\x1b[36m", white: "\x1b[37m",
  magenta: "\x1b[35m",
};
const paint = (col, text) => `${col}${text}${c.reset}`;

// ─── Language Definitions ─────────────────────────────────────────────────────
const LANGUAGES = {
  // JavaScript / TypeScript
  ".js": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "JavaScript" },
  ".jsx": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "JSX" },
  ".ts": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "TypeScript" },
  ".tsx": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "TSX" },
  ".mjs": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "ESModule" },
  ".cjs": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "CJS" },
  // Python
  ".py": { single: "#", mlStart: '"""', mlEnd: '"""', doc: null, name: "Python" },
  // CSS family
  ".css": { single: null, mlStart: "/*", mlEnd: "*/", doc: "/**", name: "CSS" },
  ".scss": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "SCSS" },
  ".sass": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Sass" },
  ".less": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Less" },
  // Go
  ".go": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Go" },
  // Java / Kotlin
  ".java": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Java" },
  ".kt": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Kotlin" },
  ".kts": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Kotlin Script" },
  // Rust
  ".rs": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "///", name: "Rust" },
  // Ruby
  ".rb": { single: "#", mlStart: "=begin", mlEnd: "=end", doc: null, name: "Ruby" },
  // PHP
  ".php": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "PHP" },
  // C / C++
  ".c": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "C" },
  ".cpp": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "C++" },
  ".h": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "C Header" },
  // Swift
  ".swift": { single: "//", mlStart: "/*", mlEnd: "*/", doc: "/**", name: "Swift" },
};

// ─── Default ignore paths ─────────────────────────────────────────────────────
const DEFAULT_IGNORE = new Set([
  "node_modules", ".git", "dist", "build", ".next", "out", ".nuxt",
  "__pycache__", ".venv", "venv", "env",
  "coverage", ".nyc_output", ".cache", "vendor",
  "target", "bin", "obj", "pkg", "Pods",
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
  // Python
  /\bdef\s+\w+\s*\(/,
  /\bself\.\w+\s*[=(]/,
  /\bprint\s*\(.+\)/,
  /^\s*@\w+(\(.*\))?\s*$/,
  // Go
  /\bfunc\s+\w+\s*\(/,
  /\bfmt\.\w+\s*\(/,
  /\bvar\s+\w+\s+\w+/,
  /\b:=\s*/,
  // Java / Kotlin
  /\b(public|private|protected|static|final)\s+\w+/,
  /\bSystem\.out\./,
  /\bvoid\s+\w+\s*\(/,
  /\bnew\s+\w+\s*\(/,
  // Rust
  /\bfn\s+\w+\s*\(/,
  /\blet\s+mut\s+\w+/,
  /\bprintln!\s*\(/,
  /\buse\s+\w+::/,
  // Ruby
  /\bdef\s+\w+/,
  /\bend\s*$/,
  /\bputs\s+/,
  /\b(attr_accessor|attr_reader|attr_writer)\s+/,
  // PHP
  /\$\w+\s*=/,
  /\becho\s+/,
  /\bfunction\s+\w+\s*\(\s*\$\w*/,
  // C / C++
  /\b(int|void|char|float|double|bool|auto)\s+\w+\s*[=(;{]/,
  /\bstd::\w+/,
  /\b#include\s*[<"]/,
  /\bprintf\s*\(/,
  // Swift
  /\b(func|var|let|struct|enum|protocol)\s+\w+/,
  /\bprint\s*\(/,
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
      if (looksLikeCode(text)) {
        const group = [{ lineNum: i + 1, raw: line }];
        let j = i + 1;
        while (j < lines.length) {
          const next = lines[j].trim();
          if (next.startsWith(lang.single) && !next.startsWith("///")) {
            const nextText = next.slice(lang.single.length).trim();
            if (looksLikeCode(nextText)) { group.push({ lineNum: j + 1, raw: lines[j] }); j++; continue; }
          }
          break;
        }
        blocks.push({ startLine: i + 1, endLine: group[group.length - 1].lineNum, lines: group });
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
function printPreview(findings, meta) {
  const fileCount = Object.keys(findings).length;
  const totalBlocks = Object.values(findings).reduce((s, b) => s + b.length, 0);
  const totalLines = Object.values(findings).reduce(
    (s, blocks) => s + blocks.reduce((ss, b) => ss + (b.endLine - b.startLine + 1), 0), 0
  );

  if (fileCount === 0) {
    console.log(paint(c.green + c.bold, "\n✅  No commented-out code found. Codebase is clean!\n"));
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
    summary: {
      filesScanned: meta.totalFiles,
      filesWithIssues: fileCount,
      commentedBlocks: totalBlocks,
      linesAffected: totalLines,
    },
    files: {},
  };

  for (const [filePath, blocks] of Object.entries(findings)) {
    output.files[filePath] = blocks.map(block => ({
      startLine: block.startLine,
      endLine: block.endLine,
      lineCount: block.endLine - block.startLine + 1,
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
    "", "---", "", "## Findings", "",
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
      console.log(paint(c.yellow + c.bold, `\n⚠️  [${timestamp}] Commented-out code detected in: ${relPath}`));
      for (const block of blocks) {
        const range = block.startLine === block.endLine
          ? `line ${block.startLine}`
          : `lines ${block.startLine}–${block.endLine}`;
        console.log(paint(c.dim, `   ${range}:`));
        for (const l of block.lines) {
          console.log(paint(c.red, `     ${l.raw.trim()}`));
        }
      }
      console.log(paint(c.dim, `\n   Run: comment-cleaner ${relPath} --fix  to remove\n`));
    }
  }

  function watchDir(dirPath) {
    const ignore = new Set([...DEFAULT_IGNORE, ...opts.extraIgnore]);

    fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
      if (!filename) return;

      const fullPath = path.join(dirPath, filename);
      const parts = fullPath.split(path.sep);
      if (parts.some(p => ignore.has(p))) return;

      const ext = path.extname(filename).toLowerCase();
      if (!opts.extensions.has(ext)) return;

      // Debounce — wait 300ms before scanning to avoid double triggers
      clearTimeout(debounceMap[fullPath]);
      debounceMap[fullPath] = setTimeout(() => {
        if (fs.existsSync(fullPath)) scanFile(fullPath);
      }, 300);
    });
  }

  // Do an initial full scan on start
  const files = fs.statSync(targetPath).isFile()
    ? [targetPath]
    : walkDir(targetPath, opts.extensions, opts.extraIgnore);

  const findings = {};
  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    const lang = LANGUAGES[ext];
    if (!lang) continue;
    try {
      const blocks = parseFile(filePath, lang);
      if (blocks.length > 0) findings[path.relative(process.cwd(), filePath)] = blocks;
    } catch { continue; }
  }

  if (Object.keys(findings).length > 0) {
    console.log(paint(c.yellow, `Found existing issues on startup:\n`));
    printPreview(findings, { totalFiles: files.length, extensions: opts.extensions, targetPath });
  } else {
    console.log(paint(c.green, `✅  No issues found on startup. Watching for new changes...\n`));
  }

  // Start watching
  if (fs.statSync(targetPath).isFile()) {
    fs.watch(targetPath, () => {
      clearTimeout(debounceMap[targetPath]);
      debounceMap[targetPath] = setTimeout(() => scanFile(targetPath), 300);
    });
  } else {
    watchDir(targetPath);
  }
}

// ─── Arg parser ───────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const args = argv.slice(2);
  const opts = {
    targetPath: ".",
    report: false,
    reportPath: null,
    extensions: null,
    extraIgnore: [],
    noPreview: false,
    fix: false,
    watch: false,
    json: false,
    jsonPath: null,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "-h" || a === "--help") { opts.help = true; }
    else if (a === "-r" || a === "--report") { opts.report = true; if (args[i + 1] && !args[i + 1].startsWith("-")) opts.reportPath = args[++i]; }
    else if (a === "-f" || a === "--fix") { opts.fix = true; }
    else if (a === "-w" || a === "--watch") { opts.watch = true; }
    else if (a === "--json") { opts.json = true; if (args[i + 1] && !args[i + 1].startsWith("-")) opts.jsonPath = args[++i]; }
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
  -h, --help              Show this help
  -r, --report [file]     Save findings as a Markdown report
  -f, --fix               Auto-remove all commented-out code
  -w, --watch             Watch mode — alert on new commented-out code in real time
  --json [file]           Output results as JSON (to stdout or file)
  -e, --ext .js,.ts       Only scan specific extensions
  --ignore dir1,dir2      Extra directories to skip
  --no-preview            Suppress terminal output

${paint(c.bold, "Supported languages:")}
  JS/TS/JSX/TSX · Python · CSS/SCSS/Sass/Less
  Go · Java · Kotlin · Rust · Ruby · PHP · C/C++ · Swift

${paint(c.bold, "Config file (.commentcleanerrc):")}
  { "extensions": [".ts",".js"], "ignore": ["tmp"], "report": true }

${paint(c.bold, "Examples:")}
  comment-cleaner ./src                  Preview findings
  comment-cleaner ./src --fix            Remove all dead comments
  comment-cleaner ./src --watch          Watch for new commented code
  comment-cleaner ./src --json           Print JSON to stdout
  comment-cleaner ./src --json out.json  Save JSON to file
  comment-cleaner ./src -r               Save Markdown report
  comment-cleaner ./src --fix -r         Fix + save report of what was removed
  comment-cleaner . -e .go,.rs           Only Go and Rust files
`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────
function main() {
  let opts = parseArgs(process.argv);
  if (opts.help) { printHelp(); process.exit(0); }

  console.log(paint(c.cyan + c.bold, `
╔══════════════════════════════════════╗
║      🧹  comment-cleaner  🧹         ║
║  Scan · Fix · Watch · Report         ║
╚══════════════════════════════════════╝`));

  const targetPath = path.resolve(opts.targetPath);
  if (!fs.existsSync(targetPath)) {
    console.error(paint(c.red, `\n❌  Path not found: ${targetPath}\n`));
    process.exit(1);
  }

  const config = loadConfig(path.dirname(targetPath));
  opts = applyConfig(opts, config);
  if (!opts.extensions) opts.extensions = new Set(Object.keys(LANGUAGES));

  console.log(paint(c.blue, `\n🔍 Scanning: ${paint(c.bold + c.blue, targetPath)}`));
  console.log(paint(c.dim, `   Extensions : ${[...opts.extensions].join("  ")}`));
  if (opts.fix) console.log(paint(c.yellow, `   Mode       : --fix`));
  if (opts.watch) console.log(paint(c.magenta, `   Mode       : --watch`));
  if (opts.json) console.log(paint(c.cyan, `   Mode       : --json`));
  if (opts.extraIgnore.length) console.log(paint(c.dim, `   Extra ignore: ${opts.extraIgnore.join(", ")}`));
  console.log();

  // ── Watch mode (takes over, never returns) ────────────────────────────────
  if (opts.watch) {
    runWatch(targetPath, opts);
    return;
  }

  // ── Normal scan ───────────────────────────────────────────────────────────
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

  const meta = {
    targetPath: path.relative(process.cwd(), targetPath) || ".",
    totalFiles: files.length,
    extensions: opts.extensions,
  };

  // Preview
  if (!opts.noPreview && !opts.json) printPreview(findings, meta);

  // JSON output
  if (opts.json) {
    const jsonStr = renderJson(findings, meta);
    if (opts.jsonPath) {
      fs.writeFileSync(opts.jsonPath, jsonStr, "utf8");
      console.log(paint(c.green + c.bold, `📦 JSON saved → ${opts.jsonPath}\n`));
    } else {
      console.log(jsonStr);
    }
  }

  // Fix
  if (opts.fix) {
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

  // Markdown report
  if (opts.report) {
    const timestamp = new Date().toISOString().slice(0, 10);
    const reportPath = opts.reportPath || `comment-cleaner-${timestamp}.md`;
    fs.writeFileSync(reportPath, renderReport(findings, meta), "utf8");
    console.log(paint(c.green + c.bold, `📊 Report saved → ${reportPath}\n`));
  } else if (!opts.fix && !opts.json) {
    console.log(paint(c.dim, "  💡 --fix to remove  |  -r for report  |  --json for JSON  |  --watch to monitor\n"));
  }

  if (!opts.fix && Object.keys(findings).length > 0) process.exitCode = 1;
}

main();