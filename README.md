# 🧹 comment-cleaner

> A zero-dependency CLI that scans your codebase for **commented-out code**, previews findings, auto-fixes them, and exports a clean Markdown report.

[![npm version](https://img.shields.io/npm/v/@youngemmy/comment-cleaner.svg)](https://www.npmjs.com/package/@youngemmy/comment-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- 🔍 **Preview mode** — see all commented-out code blocks with file path and line numbers
- 🔧 **Fix mode** — automatically remove all detected commented-out code with one command
- 📊 **Report mode** — export a clean Markdown report, perfect for code reviews
- ⚙️ **Config file** — save your settings per project in `.commentcleanerrc`
- 🤖 **GitHub Action** — run automatically on every pull request
- 🧠 **Smart detection** — only flags actual dead code, ignores explanatory comments and TODOs
- 🌍 **Multi-language** — JS, TS, JSX, TSX, Python, CSS, SCSS, and more
- ⚡ **Zero dependencies** — pure Node.js, nothing to install

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

# Preview + save a Markdown report
comment-cleaner ./src -r

# Fix and save a report of what was removed
comment-cleaner ./src --fix -r

# Report only, no terminal output (great for CI)
comment-cleaner ./src --no-preview -r audit.md

# Only scan JS and TS files
comment-cleaner . -e .js,.ts

# Skip extra directories
comment-cleaner . --ignore tmp,fixtures,__tests__
```

---

## ⚙️ Options

| Flag | Alias | Description |
|------|-------|-------------|
| `--fix` | `-f` | Automatically remove all detected commented-out code |
| `--report [file]` | `-r` | Save findings as a Markdown report. Default: `comment-cleaner-YYYY-MM-DD.md` |
| `--ext .js,.ts` | `-e` | Only scan specific extensions (comma-separated) |
| `--ignore dir1,dir2` | | Extra directories to skip on top of defaults |
| `--no-preview` | | Suppress terminal output |
| `--help` | `-h` | Show help |

---

## ⚙️ Config File

Create a `.commentcleanerrc` file in your project root to save your preferred settings. CLI flags always override config file values.

```json
{
  "extensions": [".js", ".jsx", ".ts", ".tsx", ".py", ".css", ".scss"],
  "ignore": ["tmp", "fixtures", "__tests__", "migrations"],
  "report": true,
  "reportPath": "comment-cleaner-report.md"
}
```

The tool automatically searches for `.commentcleanerrc` or `.commentcleanerrc.json` starting from your project folder up to the root.

---

## 🤖 GitHub Action

Add this to your repo to automatically scan for commented-out code on every pull request.

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
      - run: comment-cleaner . --no-preview -r comment-cleaner-report.md || true
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: comment-cleaner-report
          path: comment-cleaner-report.md
```

The report will be uploaded as a downloadable artifact on every PR.

---

## 🌐 Supported Languages

| Language | Extensions |
|----------|-----------|
| JavaScript | `.js` `.jsx` `.mjs` `.cjs` |
| TypeScript | `.ts` `.tsx` |
| Python | `.py` |
| CSS | `.css` |
| SCSS / Sass / Less | `.scss` `.sass` `.less` |

Use `-e` to add any other extension you need.

---

## 🧠 How Detection Works

The tool only flags **actual dead code** — not comments explaining what your code does.

### ✅ These are KEPT (not flagged)

```js
// Load posts from Firebase
// Helper function to split the title
// Check for mobile device and set up event listeners
// TODO: add retry logic
/** @param {string} id - The user ID */
```

```css
/* Large Desktop (1440px and up) */
/* Active card (hovered) */
```

### ❌ These are FLAGGED (actual commented-out code)

```js
// import TwitterTimeline from "../components/TwitterTimeline";
// const BASE_URL = 'https://api.legacy.com/v1';

// function oldGetUser(id: string) {
//   const user = db.query(`SELECT * FROM users WHERE id = '${id}'`);
//   return user;
// }
```

```css
/* .old-card {
  position: relative;
  border-radius: 0.75rem;
} */
```

---

## 🗂️ Default Ignored Directories

`node_modules` · `.git` · `dist` · `build` · `.next` · `out`
`__pycache__` · `.venv` · `venv` · `coverage` · `.nyc_output` · `.cache` · `vendor`

---

## 💡 Tips

- Always **preview first** before using `--fix`
- Use `--fix -r` together to remove code and keep a record of what was deleted
- Use `--no-preview -r` in CI pipelines to generate a silent report artifact
- Add `.commentcleanerrc` to each project to avoid typing flags every time

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
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