# Tool: Alignment Diagnostic

A CLI tool for analyzing structural alignment and code block integrity between source and target translation repositories.

## Purpose

This tool helps with:
1. **Initial Alignment** - Onboarding existing translation repos to automated sync
2. **Resync** - Detecting divergence between repos over time
3. **Code Block Integrity** - Verifying that code blocks match between source and target

## Features

### Structure Analysis
- Section and subsection comparison
- Heading map detection
- Config file comparison (`_toc.yml`, `_config.yml`)

### Code Block Integrity (Phase 1b)
- Extracts code blocks from `{code-cell}` and standard markdown blocks
- **Normalized comparison**: compares code logic, not comments/strings
- Supports Python, JavaScript, Julia, R, and more
- Detects localization patterns (CJK fonts, etc.)
- Generates detailed diffs showing actual code changes

### Normalization
Code blocks are normalized before comparison to filter out expected translation differences:
- Comments → `# << COMMENT >>`
- Strings → `"<< STRING >>"`
- Captions → `caption: << CAPTION >>`

This means only actual code logic changes are flagged as modifications.

## Installation

```bash
cd tool-alignment
npm install
npm run build
```

## Usage

### Basic Usage

```bash
# Generate all reports (structure + code)
npm run diagnose -- \
  --source ~/repos/lecture-python-intro \
  --target ~/repos/lecture-intro.zh-cn \
  --output reports/lecture-intro

# Structure report only
npm run diagnose -- -s ~/repos/source -t ~/repos/target -o reports/output -r structure

# Code report only
npm run diagnose -- -s ~/repos/source -t ~/repos/target -o reports/output -r code
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source, -s` | Path to source repository | Required |
| `--target, -t` | Path to target repository | Required |
| `--output, -o` | Output file path | `./reports/diagnostic-report` |
| `--format, -f` | Output format: `markdown`, `json`, `both` | `markdown` |
| `--report, -r` | Report type: `all`, `structure`, `code` | `all` |
| `--docs-folder, -d` | Subdirectory containing docs | `lectures` |
| `--max-diff-lines` | Max lines to show in diffs | `50` |

## Output

### Report Types

The tool generates two separate reports:

1. **Structure Report** (`*-structure.md`)
   - Alignment status per file
   - Section/subsection counts
   - Heading map status
   - Config file analysis
   - Recommendations

2. **Code Report** (`*-code.md`)
   - Code block integrity scores
   - Summary table with match statistics
   - Localization pattern detection
   - Detailed diffs for modified blocks

### Scoring

**Structure Score** (0-100%):
- `aligned` = 100% (perfect match)
- `likely-aligned` = 85-99%
- `needs-review` = 55-84%
- `diverged` = <55%

**Code Integrity Score** (0-100%):
- ✅ 100% - All blocks match
- 🟨 90-99% - Minor differences
- 🟡 80-89% - Some modifications
- 🟠 60-79% - Significant differences
- 🔴 <60% - Major divergence

### Code Block Classification

| Type | Description |
|------|-------------|
| `identical` | Exact character match |
| `normalized-match` | Same after normalizing strings/comments |
| `modified` | Code logic differs |
| `missing` | Block in source, not in target |
| `extra` | Block in target, not in source |

## Development

```bash
# Run tests
npm test

# Build
npm run build

# Run directly
npx ts-node src/index.ts diagnose -s /path/to/source -t /path/to/target -o reports/test
```

## Related

- [PLAN_RESYNC_INIT.md](../PLAN_RESYNC_INIT.md) - Implementation plan
- [tool-bulk-translator](../tool-bulk-translator/) - Bulk translation tool
