# Translation Action

A GitHub Action that automatically synchronizes and reviews translations across repositories using Claude AI.

**Version**: v0.7.0 | **Status**: Testing & Development ✅

## Overview

This action provides two modes for managing translations of MyST Markdown files:

1. **Sync Mode**: Monitors a source repository for merged pull requests and automatically translates changed files to a target repository, creating pull requests for review.

2. **Review Mode**: Provides AI-powered quality assessment of translation PRs, posting detailed review comments with scores and suggestions.

**Key Features**:
- 🌍 **Language-Extensible**: Easy configuration for multiple target languages
- 🗺️ **Heading-Map System**: Robust cross-language section matching
- 🔄 **Intelligent Diff Translation**: Only translates changed sections
- 📝 **AI-Powered Review**: Automated quality assessment of translations
- ✍️ **MyST Markdown Support**: Preserves code blocks, math equations, and directives
- 📚 **Glossary Support**: Built-in glossaries for consistent terminology
- ✅ **Extensively Tested**: 183 unit tests passing, 24 GitHub integration scenarios

## Features

- 🌍 **Language Configuration** (v0.5.1): Extensible system for language-specific rules (punctuation, typography)
- 📝 **Review Mode** (v0.7.0): AI-powered translation quality assessment with scoring and suggestions
- ✅ **Input Validation** (v0.6.0): Validates language codes and Claude model names with helpful error messages
- 🗺️ **Heading-Map System**: Robust cross-language section matching that survives reordering
- 🔄 **Intelligent Diff Translation**: Only translates changed sections, preserving existing translations
- 📄 **Full File Translation**: Handles new files with complete translation
- ✍️ **MyST Markdown Support**: Preserves code blocks, math equations, and MyST directives
- 📚 **Glossary Support**: Built-in glossaries for consistent technical terminology (357 terms for zh-cn, fa)
- 📑 **Automatic TOC Updates**: Updates `_toc.yml` when new files are added
- 🔍 **PR-Based Workflow**: All translations go through pull request review
- ♻️ **Recursive Subsections**: Full support for nested headings at any depth (##-######)

## Usage

### Sync Mode (Source Repository)

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
      - uses: quantecon/action-translation@v0.7
        with:
          mode: sync  # Default mode
          target-repo: 'quantecon/lecture-python.zh-cn'
          target-language: 'zh-cn'
          docs-folder: 'lectures/'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          # Optional: Request reviewers for translation PRs
          pr-reviewers: 'username1,username2'
          pr-labels: 'translation,automated,needs-review'
```

### Review Mode (Target Repository)

Add this workflow to your target (translation) repository (e.g., `.github/workflows/review-translations.yml`):

```yaml
name: Review Translations

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    # Only review PRs created by the sync action
    if: contains(github.event.pull_request.labels.*.name, 'action-translation')
    runs-on: ubuntu-latest
    
    steps:
      - uses: quantecon/action-translation@v0.7
        with:
          mode: review
          source-repo: 'quantecon/lecture-python'
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          max-suggestions: 5  # Optional, default is 5
```

### Inputs

#### Mode Selection

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `mode` | **Yes** | - | Operation mode: `sync` or `review` |

#### Sync Mode Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `target-repo` | Yes* | - | Target repository (format: `owner/repo`) |
| `target-language` | Yes* | - | Target language code (e.g., `zh-cn`, `fa`) |
| `docs-folder` | No | `lectures/` | Documentation folder to monitor |
| `source-language` | No | `en` | Source language code |
| `pr-labels` | No | `action-translation,automated` | Comma-separated PR labels |
| `pr-reviewers` | No | - | Comma-separated GitHub usernames |
| `pr-team-reviewers` | No | - | Comma-separated GitHub team slugs |

*Required when `mode: sync`

#### Review Mode Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `source-repo` | Yes** | - | Source repository for English content (format: `owner/repo`) |
| `max-suggestions` | No | `5` | Maximum improvement suggestions in review |

**Required when `mode: review`

#### Shared Inputs

| Input | Required | Default | Description |
|-------|----------|---------|-------------|
| `anthropic-api-key` | Yes | - | Anthropic API key for Claude |
| `claude-model` | No | `claude-sonnet-4-5-20250929` | Claude model to use |
| `github-token` | Yes | - | GitHub token for API access |
| `glossary-path` | No | - | Path to custom glossary (built-in used by default) |

### Outputs

#### Sync Mode Outputs

| Output | Description |
|--------|-------------|
| `pr-url` | URL of the created pull request |
| `files-synced` | Number of files synchronized |

#### Review Mode Outputs

| Output | Description |
|--------|-------------|
| `review-verdict` | Review verdict: `PASS`, `WARN`, or `FAIL` |
| `translation-score` | Overall translation quality score (1-10) |
| `diff-score` | Diff quality score (1-10) |

## Glossary Format

The action includes **built-in glossaries** for consistent translation across all QuantEcon lectures.

**Location**: `glossary/{language}.json`

Current glossaries:
- **`glossary/zh-cn.json`** - Simplified Chinese (357 terms) ✅
- **`glossary/fa.json`** - Persian/Farsi (357 terms) ✅
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
9. **Review**: Team reviews and merges the translation (optionally with AI review)

### Review Mode Process

1. **Trigger**: Activates when a translation PR is opened/updated
2. **Content Fetch**: Retrieves source (English) and target (translation) content
3. **Change Detection**: Identifies which sections were changed
4. **Quality Evaluation**: Claude evaluates translation quality (accuracy, fluency, terminology, formatting)
5. **Diff Evaluation**: Verifies changes are in correct locations with proper structure
6. **Review Comment**: Posts detailed review with scores, strengths, and suggestions

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
- **[Future Features](docs/PLAN-FUTURE-FEATURES.md)** - Roadmap: resync tools, multi-language architecture, bidirectional suggestions
- **[CHANGELOG](CHANGELOG.md)** - Version history and current status
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

### 3. Translation Benchmark Tool (Planned)

**Purpose**: Multi-model translation quality benchmarking and dataset development

📊 **[tool-benchmark/](tool-benchmark/)** - *Planned*

**Project Plan**: See [docs/projects/PROJECT-BENCHMARK.md](docs/projects/PROJECT-BENCHMARK.md)

**Goals**:
- Build gold-standard EN-ZH translation dataset (1000+ terms, 500+ sentences, 100+ paragraphs)
- Benchmark translation quality across LLM providers (Claude, GPT, Gemini)
- Use automatic metrics (COMET, XCOMET, BLEU) alongside human evaluation
- Create GitHub Pages dashboard for benchmark visualization
- Feed insights back into action-translation prompt optimization

**Collaboration**: Xiamen University RA Group

**Differentiation from existing benchmarks** (WMT, XTREME, OPUS):
- Domain-specific: Economics + mathematics terminology
- Format-aware: MyST Markdown with code/math preservation
- Expert-validated: Economics PhD/graduate students
- Integration: Direct feedback loop to improve this action

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
│   ├── index.ts                  # GitHub Actions entry point (mode routing)
│   ├── parser.ts                 # MyST Markdown parser (section-based)
│   ├── diff-detector.ts          # Change detection (ADD/MODIFY/DELETE)
│   ├── translator.ts             # Claude API integration (sync mode)
│   ├── reviewer.ts               # Claude API integration (review mode)
│   ├── file-processor.ts         # Translation orchestration
│   ├── heading-map.ts            # Heading-map system
│   ├── language-config.ts        # Language-specific rules (v0.5.1)
│   ├── types.ts                  # TypeScript type definitions
│   └── inputs.ts                 # GitHub Actions input handling
├── docs/                         # Comprehensive documentation
├── glossary/                     # Built-in translation glossaries
│   ├── zh-cn.json                # Simplified Chinese (357 terms)
│   ├── fa.json                   # Persian/Farsi (357 terms)
│   └── README.md                 # Glossary format and contribution guide
├── tool-bulk-translator/         # Standalone CLI for bulk translation
│   ├── src/bulk-translate.ts     # Main CLI implementation
│   ├── examples/                 # Usage examples
│   └── README.md                 # Tool documentation
├── tool-test-action-on-github/   # GitHub integration testing
│   ├── test-action-on-github.sh  # Test script (24 scenarios)
│   ├── test-action-on-github-data/  # Test fixtures
│   └── reports/                  # Quality evaluation reports
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
