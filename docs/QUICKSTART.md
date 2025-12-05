# Quick Start Guide

Get started with the Translation Sync Action development.

---

## For Action Users

**Want to use the action?** See the main [README.md](../README.md)

**Want to test the action?** See [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md)

---

## For Developers

### Prerequisites

- Node.js 20+
- npm
- Git
- TypeScript knowledge

### Initial Setup

```bash
# Clone repository
git clone https://github.com/quantecon/action-translation-sync.git
cd action-translation-sync

# Install dependencies
npm install

# Build the action
npm run build

# Run tests
npm test
```

### Project Structure

```
action-translation-sync/
├── src/                    # TypeScript source code
│   ├── index.ts           # Main entry point
│   ├── types.ts           # Type definitions
│   ├── parser.ts          # MyST Markdown parser
│   ├── diff-detector.ts   # Change detection
│   ├── translator.ts      # Claude API integration
│   ├── file-processor.ts  # Translation orchestration
│   └── inputs.ts          # Input validation
├── dist/                   # Built JavaScript (committed)
├── glossary/               # Built-in glossaries
│   ├── zh-cn.json         # Simplified Chinese (357 terms)
│   ├── fa.json            # Persian/Farsi (357 terms)
│   └── README.md          # Glossary documentation
├── docs/                   # Documentation
└── examples/               # Example files
```

### Development Workflow

```bash
# Make changes to src/
vim src/translator.ts

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format

# Commit
git add .
git commit -m "feat: add new feature"
git push
```
### Key Components

**Parser** (`src/parser.ts`):
- Parses MyST Markdown into semantic blocks
- Preserves structure and metadata
- Used by diff detector and file processor

**Diff Detector** (`src/diff-detector.ts`):
- Compares old vs new versions
- Identifies added/modified/deleted blocks
- Maps changes to target document

**Translator** (`src/translator.ts`):
- Integrates with Claude Sonnet 4
- Dual mode: diff (incremental) and full (new files)
- Uses built-in glossary for consistency

**File Processor** (`src/file-processor.ts`):
- Orchestrates the translation workflow
- Applies translations to target documents
- Validates MyST syntax

---

## Testing

### Run Tests

```bash
npm test
```

### Test with Real Repos

See [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md) for setting up isolated test repositories.

---

## Making Changes

### Adding a Feature

1. Update relevant file in `src/`
2. Add/update types in `src/types.ts`
3. Run `npm run build`
4. Add tests
5. Update documentation

### Updating the Model

```typescript
// src/translator.ts
// Model is now configurable via action.yml!
```

See [CLAUDE-MODELS.md](CLAUDE-MODELS.md) for model options.

### Adding Glossary Terms

Edit `glossary/zh-cn.json`:

```json
{
  "terms": [
    {
      "en": "new term",
      "zh-cn": "新术语",
      "context": "economics"
    }
  ]
}
```

Then rebuild: `npm run build`

---

## Architecture Overview

```
PR Merged
    ↓
[Detect Changes] → Get changed .md files
    ↓
[Parse MyST] → Break into semantic blocks
    ↓
[Diff Detection] → Find what changed (added/modified/deleted)
    ↓
[Map to Target] → Match blocks in target document
    ↓
[Translation] → Translate with Claude + glossary
    ↓
[Reconstruct] → Apply translations to target
    ↓
[Create PR] → Open in target repo (⚠️ Not implemented in v0.1.x)
```

---

## Release Process

### Create a New Release

```bash
# Update version
npm version patch  # or minor, major

# Build
npm run build

# Tag
git tag -a v0.1.x -m "Release notes"
git push origin v0.1.x

# Update floating tag
git tag -f v0.1 -m "Latest v0.1.x"
git push origin v0.1 --force
```

See [releases/](releases/) for release notes.

---

## Resources

- **Architecture**: [ARCHITECTURE.md](ARCHITECTURE.md)
- **Implementation**: [IMPLEMENTATION.md](IMPLEMENTATION.md)
- **Design Decisions**: [PROJECT-DESIGN.md](PROJECT-DESIGN.md)
- **TODO List**: [TODO.md](TODO.md)
- **Testing Guide**: [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md)
- **Development Guidelines**: [../.github/copilot-instructions.md](../.github/copilot-instructions.md)

---

## Getting Help

- **Issues**: https://github.com/quantecon/action-translation-sync/issues
- **Discussions**: https://github.com/quantecon/action-translation-sync/discussions
- **Documentation**: [INDEX.md](INDEX.md)

---

**Ready to develop!** 🚀

Start with [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md) to set up testing environment.


## Getting Help

Check these files for detailed information:
- [../README.md](../README.md) - User documentation
- [PROJECT-DESIGN.md](PROJECT-DESIGN.md) - Architecture and design
- [IMPLEMENTATION.md](IMPLEMENTATION.md) - What's been built
- [TODO.md](TODO.md) - What's remaining

## Current Status

**Phase 1: Core Components** ✅ COMPLETE
- Project setup ✅
- MyST parser ✅  
- Diff detection ✅
- Translation service ✅
- File processing ✅

**Phase 2: GitHub Integration** 🚧 TODO
- Repository cloning
- Branch creation
- PR creation
- TOC management

**Phase 3: Testing & Deployment** 📝 PLANNED
- Comprehensive tests
- CI/CD pipeline
- Release automation

---

Ready to continue development? Check [TODO.md](TODO.md) for the detailed task list!
