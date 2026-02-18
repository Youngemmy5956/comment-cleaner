# 🧹 comment-cleaner

> A zero-dependency CLI that scans your codebase for **commented-out code**, previews findings, auto-fixes them, watches in real time, and exports reports in Markdown or JSON.

[![npm version](https://img.shields.io/npm/v/@youngemmy/comment-cleaner.svg)](https://www.npmjs.com/package/@youngemmy/comment-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- 🔍 **Preview mode** — see all commented-out code blocks with file path and line numbers
- 🔧 **Fix mode** — automatically remove all detected commented-out code with one command
- 👀 **Watch mode** — monitor your project in real time and alert on new commented-out code as you type
- 📊 **Report mode** — export a clean Markdown report, perfect for code reviews
- 📦 **JSON output** — machine-readable output for CI pipelines and editor integrations
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

---

## 🚀 Usage

```bash
# Preview commented-out code (no changes made)
comment-cleaner ./src

# Auto-remove all commented-out code
comment-cleaner ./src --fix

# Watch mode — alerts you in real time as you code
comment-cleaner ./src --watch

# Output results as JSON to stdout
comment-cleaner ./src --json

# Save JSON to a file
comment-cleaner ./src --json results.json

# Save a Markdown report
comment-cleaner ./src -r

# Fix and save a report of what was removed
comment-cleaner ./src --fix -r

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
| `--watch` | `-w` | Watch mode — alert on new commented-out code in real time |
| `--json [file]` | | Output results as JSON. Prints to stdout or saves to file |
| `--report [file]` | `-r` | Save findings as a Markdown report |
| `--ext .js,.ts` | `-e` | Only scan specific extensions (comma-separated) |
| `--ignore dir1,dir2` | | Extra directories to skip on top of defaults |
| `--no-preview` | | Suppress terminal output |
| `--help` | `-h` | Show help |

---

## 👀 Watch Mode

Watch mode monitors your project in the background and instantly alerts you whenever new commented-out code is detected — without you having to run the tool manually.

```bash
comment-cleaner ./src --watch
```

```
👀 Watch mode active — monitoring for changes...
   Press Ctrl+C to stop.

✅  No issues found on startup. Watching for new changes...

⚠️  [14:32:01] Commented-out code detected in: src/api.ts
   lines 12–14:
     // const OLD_BASE = 'https://old.api.com';
     // const client = axios.create({ baseURL: OLD_BASE });
     // export default client;

   Run: comment-cleaner src/api.ts --fix  to remove
```

---

## 📦 JSON Output

Use `--json` when you want machine-readable output for CI pipelines, editor plugins, or custom scripts.

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

- Always **preview first** before using `--fix`
- Use `--watch` during development to catch dead comments as you write them
- Use `--fix -r` to remove code and keep a record of what was deleted
- Use `--json` to pipe results into other tools or scripts
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