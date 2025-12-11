# Tool: Alignment Diagnostic

A CLI tool for analyzing alignment between source and target translation repositories.

## Purpose

This tool helps with:
1. **Initial Alignment** - Onboarding existing translation repos to automated sync
2. **Resync** - Detecting divergence between repos over time

## Installation

```bash
cd tool-alignment
npm install
npm run build
```

## Usage

### Structural Diagnostics

Analyze structural alignment between source and target repos:

```bash
# Using local paths
npm run diagnose -- \
  --source ../test-translation-sync \
  --target ../test-translation-sync.zh-cn \
  --output reports/diagnostic-report.md

# With JSON output
npm run diagnose -- \
  --source /path/to/lecture-intro \
  --target /path/to/lecture-intro.zh-cn \
  --output reports/alignment.json \
  --format json

# Both formats
npm run diagnose -- \
  --source /path/to/source-repo \
  --target /path/to/target-repo \
  --output reports/alignment \
  --format both
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source, -s` | Path to source repository | Required |
| `--target, -t` | Path to target repository | Required |
| `--output, -o` | Output file path | `./reports/diagnostic-report` |
| `--format, -f` | Output format: `markdown`, `json`, `both` | `markdown` |
| `--docs-folder` | Subdirectory containing docs | `.` (root) |

## Output

### Diagnostic Report

The tool generates a report showing:

- **File Inventory**: All markdown and config files in both repos
- **Structural Analysis**: Section counts, heading hierarchy, code/math blocks
- **Alignment Classification**: 
  - `aligned` - Structure matches, ready for sync
  - `likely-aligned` - Structure matches with minor differences
  - `needs-review` - Structure differs, needs attention
  - `diverged` - Major mismatch
  - `missing` - File doesn't exist in target

### Config File Analysis

Also analyzes:
- `_toc.yml` - Table of contents structure
- `_config.yml` - Jupyter Book configuration
- `environment.yml` (optional) - Conda environment

## Development

```bash
# Run tests
npm test

# Build
npm run build
```

## Related

- [PLAN_RESYNC_INIT.md](../PLAN_RESYNC_INIT.md) - Implementation plan
- [tool-bulk-translator](../tool-bulk-translator/) - Bulk translation tool
