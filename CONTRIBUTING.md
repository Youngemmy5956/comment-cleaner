# 🤝 Contributing to comment-cleaner

First off, thank you for taking the time to contribute! Every contribution helps make this tool better for everyone.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## 📜 Code of Conduct

This project is welcoming to everyone. Please be respectful, constructive, and kind in all interactions.

---

## 💡 How Can I Contribute?

- 🐛 Fix a bug
- ✨ Add support for a new language
- 🧠 Improve the comment detection logic
- 📝 Improve documentation
- 🌍 Add new file extension support

---

## 🚀 Getting Started

**1. Fork the repository**

Click the **Fork** button at the top of the [GitHub page](https://github.com/Youngemmy5956/comment-cleaner).

**2. Clone your fork**

```bash
git clone https://github.com/YOUR_USERNAME/comment-cleaner.git
cd comment-cleaner
```

**3. Create a branch for your change**

```bash
git checkout -b fix/your-fix-name
# or
git checkout -b feat/your-feature-name
```

**4. Make your changes in `index.js`**

**5. Test your changes**

```bash
# Run against a real project
node index.js ./path/to/some/project

# Run against a single file
node index.js ./path/to/file.ts
```

**6. Commit with a clear message**

```bash
git add .
git commit -m "fix: describe what you fixed"
# or
git commit -m "feat: describe what you added"
```

---

## 📬 Submitting a Pull Request

1. Push your branch to your fork:
```bash
git push origin your-branch-name
```

2. Go to the original repo on GitHub and click **"Compare & pull request"**

3. Fill in the PR description:
   - What does this change do?
   - Why is it needed?
   - Any edge cases to be aware of?

4. Submit and wait for review 🎉

---

## 🐛 Reporting Bugs

Open an issue at [github.com/Youngemmy5956/comment-cleaner/issues](https://github.com/Youngemmy5956/comment-cleaner/issues/new?template=bug_report.md) and include:

- What you ran (command + path)
- What you expected to happen
- What actually happened
- A code snippet that triggered the wrong behaviour (if possible)

---

## ✨ Suggesting Features

Open a feature request at [github.com/Youngemmy5956/comment-cleaner/issues](https://github.com/Youngemmy5956/comment-cleaner/issues/new?template=feature_request.md) and describe:

- What problem would this solve?
- What should the feature look like?
- Any examples from other tools you like?

---

## 🏗️ Project Structure

```
comment-cleaner/
├── index.js        ← All the logic lives here (single file, zero deps)
├── package.json
├── README.md
├── CONTRIBUTING.md
├── LICENSE
└── .github/
    └── ISSUE_TEMPLATE/
        ├── bug_report.md
        └── feature_request.md
```

---

Made with ❤️ by [Nwamini Emmanuel O](https://github.com/Youngemmy5956)