# Translation Sync Action

A GitHub Action that automatically synchronizes translations across repositories using Claude Sonnet 4.5.

**Version**: v0.6.3 | **Status**: Testing & Development ✅

## Overview

This action monitors a source repository for merged pull requests and automatically translates changed MyST Markdown files to a target repository, creating pull requests for review.

**Key Features**:
- 🌍 **Language-Extensible**: Easy configuration for multiple target languages
- 🗺️ **Heading-Map System**: Robust cross-language section matching
- 🔄 **Intelligent Diff Translation**: Only translates changed sections
- ✍️ **MyST Markdown Support**: Preserves code blocks, math equations, and directives
- 📚 **Glossary Support**: Built-in glossaries for consistent terminology
- ✅ **Opus 4.5 Validated**: 100% pass rate on 24 comprehensive test scenarios

## Features

- 🌍 **Language Configuration** (v0.5.1): Extensible system for language-specific rules (punctuation, typography)
- ✅ **Input Validation** (v0.6.0): Validates language codes and Claude model names with helpful error messages
- 🗺️ **Heading-Map System**: Robust cross-language section matching that survives reordering
- 🔄 **Intelligent Diff Translation**: Only translates changed sections, preserving existing translations
- 📄 **Full File Translation**: Handles new files with complete translation
- ✍️ **MyST Markdown Support**: Preserves code blocks, math equations, and MyST directives
- 📚 **Glossary Support**: Built-in glossaries for consistent technical terminology (355 terms for zh-cn)
- 📑 **Automatic TOC Updates**: Updates `_toc.yml` when new files are added
- 🔍 **PR-Based Workflow**: All translations go through pull request review
- ♻️ **Recursive Subsections**: Full support for nested headings at any depth (##-######)
- ✅ **Extensively Tested**: 155 unit tests passing, 24 GitHub integration test scenarios

## Usage

### Basic Setup

Add this workflow to your source repository (e.g., `.github/workflows/sync-translations.yml`):

```yaml
name: Sync Translations

on:
  pull_request:
    types: [closed]
    paths:
      - 'lectures/**/*.md'

jobs:
  sync-to-chinese:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    
    steps:
      - uses: quantecon/action-translation-sync@v1
        with:
          target-repo: 'quantecon/lecture-python.zh-cn'
          target-language: 'zh-cn'
          docs-folder: 'lectures/'
          source-language: 'en'
          glossary-path: '.github/translation-glossary.json'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # Optional: Request reviewers for translation PRs
          pr-reviewers: 'username1,username2'
          pr-team-reviewers: 'translation-team'
          pr-labels: 'translation,automated,needs-review'
```

### Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `target-repo` | Yes | - | Target repository (format: `owner/repo`) |
| `target-language` | Yes | - | Target language code (e.g., `zh-cn`, `ja`, `es`) |
| `docs-folder` | No | `lectures/` | Documentation folder to monitor |
| `source-language` | No | `en` | Source language code |
| `glossary-path` | No | - | Path to **custom** glossary (built-in glossary used by default) |
| `toc-file` | No | `_toc.yml` | Table of contents file name |
| `anthropic-api-key` | Yes | - | Anthropic API key for Claude |
| `claude-model` | No | `claude-sonnet-4-5-20250929` | Claude model to use for translation |
| `github-token` | Yes | - | GitHub token for API access |
| `pr-labels` | No | `action-translation-sync,automated` | Comma-separated PR labels |
| `pr-reviewers` | No | - | Comma-separated GitHub usernames (e.g., `user1,user2`) |
| `pr-team-reviewers` | No | - | Comma-separated GitHub team slugs (e.g., `team1,team2`) |

### Outputs

| Output | Description |
|--------|-------------|
| `pr-url` | URL of the created pull request |
| `files-synced` | Number of files synchronized |

## Glossary Format

The action includes **built-in glossaries** for consistent translation across all QuantEcon lectures.

**Location**: `glossary/{language}.json`

Current glossaries:
- **`glossary/zh-cn.json`** - Simplified Chinese (357 terms) ✅
- **`glossary/ja.json`** - Japanese (planned)
- **`glossary/es.json`** - Spanish (planned)

The built-in glossary is automatically used - **no configuration needed!**

See [glossary/README.md](glossary/README.md) for details on the glossary structure and how to contribute.

### Custom Glossary (Optional)

If you need to add project-specific terms, you can provide a custom glossary:

```yaml
with:
  glossary-path: '.github/custom-glossary.json'
```

Glossary format:

```json
{
  "version": "1.0",
  "terms": [
    {
      "en": "household",
      "zh-cn": "家庭",
      "context": "economics"
    },
    {
      "en": "equilibrium",
      "zh-cn": "均衡"
    }
  ],
  "style_guide": {
    "preserve_code_blocks": true,
    "preserve_math": true,
    "preserve_citations": true,
    "preserve_myst_directives": true
  }
}
```

## How It Works

1. **Trigger**: Activates when a PR is merged in the source repository
2. **Detection**: Identifies changed MyST Markdown files
3. **Analysis**: For each file:
   - If file exists in target: Detects specific changes (diff mode)
   - If file is new: Translates entire file (full mode)
4. **Section Matching**: Uses heading-map system for robust cross-language matching
5. **Translation**: Uses Claude Sonnet 4.5 with glossary support
6. **Heading-Map Update**: Automatically maintains English→Translation mappings
7. **Validation**: Verifies MyST syntax of translated content
8. **PR Creation**: Opens a pull request in the target repository
9. **Review**: Team reviews and merges the translation

### Heading-Map System (v0.4.0)

The action uses a **heading-map system** to reliably match sections across language versions:

```yaml
---
title: Dynamic Programming
heading-map:
  Introduction: 简介
  Economic Model: 经济模型
  Python Setup: Python 设置
---
```

**Benefits:**
- 🎯 **Robust matching**: Finds sections even if reordered or restructured
- 🔄 **Self-maintaining**: Automatically populated and updated
- 👁️ **Transparent**: Visible in document frontmatter
- 📖 **Human-readable**: Easy to inspect and manually correct if needed

See [docs/HEADING-MAPS.md](docs/HEADING-MAPS.md) for detailed guide.

## Documentation

For comprehensive documentation, see the [`docs/`](docs/) directory:

- **[Getting Started](docs/QUICKSTART.md)** - Quick setup and development guide
- **[Heading Maps Guide](docs/HEADING-MAPS.md)** - Robust section matching system
- **[Project Design](docs/PROJECT-DESIGN.md)** - Architecture and design decisions
- **[Architecture](docs/ARCHITECTURE.md)** - System diagrams and data flow
- **[Implementation](docs/IMPLEMENTATION.md)** - What's been built and how it works
- **[Status Report](docs/STATUS-REPORT.md)** - Current project status and metrics
- **[Documentation Index](docs/INDEX.md)** - Complete documentation navigation

## Companion Tools

This project includes two standalone tools for different stages of the translation workflow:

### 1. Bulk Translator Tool

**Purpose**: One-time bulk translation for **initial repository setup**

📦 **[tool-bulk-translator/](tool-bulk-translator/)** - Standalone CLI tool

**Features**:
- Translates entire lecture series in one operation
- One-lecture-at-a-time approach for optimal quality and context
- Preserves complete Jupyter Book structure
- Auto-generates heading-maps for all sections
- Dry-run mode to preview before translating (no API costs)

**Use case**: Creating a new `lecture-python.zh-cn` from existing `lecture-python`

**After bulk translation**, use the main action for incremental updates.

### 2. GitHub Action Test Tool

**Purpose**: Testing and validation of the translation sync action

🧪 **[tool-test-action-on-github/](tool-test-action-on-github/)** - Automated testing framework

**Features**:
- 24 comprehensive test scenarios
- Real GitHub PR workflow testing
- Dry-run mode for validation without API costs
- **Opus 4.5 evaluation**: Automated quality assessment of translations

**Evaluation submodule** (`evaluate/`):
- Evaluates translation quality (accuracy, fluency, terminology, formatting)
- Evaluates diff quality (scope, position, structure, heading-map)
- Posts review comments directly to PRs
- Generates detailed markdown reports

**Test coverage**:
- Basic changes (intro, title, content, reordering)
- Structural changes (add/delete sections, subsections)
- Scientific content (code cells, math equations)
- Document lifecycle (create, delete, rename, multi-file)
- Edge cases (preamble-only, deep nesting, special chars, empty sections)

**Use case**: Validating changes to the action before deployment

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
# Install dependencies
npm install

# Build the action
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Project Structure

```
.
├── src/                          # Main action source code
│   ├── index.ts                  # GitHub Actions entry point
│   ├── parser.ts                 # MyST Markdown parser (section-based)
│   ├── diff-detector.ts          # Change detection (ADD/MODIFY/DELETE)
│   ├── translator.ts             # Claude API integration
│   ├── file-processor.ts         # Translation orchestration
│   ├── heading-map.ts            # Heading-map system
│   ├── language-config.ts        # Language-specific rules (v0.5.1)
│   ├── types.ts                  # TypeScript type definitions
│   └── inputs.ts                 # GitHub Actions input handling
├── docs/                         # Comprehensive documentation
├── glossary/                     # Built-in translation glossaries
│   ├── zh-cn.json                # Simplified Chinese (355 terms)
│   └── README.md                 # Glossary format and contribution guide
├── tool-bulk-translator/         # Standalone CLI for bulk translation
│   ├── src/bulk-translate.ts     # Main CLI implementation
│   ├── examples/                 # Usage examples
│   └── README.md                 # Tool documentation
├── tool-test-action-on-github/   # GitHub integration testing
│   ├── test-action-on-github.sh  # Test script (24 scenarios)
│   ├── test-action-on-github-data/  # Test fixtures
│   └── reports/                  # Opus 4.5 evaluation reports
├── examples/                     # Example workflow configurations
├── action.yml                    # GitHub Action metadata
└── package.json                  # Dependencies and scripts
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

For development guidelines, see:
- [Copilot Instructions](.github/copilot-instructions.md) - Project conventions and guidelines
- [Documentation Index](docs/INDEX.md) - Complete documentation navigation
- [Quick Start Guide](docs/QUICKSTART.md) - Developer setup

## Acknowledgements

We would like to thank the following contributors for their valuable reviews and contributions to this project:

- [@HumphreyYang](https://github.com/HumphreyYang)
- [@nisha617](https://github.com/nisha617)
