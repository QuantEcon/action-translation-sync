# Documentation Index

Complete documentation for the Translation Sync GitHub Action.

**Current Version**: v0.6.0 (Testing & Development)  
**Status**: Input Validation & Error Handling

---

## 🚀 Getting Started

**New to the project?** Start here:

1. **[Quick Start Guide](QUICKSTART.md)** - Get up and running in 10 minutes
2. **[Test Repositories Setup](TEST-REPOSITORIES.md)** - Create isolated test repos for safe validation
3. **[Main README](../README.md)** - Project overview, features, and usage

---

## 📐 Design & Architecture

**Understanding the system:**

1. **[Project Design](PROJECT-DESIGN.md)** - Design decisions and philosophy
2. **[Architecture](ARCHITECTURE.md)** - System architecture and component design
3. **[Implementation](IMPLEMENTATION.md)** - Comprehensive technical guide (~2,600 lines of code)

---

## 📚 Feature Guides

**Deep dives into key features:**

1. **[Heading Maps](HEADING-MAPS.md)** - Robust cross-language section matching system
2. **[Claude Models](CLAUDE-MODELS.md)** - Model selection and configuration
3. **[Translation Glossary](../glossary/README.md)** - Built-in glossary system (355 terms for zh-cn)
4. **[Language Configuration](IMPLEMENTATION.md#language-configuration)** - Language-specific translation rules (v0.5.1)

---

## 🧪 Testing & Development

**For contributors and testers:**

1. **[Testing Guide](TESTING.md)** - Test suite design and how to write tests (155 tests)
2. **[Test Repositories](TEST-REPOSITORIES.md)** - GitHub integration testing setup (24 scenarios)
3. **[CHANGELOG](../CHANGELOG.md)** - Version history and release notes

---

## 🛠️ Companion Tools

**Standalone tools for different workflows:**

1. **[Bulk Translator](../tool-bulk-translator/README.md)** - One-time bulk translation for initial setup
2. **[GitHub Test Tool](../tool-test-action-on-github/README.md)** - Automated GitHub testing + quality evaluation

---

## 📋 Release Notes

**Version history:**

- **[v0.6.0](../CHANGELOG.md#060---2025-12-03)** - Opus 4.5 evaluation tool, input validation, error handling ✅
- **[v0.5.1](releases/v0.5.1.md)** - Language configuration system + GPT5 validation
- **[v0.5.0](releases/v0.5.0.md)** - TOC files, file deletions, enhanced test coverage
- **[v0.4.10](releases/v0.4.10.md)** - Bug fixes and improvements
- **[v0.4.7](releases/v0.4.7.md)** - Full recursive heading support (##-######)
- **[v0.4.6](releases/v0.4.6.md)** - Exact section comparison, branch collision fix
- **[v0.4.5](releases/v0.4.5.md)** - Bug fixes and stability
- **[v0.4.4](releases/v0.4.4.md)** - Developer experience, GitHub testing, root-level support
- **[v0.4.3](releases/v0.4.3.md)** - Subsection support with regression tests
- **[v0.3.0](releases/v0.3.0.md)** - Section-based refactor, Claude 4.5, test suite
- **[v0.2.2](releases/v0.2.2.md)** - Team reviewers support
- **[v0.1.2](releases/v0.1.2.md)** - Documentation and glossary updates
- **[v0.1.1](releases/v0.1.1.md)** - Bug fixes and configurable model
- **[v0.1.0](releases/v0.1.0.md)** - Initial development release

---

## 🔍 Quick Lookup

**Need to...**

| Task | Documentation |
|------|---------------|
| Get started quickly | [QUICKSTART.md](QUICKSTART.md) |
| Understand the architecture | [ARCHITECTURE.md](ARCHITECTURE.md) |
| Understand heading-maps | [HEADING-MAPS.md](HEADING-MAPS.md) |
| Set up testing | [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md) |
| Understand the tests | [TESTING.md](TESTING.md) |
| Choose a Claude model | [CLAUDE-MODELS.md](CLAUDE-MODELS.md) |
| Add glossary terms | [../glossary/README.md](../glossary/README.md) |
| Configure language rules | [Language Config](IMPLEMENTATION.md#language-configuration) |
| Check version history | [CHANGELOG.md](../CHANGELOG.md) |
| Bulk translate initial setup | [../tool-bulk-translator/README.md](../tool-bulk-translator/README.md) |
| Test with GitHub PRs | [../tool-test-action-on-github/README.md](../tool-test-action-on-github/README.md) |

---

## 📂 Documentation Structure

```
docs/
├── INDEX.md                 # This file - documentation hub
├── QUICKSTART.md            # Get started in 10 minutes
├── PROJECT-DESIGN.md        # Design decisions and philosophy
├── ARCHITECTURE.md          # System architecture (diagrams, flow)
├── IMPLEMENTATION.md        # Comprehensive technical guide
├── HEADING-MAPS.md          # Cross-language matching system
├── CLAUDE-MODELS.md         # Model selection and configuration
├── TESTING.md               # Test suite guide (155 tests)
├── TEST-REPOSITORIES.md     # GitHub integration testing setup
└── releases/                # Version release notes
    ├── v0.1.0.md ... v0.5.1.md
```

**Total**: 9 focused documentation files

---

## 🔗 External Links

- **Main README**: [../README.md](../README.md)
- **Glossary System**: [../glossary/README.md](../glossary/README.md)
- **Examples**: [../examples/](../examples/)
- **GitHub Repository**: https://github.com/quantecon/action-translation-sync
- **Issues**: https://github.com/quantecon/action-translation-sync/issues

---

## 📊 Project Metrics

- **Core Code**: ~2,700 lines across 7 modules
- **Test Coverage**: 155 tests (100% passing)
- **GitHub Tests**: 24 automated scenarios
- **Glossary Terms**: 357 (Chinese), 357 (Persian)
- **Bundle Size**: ~1.9MB
- **Languages Supported**: English, Simplified Chinese, Persian/Farsi (Japanese, Spanish planned)

---

## 💡 Key Concepts

**Essential understanding for working with this action:**

1. **Section-Based Translation**: Translates entire `## Section` blocks for better context
2. **Position-Based Matching**: Matches sections by position (1st → 1st), not content
3. **Recursive Structure**: Full support for nested headings (##-######)
4. **Heading-Maps**: Language-independent mapping system (English ID → translated heading)
5. **Language Configuration**: Extensible system for language-specific rules (v0.5.1)

See [PROJECT-DESIGN.md](PROJECT-DESIGN.md) for detailed explanations.

---

**Last Updated**: December 3, 2025 (v0.6.0)
