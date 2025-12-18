# tool-onboarding

CLI tool to check translation alignment between source and target repositories using a **hybrid analysis approach**: deterministic code comparison + Claude AI for prose.

## Purpose

Analyzes existing translation repositories to determine if they are ready for the `action-translation` sync workflow. Compares source documents (English) with translated documents to identify:

- ✅ **Aligned** files ready for automatic sync
- 📋 **Review** files with drift detected - needs human decision on sync direction
- 📄 **Translate** files in source only - needs translation
- 🎯 **Target-only** files to consider adding to source

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
export ANTHROPIC_API_KEY=your_api_key

node dist/index.js \
  -s /path/to/source-repo \
  -t /path/to/target-repo \
  -d lectures \
  -l zh-cn \
  -o report.md
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-s, --source <path>` | Source repository path | **required** |
| `-t, --target <path>` | Target repository path | **required** |
| `-d, --docs-folder <folder>` | Docs folder within repos | `lectures` |
| `-l, --language <code>` | Target language ISO code (zh-cn, ja, es, etc.) | `zh-cn` |
| `-m, --model <model>` | Claude model to use | `claude-sonnet-4-5-20250929` |
| `-o, --output <path>` | Output report path | (stdout) |
| `-f, --file <filename>` | Analyze only this specific file | (all files) |
| `--limit <n>` | Limit files to compare (for testing) | (all files) |

### Language Codes

| Code | Language |
|------|----------|
| `zh-cn` | Simplified Chinese |
| `zh-tw` | Traditional Chinese |
| `ja` | Japanese |
| `ko` | Korean |
| `es` | Spanish |
| `fr` | French |
| `de` | German |
| `pt-br` | Brazilian Portuguese |
| `fa` | Persian (Farsi) |

## How It Works

### Hybrid Analysis Approach

**1. Code Analysis (Deterministic)**
- Extracts `{code-cell}` and markdown code blocks
- Compares blocks by position
- Normalizes comments/strings for fair comparison
- Detects i18n-only changes (CJK font config) as acceptable

**2. Prose Analysis (Claude AI)**
- Compares section headings and prose content
- Evaluates translation accuracy
- Flags meaning changes, missing content, math errors

### Code Block Status Types

| Status | Meaning |
|--------|---------|
| 🟢 IDENTICAL | Exact match |
| 🟢 MATCH | Same after normalizing comments/strings (expected for translations) |
| 🟢 i18n | Only CJK font configuration added (expected for localization) |
| 🟡 MODIFIED | Code logic differs |
| 🔴 MISSING | Block missing in target |
| 🔵 EXTRA | Extra block in target |

### i18n Detection

These patterns are detected as i18n-only changes (counted as matched):
- Font configuration (`matplotlib`, `rcParams`, `font_manager`)
- CJK font families (`SimHei`, `SimSun`, `PingFang`, etc.)
- Unicode minus settings

## Example Output

```
🚀 Onboarding Analysis

Source: /path/to/lecture-python-intro
Target: /path/to/lecture-intro.zh-cn
Docs: lectures
Language: Simplified Chinese (zh-cn)
Model: claude-sonnet-4-5-20250929

📄 Report: onboarding-report.md

📊 Summary:
  ✅ Aligned: 45
  📋 Review: 4
  📄 Translate: 1
  🎯 Target-only: 1
```

### Code Analysis Output

```markdown
### Code Analysis (Deterministic)

**Score:** 🟢 85% | Source: 7 blocks | Target: 7 blocks

| Block | Lines | Status | Notes |
|-------|-------|--------|-------|
| 1 | 3 | 🟢 IDENTICAL | - |
| 2 | 7 | 🟢 MATCH | Comments/strings differ (translated) |
| 3 | 26 | 🟢 i18n | i18n: font_manager, CJK font |
| 4 | 27 → 28 | 🟡 MODIFIED | Function names differ |
```

## Testing

Test with a single file:
```bash
node dist/index.js -s SOURCE -t TARGET -l zh-cn -f intro.md -o test.md
```

Test with a few files:
```bash
node dist/index.js -s SOURCE -t TARGET -l zh-cn --limit 5 -o test.md
```

## Cost

Approximate cost for a typical lecture series (51 files, ~5k words each):

- **Model**: Claude Sonnet 4.5 (`claude-sonnet-4-5-20250929`)
- **Input**: ~600k tokens @ $3/MTok = **$1.80**
- **Output**: ~25k tokens @ $15/MTok = **$0.38**
- **Total**: ~**$2.20** per full analysis

Use `-f` or `--limit` to test on a subset before running full analysis.

## Architecture

Single-file implementation (`src/index.ts`, ~830 lines):

```
┌─────────────────────────────────────────────────────────────────┐
│                     tool-onboarding                             │
├─────────────────────────────────────────────────────────────────┤
│  Code Analysis (Deterministic)      │  Prose Analysis (Claude)  │
│  ─────────────────────────────────  │  ────────────────────────│
│  • Extract code blocks              │  • Section comparison     │
│  • Normalize comments/strings       │  • Translation accuracy   │
│  • Position-based comparison        │  • Math notation check    │
│  • i18n pattern detection           │  • Missing content        │
│  • Score: identical/match/modified  │  • Score: aligned/drift   │
└─────────────────────────────────────────────────────────────────┘
```

### Why Hybrid?

1. **Code requires accuracy** - Claude can hallucinate about code; deterministic comparison is 100% accurate
2. **Prose requires understanding** - Translation nuances need AI judgment
3. **Fast + Accurate** - Code analysis is instant; Claude focuses on prose only
4. **Clear reporting** - Separate sections for code and prose issues

## Output Report Format

The generated report includes:

1. **Summary table** - Counts by status
2. **File dates** - Git last-modified dates with sync direction indicators
3. **Files for review** - Action checkboxes + full analysis
4. **Aligned files** - Collapsed in `<details>`

Each file analysis includes:
- **Code Analysis**: Deterministic block comparison table
- **Prose Analysis**: Claude section-by-section review
- **Action checkboxes**: Sync from SOURCE / Backport from TARGET / Manual

## Known Limitations

### Position-Based Block Matching

Code blocks are compared by position (1st with 1st, 2nd with 2nd, etc.). If a code block is inserted mid-document in the target, all subsequent blocks will show as MODIFIED.

When this occurs, a warning is displayed:
```
> ⚠️ **Block count mismatch**: Comparison is position-based. When counts differ, blocks may be misaligned.
```

**Workaround**: Review the full file manually when block counts differ significantly.

## Development

```bash
# Build
npm run build

# Run directly with ts-node
npm run onboard -- -s SOURCE -t TARGET -l zh-cn

# Rebuild after changes
npm run build
```

## License

MIT
