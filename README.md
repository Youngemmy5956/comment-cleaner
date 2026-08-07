# 🧹 comment-cleaner

> A zero-dependency CLI that scans your codebase for **commented-out code**, previews findings, auto-fixes them, watches in real time, and exports reports in Markdown, JSON, or HTML.

[![npm version](https://img.shields.io/npm/v/@youngemmy/comment-cleaner.svg)](https://www.npmjs.com/package/@youngemmy/comment-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- 🔍 **Preview mode** — see all commented-out code blocks with file path and line numbers
- 🔧 **Fix mode** — automatically remove all detected commented-out code with one command
- 🎛️ **Interactive mode** — step through each block and choose delete, keep, or skip
- 🧪 **Dry-run mode** — preview exactly what `--fix` would remove before committing
- 👀 **Watch mode** — monitor your project in real time and alert on new commented-out code as you type
- 📈 **Stats mode** — view your scan history and trend over time
- 🚦 **Threshold mode** — fail CI automatically if too many blocks are found
- 📁 **Output dir** — save all reports (HTML, JSON, MD) to one folder in a single command
- 🌐 **HTML report** — beautiful dark-themed visual report you can open in any browser
- 📊 **Markdown report** — clean report, perfect for code reviews
- 📦 **JSON output** — machine-readable output for CI pipelines and editor integrations
- 🏷️ **Severity levels** — every block ranked 🔴 High · 🟡 Medium · 🟢 Low
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

# Step through each block interactively
comment-cleaner ./src -i

# Fix and save a report of what was removed
comment-cleaner ./src --fix -r

# Watch mode — alerts you in real time as you code
comment-cleaner ./src --watch

# Show scan history and trend over time
comment-cleaner --stats

# Fail CI if more than 5 commented blocks found
comment-cleaner ./src --threshold 5

# Save all reports (HTML + JSON + MD) to a folder
comment-cleaner ./src --output-dir ./reports

# Generate a beautiful HTML report
comment-cleaner ./src --html

# Output results as JSON
comment-cleaner ./src --json

# Save a Markdown report
comment-cleaner ./src -r

# Only scan Go and Rust files
comment-cleaner . -e .go,.rs

# Silent scan for CI
comment-cleaner ./src --no-preview -r audit.md
```

---

## ⚙️ Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--fix` | `-f` | Automatically remove all detected commented-out code |
| `--interactive` | `-i` | Step through each block — choose delete, keep, or skip |
| `--dry-run` | | Show what `--fix` would remove without making any changes |
| `--watch` | `-w` | Watch mode — alert on new commented-out code in real time |
| `--stats` | | Show scan history and trend over time |
| `--threshold <n>` | | Exit with error code if commented blocks exceed n (for CI) |
| `--output-dir <dir>` | | Save all reports (HTML, JSON, MD) to a folder at once |
| `--html [file]` | | Generate a beautiful HTML report |
| `--json [file]` | | Output results as JSON — stdout or file |
| `--report [file]` | `-r` | Save findings as a Markdown report |
| `--ext .js,.ts` | `-e` | Only scan specific extensions (comma-separated) |
| `--ignore dir1,dir2` | | Extra directories to skip on top of defaults |
| `--no-preview` | | Suppress terminal output |
| `--help` | `-h` | Show help |

---

## 🎛️ Interactive Mode

Step through every flagged block one by one and decide what to do with each — no more all-or-nothing deletes.

```bash
comment-cleaner ./src -i
```

```
🎛️  Interactive mode — review each block one by one

📄 src/api.ts
  ┌─ lines 4–5 ─────────────────────── 🟢 LOW
  │    4    // const OLD_CACHE = new Map<string, User>();
  │    5    // if (OLD_CACHE.has(id)) return OLD_CACHE.get(id);
  └────────────────────────────────────────────────────

  → [d] delete  [k] keep  [s] skip file  [q] quit:
```

---

## 📈 Stats Mode

Track how your codebase is improving over time. Every scan is recorded automatically.

```bash
comment-cleaner --stats
```

```
📈 comment-cleaner — Scan History

  Last 10 scans:

  Date                  Path                          Blocks  Lines
  ──────────────────────────────────────────────────────────────────
  2/21/2026, 10:00 AM   src                               33      36
  2/20/2026,  9:30 AM   src                               21      24
  2/19/2026,  8:15 AM   src                                5       6

  📉 Trend: DOWN 28 blocks since first scan — great progress! 🎉
```

---

## 🚦 Threshold Mode

Perfect for CI pipelines — fail the build automatically if too many commented-out blocks are found.

```bash
comment-cleaner . --threshold 5
```

```
✅  Threshold passed: 3 blocks found, limit is 5    → exit code 0
❌  Threshold exceeded: 8 blocks found, limit is 5  → exit code 1
```

Add it to your GitHub Action:

```yaml
- run: comment-cleaner . --threshold 10
```

---

## 📁 Output Dir

Save all three reports at once with a single command.

```bash
comment-cleaner ./src --output-dir ./reports
```

Creates:
```
reports/
├── comment-cleaner.html
├── comment-cleaner.json
└── comment-cleaner.md
```

---

## 🧪 Dry-run Mode

See exactly what `--fix` would remove before you commit to it. Nothing is changed.

```bash
comment-cleaner ./src --dry-run
```

---

## 🔒 @keep Annotation

Add `@keep` to any comment you want the tool to **permanently ignore**, even if it looks like dead code.

```js
// @keep const LEGACY_URL = 'https://legacy.api.com'; // needed for migration
// @keep const OLD_TIMEOUT = 3000;
```

```python
# @keep old_hash = hashlib.md5(password.encode()).hexdigest()
```

These lines will never be flagged, even with `--fix`.

---

## 🏷️ Severity Levels

Every detected block is automatically ranked so you know where to focus first.

| Level | Lines | Meaning |
|-------|-------|---------|
| 🔴 HIGH | 10+ lines | Large dead block — clean up first |
| 🟡 MEDIUM | 4–9 lines | Medium dead block |
| 🟢 LOW | 1–3 lines | Small dead comment |

Severity appears in the terminal, HTML report, Markdown report, and JSON output.

---

## 👀 Watch Mode

Monitors your project in the background and instantly alerts you when new commented-out code is saved.

```bash
comment-cleaner ./src --watch
```

---

## 🌐 HTML Report

A beautiful dark-themed visual report, perfect for sharing with your team.

```bash
comment-cleaner ./src --html
comment-cleaner ./src --html report.html
```

---

## 📦 JSON Output

Machine-readable output for CI pipelines, editor plugins, or custom scripts.

```bash
comment-cleaner ./src --json
```

```json
{
  "generatedAt": "2026-02-21T10:00:00.000Z",
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

Create a `.commentcleanerrc` in your project root. CLI flags always override config values.

```json
{
  "extensions": [".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".scss"],
  "ignore": ["tmp", "fixtures", "__tests__", "migrations"],
  "report": true,
  "reportPath": "comment-cleaner-report.md",
  "threshold": 10
}
```

---

## 🤖 GitHub Action

Create `.github/workflows/comment-cleaner.yml`:

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
      - run: comment-cleaner . --threshold 20 --output-dir reports || true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: comment-cleaner-reports
          path: reports/
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

- Always **preview first** or use `--dry-run` before `--fix`
- Use `-i` when you want control over what gets deleted
- Use `--watch` during development to catch dead comments as you write them
- Use `--stats` to track your cleanup progress over time
- Use `--threshold` in CI to enforce clean code standards
- Use `--output-dir` to save all reports in one shot
- Use `@keep` to protect comments that look like dead code but are intentional
- Use `--fix -r` to remove code and keep a record of what was deleted

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.
Open an issue at [github.com/Youngemmy5956/comment-cleaner/issues](https://github.com/Youngemmy5956/comment-cleaner/issues)

---

## 👨‍💻 Author

**Nwamini Emmanuel O**
- GitHub: [@Youngemmy5956](https://github.com/DevNwamini)
- Email: [emmanuelgodwin558@gmail.com](mailto:emmanuelgodwin558@gmail.com)
- npm: [@youngemmy](https://www.npmjs.com/~youngemmy)

---

## 📝 License

Copyright © 2026 [Nwamini Emmanuel O](https://github.com/Youngemmy5956).
This project is [MIT](./LICENSE) licensed.
