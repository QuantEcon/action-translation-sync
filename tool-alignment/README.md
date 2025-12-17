# Tool: Alignment Diagnostic

A CLI tool for analyzing structural alignment, code block integrity, and translation quality between source and target translation repositories.

## Purpose

This tool helps with:
1. **Initial Alignment** - Onboarding existing translation repos to automated sync
2. **Resync** - Detecting divergence between repos over time
3. **Code Block Integrity** - Verifying that code blocks match between source and target
4. **Translation Quality** - AI-powered assessment of translation accuracy and fluency

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

### Translation Quality Assessment (Phase 2)
- Per-section quality scoring using Claude AI
- Multi-model support: Haiku 3.5, Haiku 4.5, Sonnet 4.5
- Scores: accuracy, fluency, terminology, completeness
- Glossary support for consistent terminology checking
- Actionable recommendations (Retranslate / Review / OK)

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

### Quality Assessment

Quality assessment requires a structure report first, then assesses translation quality for aligned files:

```bash
# Step 1: Generate structure report
npm run diagnose -- \
  --source ~/repos/lecture-python-intro \
  --target ~/repos/lecture-intro.zh-cn \
  --output reports/lecture-intro \
  --report structure

# Step 2: Run quality assessment
npm run diagnose -- assess reports/lecture-intro-structure.md \
  --source ~/repos/lecture-python-intro \
  --target ~/repos/lecture-intro.zh-cn \
  --target-language zh-cn \
  --glossary ../glossary/zh-cn.json \
  --model haiku3_5 \
  -y  # Skip cost confirmation
```

#### Quality Assessment Options

| Option | Description | Default |
|--------|-------------|---------|
| `--source, -s` | Path to source repository | Required |
| `--target, -t` | Path to target repository | Required |
| `--target-language` | Target language code (e.g., `zh-cn`) | Required |
| `--glossary, -g` | Path to glossary JSON file | Optional |
| `--model, -m` | Model: `haiku3_5`, `haiku4_5`, `sonnet4_5` | `haiku3_5` |
| `--yes, -y` | Skip cost confirmation prompt | `false` |
| `--dry-run` | Show cost estimate without running | `false` |

#### Model Comparison

| Model | Cost (233 sections) | Speed | Notes |
|-------|---------------------|-------|-------|
| `haiku3_5` | ~$0.50 | Fast | Cost-effective, good accuracy |
| `haiku4_5` | ~$2.00 | Medium | Better detail |
| `sonnet4_5` | ~$6.00 | Slower | Most detailed notes |

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

3. **Quality Report** (`*-quality-{model}.md`)
   - Overall quality score
   - Files requiring attention with recommendations
   - Per-section scores (accuracy, fluency, terminology, completeness)
   - Flagged section details with AI assessment notes

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

**Quality Score** (0-100%):
- 🟢 90-100% - Excellent (no action needed)
- 🟡 80-89% - Good/Acceptable (no action needed)
- 🟠 50-79% - Needs Improvement (flagged for review)
- 🔴 <50% - Poor (recommend retranslation)

### Quality Recommendations

Based on file-level quality scores:
- **🔴 Retranslate** - Score < 60%
- **🟠 Review all sections** - Score 60-70%
- **🟡 Review flagged sections** - Score 70-80% or >50% sections flagged
- **✓ Minor issues only** - Score ≥ 80%

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
