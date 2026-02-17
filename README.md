# 🧹 comment-cleaner

> A zero-dependency CLI that scans your codebase for commented-out code, previews findings in the terminal, and exports a clean Markdown report.

[![npm version](https://img.shields.io/npm/v/comment-cleaner.svg)](https://www.npmjs.com/package/comment-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- 🔍 **Preview mode** — see all commented-out code blocks with file path and line numbers, no changes made
- 📊 **Report mode** — export a clean Markdown report, perfect for code reviews and sharing with your team
- 🧠 **Smart detection** — skips `// TODO`, prose comments, and JSDoc (`/** */`). Only flags actual commented-out code
- 🌍 **Multi-language** — JS, TS, JSX, TSX, Python, CSS, SCSS, and more
- ⚡ **Zero dependencies** — pure Node.js, nothing to install

---

## 📦 Installation

### From npm (recommended)

```bash
npm install -g comment-cleaner
```

### From source

```bash
git clone https://github.com/Youngemmy5956/comment-cleaner.git
cd comment-cleaner
npm install -g .
```

---

## 🚀 Usage

```bash
# Preview commented-out code in current directory
comment-cleaner

# Scan a specific folder
comment-cleaner ./src

# Preview + save a Markdown report
comment-cleaner ./src -r

# Save report to a custom filename
comment-cleaner ./src -r my-audit.md

# Report only, no terminal output (great for CI)
comment-cleaner ./src --no-preview -r audit.md

# Only scan JS and TS files
comment-cleaner . -e .js,.ts

# Skip extra directories
comment-cleaner . --ignore tmp,fixtures,__tests__
```

> If running from source without global install, replace `comment-cleaner` with `node index.js`

---

## ⚙️ Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--report [file]` | `-r` | Save findings as a Markdown report. Default: `comment-cleaner-YYYY-MM-DD.md` |
| `--ext .js,.ts` | `-e` | Only scan specific extensions (comma-separated) |
| `--ignore dir1,dir2` | | Extra directories to skip on top of defaults |
| `--no-preview` | | Suppress terminal output |
| `--help` | `-h` | Show help |

---

## 🌐 Supported Languages

| Language | Extensions |
|----------|-----------|
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` |
| TypeScript | `.ts` `.tsx` |
| Python | `.py` |
| CSS | `.css` |
| SCSS / Sass / Less | `.scss` `.sass` `.less` |

Use `-e` to scan any other extension you need.

---

## 🧠 How Detection Works

The tool distinguishes commented-out **code** from useful comments using heuristics:

| Comment type | Status | Example |
|---|---|---|
| TODO / FIXME | ✅ Kept | `// TODO: add retry logic` |
| Prose explanation | ✅ Kept | `// This handles auth` |
| JSDoc / docstring | ✅ Kept | `/** @param {string} id */` |
| Commented-out variable | ❌ Flagged | `// const BASE_URL = 'https://...'` |
| Commented-out function | ❌ Flagged | `// function oldLogin() {` |
| Commented-out block | ❌ Flagged | `/* if (err) { throw err; } */` |

---

## 🗂️ Default Ignored Directories

`node_modules` · `.git` · `dist` · `build` · `.next` · `out`
`__pycache__` · `.venv` · `venv` · `coverage` · `.nyc_output` · `.cache` · `vendor`

---

## 📄 Sample Report

```markdown
# 🧹 Comment Cleaner Report

> Generated: 2026-02-17T10:00:00.000Z
> Scanned path: src

## Summary

| Metric | Value |
|--------|-------|
| Files scanned | 42 |
| Files with commented code | 6 |
| Commented-out blocks | 11 |
| Lines of commented code | 28 |

## Findings

### `src/api.ts`

**Lines 3–4** — 2 line(s)
\`\`\`
// const BASE_URL = 'https://api.legacy.com/v1';
// const TIMEOUT = 5000;
\`\`\`
```

---

## 💡 Tips

- Always **preview first** before deciding what to clean up
- Use `-r` during code reviews to share a full audit with your team
- Pipe `--no-preview -r` in CI to generate a report artifact without any terminal noise

---

## 🤝 Contributing

Contributions, issues and feature requests are welcome!
Feel free to open an issue at [github.com/Youngemmy5956/comment-cleaner/issues](https://github.com/Youngemmy5956/comment-cleaner/issues)

---

## 👨‍💻 Author

**Nwamini Emmanuel O**
- GitHub: [@Youngemmy5956](https://github.com/Youngemmy5956)
- Email: [emmanuelgodwin558@gmail.com](mailto:emmanuelgodwin558@gmail.com)

---

## 📝 License

Copyright © 2026 [Nwamini Emmanuel O](https://github.com/Youngemmy5956).
This project is [MIT](./LICENSE) licensed.
