# 🧹 comment-cleaner

> A zero-dependency CLI that scans your codebase for **commented-out code**, previews findings in the terminal, and exports a clean Markdown report.

[![npm version](https://img.shields.io/npm/v/@youngemmy/comment-cleaner.svg)](https://www.npmjs.com/package/@youngemmy/comment-cleaner)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- 🔍 **Preview mode** — see all commented-out code blocks with file path and line numbers, no changes made
- 📊 **Report mode** — export a clean Markdown report, perfect for code reviews and sharing with your team
- 🧠 **Smart detection** — only flags actual commented-out code. Ignores explanatory comments, section labels, TODOs, and JSDoc
- 🌍 **Multi-language** — JS, TS, JSX, TSX, Python, CSS, SCSS, and more
- ⚡ **Zero dependencies** — pure Node.js, nothing to install

---

## 📦 Installation

```bash
npm install -g @youngemmy/comment-cleaner
```

Or run directly with npx (no install needed):

```bash
npx @youngemmy/comment-cleaner ./src
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

Use `-e` to add any other extension you need.

---

## 🧠 How Detection Works

The tool is designed to flag **only dead code** — not comments that explain what your code does.

### ✅ These are KEPT (not flagged)

```js
// Load posts from Firebase
// Helper function to split the title
// Check for mobile device and set up event listeners
// This handles the authentication flow
// Cleanup function
```

```css
/* Large Desktop (1440px and up) */
/* Active card (hovered) */
/* Focus States for Accessibility */
```

```js
// TODO: add retry logic
// NOTE: this runs on every render
/** @param {string} id - The user ID */
```

### ❌ These are FLAGGED (actual commented-out code)

```js
// import TwitterTimeline from "../components/TwitterTimeline";
// const BASE_URL = 'https://api.legacy.com/v1';
// const TIMEOUT = 5000;

// function oldGetUser(id: string) {
//   const user = db.query(`SELECT * FROM users WHERE id = '${id}'`);
//   return user;
// }
```

```css
/* .old-card {
  position: relative;
  border-radius: 0.75rem;
  overflow: hidden;
} */
```

```python
# old_hash = hashlib.md5(password.encode()).hexdigest()
# if old_hash == stored_hash:
#     return True
```

---

## 🗂️ Default Ignored Directories

`node_modules` · `.git` · `dist` · `build` · `.next` · `out`  
`__pycache__` · `.venv` · `venv` · `coverage` · `.nyc_output` · `.cache` · `vendor`

---

## 📄 Sample Report

When you run `comment-cleaner ./src -r`, you get a Markdown file like this:

```markdown
# 🧹 Comment Cleaner Report

> Generated: 2026-02-18T10:00:00.000Z
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
```
// const BASE_URL = 'https://api.legacy.com/v1';
// const TIMEOUT = 5000;
```
```

---

## 💡 Tips

- Always **preview first** before deciding what to remove
- Use `-r` during code reviews to share a full audit with your team
- Use `--no-preview -r` in CI pipelines to generate a silent report artifact

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