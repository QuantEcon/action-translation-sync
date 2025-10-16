# Translation Sync Action

A GitHub Action that automatically synchronizes translations across repositories using Claude Sonnet 4.5.

## Overview

This action monitors a source repository for merged pull requests and automatically translates changed MyST Markdown files to a target repository, creating pull requests for review.

## Features

- **Intelligent Diff Translation**: Only translates changed sections, preserving existing translations
- **Full File Translation**: Handles new files with complete translation
- **MyST Markdown Support**: Preserves code blocks, math equations, and MyST directives
- **Glossary Support**: Use custom terminology glossaries for consistent translations
- **Automatic TOC Updates**: Updates `_toc.yml` when new files are added
- **PR-Based Workflow**: All translations go through pull request review

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
| `target-language` | Yes | - | Target language code (e.g., `zh-cn`) |
| `docs-folder` | No | `lectures/` | Documentation folder to monitor |
| `source-language` | No | `en` | Source language code |
| `glossary-path` | No | - | Path to **custom** glossary (built-in glossary used by default) |
| `toc-file` | No | `_toc.yml` | Table of contents file name |
| `anthropic-api-key` | Yes | - | Anthropic API key for Claude |
| `claude-model` | No | `claude-sonnet-4-20250514` | Claude model to use for translation |
| `github-token` | Yes | - | GitHub token for API access |
| `pr-labels` | No | `translation-sync,automated` | Comma-separated PR labels |
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
- **`glossary/zh-cn.json`** - Simplified Chinese (342 terms) ✅
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
4. **Translation**: Uses Claude Sonnet 4.5 with glossary support
5. **Validation**: Verifies MyST syntax of translated content
6. **PR Creation**: Opens a pull request in the target repository
7. **Review**: Team reviews and merges the translation

## Documentation

For comprehensive documentation, see the [`docs/`](docs/) directory:

- **[Getting Started](docs/QUICKSTART.md)** - Quick setup and development guide
- **[Project Design](docs/PROJECT-DESIGN.md)** - Architecture and design decisions
- **[Architecture](docs/ARCHITECTURE.md)** - System diagrams and data flow
- **[Implementation](docs/IMPLEMENTATION.md)** - What's been built and how it works
- **[Status Report](docs/STATUS-REPORT.md)** - Current project status and metrics
- **[TODO](docs/TODO.md)** - Development roadmap and tasks
- **[Documentation Index](docs/INDEX.md)** - Complete documentation navigation

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
├── docs/                  # Documentation
├── src/                   # Source code
│   ├── index.ts           # Main entry point
│   ├── types.ts           # Type definitions
│   ├── inputs.ts          # Input handling
│   ├── parser.ts          # MyST parser
│   ├── diff-detector.ts   # Change detection
│   ├── translator.ts      # Translation service
│   └── file-processor.ts  # File processing orchestration
├── examples/              # Example configurations
├── action.yml             # Action metadata
├── package.json
└── tsconfig.json
```

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

For development guidelines, see:
- [Copilot Instructions](.github/copilot-instructions.md) - Project conventions and guidelines
- [Documentation Index](docs/INDEX.md) - Complete documentation navigation
- [Quick Start Guide](docs/QUICKSTART.md) - Developer setup
