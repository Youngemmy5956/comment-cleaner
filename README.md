# 🧹 comment-cleaner

> A zero-dependency CLI that scans your codebase for **commented-out code**, previews findings, auto-fixes them, watches in real time, and exports reports in Markdown, JSON, or HTML.

[![npm version](https://img.shields.io/npm/v/@youngemmy/comment-cleaner.svg)](https://www.npmjs.com/package/@youngemmy/comment-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- 🔍 **Preview mode** — see all commented-out code blocks with file path and line numbers
- 🔧 **Fix mode** — automatically remove all detected commented-out code with one command
- 🧪 **Dry-run mode** — preview exactly what `--fix` would remove before committing
- 👀 **Watch mode** — monitor your project in real time and alert on new commented-out code as you type
- 📊 **Markdown report** — export a clean report, perfect for code reviews
- 🌐 **HTML report** — beautiful dark-themed visual report you can open in any browser
- 📦 **JSON output** — machine-readable output for CI pipelines and editor integrations
- 🏷️ **Severity levels** — every block is ranked 🔴 High · 🟡 Medium · 🟢 Low
- 🔒 **@keep annotation** — permanently exclude any comment from detection
- ⚙️ **Config file** — save your settings per project in `.commentcleanerrc`
- 🤖 **GitHub Action** — run automatically on every pull request
- 🧠 **Smart detection** — only flags actual dead code, ignores explanatory comments and TODOs
- 🌍 **13 languages** — JS, TS, Python, Go, Java, Rust, Ruby, PHP, C/C++, Swift, CSS, and more
- ⚡ **Zero dependencies** — pure Node.js

---

## 📦 Installation

```bash
npm install -g @youngemmy/comment-cleaner
```

Or run with npx (no install needed):

```bash
npx @youngemmy/comment-cleaner ./src
```

📦 [npmjs.com/package/@youngemmy/comment-cleaner](https://www.npmjs.com/package/@youngemmy/comment-cleaner)  
⭐ [github.com/Youngemmy5956/comment-cleaner](https://github.com/Youngemmy5956/comment-cleaner)

---

## 🚀 Usage

```bash
# Preview commented-out code with severity levels (no changes made)
comment-cleaner ./src

# Preview what --fix would remove without touching files
comment-cleaner ./src --dry-run

# Auto-remove all commented-out code
comment-cleaner ./src --fix

# Fix and save a report of what was removed
comment-cleaner ./src --fix -r

# Watch mode — alerts you in real time as you code
comment-cleaner ./src --watch

# Generate a beautiful HTML report
comment-cleaner ./src --html

# Save HTML report to a specific file
comment-cleaner ./src --html report.html

# Output results as JSON to stdout
comment-cleaner ./src --json

# Save JSON to a file
comment-cleaner ./src --json results.json

# Save a Markdown report
comment-cleaner ./src -r

# Only scan Go and Rust files
comment-cleaner . -e .go,.rs

# Report only, no terminal output (great for CI)
comment-cleaner ./src --no-preview -r audit.md
```

---

## ⚙️ Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--fix` | `-f` | Automatically remove all detected commented-out code |
| `--dry-run` | | Show what `--fix` would remove without making any changes |
| `--watch` | `-w` | Watch mode — alert on new commented-out code in real time |
| `--html [file]` | | Generate a beautiful HTML report (default: `comment-cleaner-YYYY-MM-DD.html`) |
| `--json [file]` | | Output results as JSON. Prints to stdout or saves to file |
| `--report [file]` | `-r` | Save findings as a Markdown report |
| `--ext .js,.ts` | `-e` | Only scan specific extensions (comma-separated) |
| `--ignore dir1,dir2` | | Extra directories to skip on top of defaults |
| `--no-preview` | | Suppress terminal output |
| `--help` | `-h` | Show help |

---

## 🧪 Dry-run Mode

See exactly what `--fix` would remove before you commit to it. Nothing is changed.

```bash
comment-cleaner ./src --dry-run
```

```
📄 src/api.ts  (2 blocks)
  ┌─ lines 4–5 ─────────────────────── 🟢 LOW
  │    4    // const OLD_CACHE = new Map<string, User>();
  │    5    // if (OLD_CACHE.has(id)) return OLD_CACHE.get(id);
  └────────────────────────────────────────────────────
  ┌─ lines 9–19 ────────────────────── 🔴 HIGH
  │    9    // const BASE = 'https://old.api.com';
  ...
  └────────────────────────────────────────────────────

  🧪 Dry run — no files were changed.
```

---

## 🔒 @keep Annotation

Add `@keep` to any comment you want the tool to **permanently ignore**, even if it looks like dead code.

```js
// @keep const LEGACY_URL = 'https://legacy.api.com'; // needed for migration script
// @keep const OLD_TIMEOUT = 3000;
```

```python
# @keep old_hash = hashlib.md5(password.encode()).hexdigest()
```

These lines will never be flagged, even when running `--fix`.

---

## 🏷️ Severity Levels

Every detected block is automatically ranked by size so you know where to focus first.

| Level | Lines | Meaning |
|-------|-------|---------|
| 🔴 HIGH | 10+ lines | Large dead block — delete it first |
| 🟡 MEDIUM | 4–9 lines | Medium dead block |
| 🟢 LOW | 1–3 lines | Small dead comment |

Severity is shown in the terminal, Markdown report, HTML report, and JSON output.

---

## 👀 Watch Mode

Monitors your project in the background and instantly alerts you whenever new commented-out code is detected — without running the tool manually.

```bash
comment-cleaner ./src --watch
```

```
👀 Watch mode active — monitoring for changes...
   Press Ctrl+C to stop.

✅  No issues found on startup. Watching for new changes...

⚠️  [14:32:01] Commented-out code in: src/api.ts
   🔴 HIGH lines 12–14:
     // const OLD_BASE = 'https://old.api.com';
     // const client = axios.create({ baseURL: OLD_BASE });
     // export default client;

   Run: comment-cleaner src/api.ts --fix  to remove
```

---

## 🌐 HTML Report

Generate a beautiful dark-themed visual report you can open in any browser — great for sharing with your team.

```bash
comment-cleaner ./src --html
comment-cleaner ./src --html report.html
```

The report includes the full summary, severity breakdown, and all flagged blocks grouped by file.

---

## 📦 JSON Output

Use `--json` for machine-readable output in CI pipelines, editor plugins, or custom scripts.

```bash
comment-cleaner ./src --json
```

```json
{
  "generatedAt": "2026-02-18T10:00:00.000Z",
  "scannedPath": "src",
  "summary": {
    "filesScanned": 42,
    "filesWithIssues": 3,
    "commentedBlocks": 5,
    "linesAffected": 12
  },
  "files": {
    "src/api.ts": [
      {
        "startLine": 3,
        "endLine": 4,
        "lineCount": 2,
        "severity": "low",
        "code": "// const OLD_BASE = 'https://old.api.com';\n// const TIMEOUT = 5000;"
      }
    ]
  }
}
```

---

## ⚙️ Config File

Create a `.commentcleanerrc` in your project root to save settings. CLI flags always override config values.

```json
{
  "extensions": [".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".scss"],
  "ignore": ["tmp", "fixtures", "__tests__", "migrations"],
  "report": true,
  "reportPath": "comment-cleaner-report.md"
}
```

---

## 🤖 GitHub Action

Create `.github/workflows/comment-cleaner.yml` to scan on every pull request:

```yaml
name: 🧹 Comment Cleaner

on:
  pull_request:
    branches: [main, master, develop]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      - run: npm install -g @youngemmy/comment-cleaner
      - run: comment-cleaner . --no-preview -r comment-cleaner-report.md || true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: comment-cleaner-report
          path: comment-cleaner-report.md
```

---

## 🌐 Supported Languages

| Language | Extensions |
|----------|-----------|
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` |
| TypeScript | `.ts` `.tsx` |
| Python | `.py` |
| Go | `.go` |
| Java | `.java` |
| Kotlin | `.kt` `.kts` |
| Rust | `.rs` |
| Ruby | `.rb` |
| PHP | `.php` |
| C / C++ | `.c` `.cpp` `.h` |
| Swift | `.swift` |
| CSS | `.css` |
| SCSS / Sass / Less | `.scss` `.sass` `.less` |

Use `-e` to scan any other extension you need.

---

## 🧠 How Detection Works

Only flags **actual dead code** — not comments that explain what your code does.

### ✅ Kept (not flagged)

```js
// Load posts from Firebase
// Helper function to split the title
// TODO: add retry logic
/** @param {string} id - The user ID */
// @keep const LEGACY_URL = 'https://legacy.api.com';
```

### ❌ Flagged (dead code)

```js
// import TwitterTimeline from "../components/TwitterTimeline";
// const BASE_URL = 'https://api.legacy.com/v1';
// function oldGetUser(id) { return db.query(id); }
```

```go
// oldDB := sql.Open("postgres", connStr)
// rows, _ := oldDB.Query("SELECT * FROM users")
```

```rust
// fn old_parse(input: &str) -> HashMap<String, i32> {
//     HashMap::new()
// }
```

---

## 💡 Tips

- Always **preview first** or use `--dry-run` before using `--fix`
- Use `--watch` during development to catch dead comments as you write them
- Use `--fix -r` to remove code and keep a record of what was deleted
- Use `--html` to share a visual report with your team
- Use `--json` to pipe results into other tools or scripts
- Use `@keep` to protect comments that look like dead code but are intentional
- Use `--no-preview -r` in CI to generate a silent report artifact

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.
Open an issue at [github.com/Youngemmy5956/comment-cleaner/issues](https://github.com/Youngemmy5956/comment-cleaner/issues)

---

## 👨‍💻 Author

**Nwamini Emmanuel O**
- GitHub: [@Youngemmy5956](https://github.com/Youngemmy5956)
- Email: [emmanuelgodwin558@gmail.com](mailto:emmanuelgodwin558@gmail.com)
- npm: [@youngemmy](https://www.npmjs.com/~youngemmy)

---

## 📝 License

Copyright © 2026 [Nwamini Emmanuel O](https://github.com/Youngemmy5956).
This project is [MIT](./LICENSE) licensed.