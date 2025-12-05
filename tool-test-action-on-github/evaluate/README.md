# Translation Quality Evaluator

Evaluates translation PRs from action-translation test suite using Claude Opus 4.5.

## Purpose

This tool provides **automated quality assessment** of translation PRs to:
1. Validate translation accuracy, fluency, terminology, and formatting
2. Verify diff correctness (scope, position, structure, heading-map)
3. Generate comprehensive evaluation reports
4. Optionally post reviews directly to GitHub PRs

## Usage

### Prerequisites

```bash
# Install dependencies
npm install

# Set GitHub token
export GITHUB_TOKEN=$(gh auth token)
```

### Commands

```bash
# Evaluate all open PR pairs, save report only
npm run evaluate

# Evaluate and post reviews to PRs
npm run evaluate:post

# Evaluate specific PR
npm run evaluate -- --pr 530

# Save report to specific file
npm run evaluate -- --output custom-report.md

# Adjust max suggestions per PR
npm run evaluate -- --max-suggestions 10
```

## How It Works

### 1. PR Matching

The evaluator automatically matches source and target PRs:

- **Source PRs** (test-translation-sync): Test scenarios with `test-translation` label
- **Target PRs** (test-translation-sync.zh-cn): Translation PRs created by the action with `action-translation` label
- **Matching**: Parses source PR number from target PR body (`### Source PR` section)

### 2. Evaluation Process

For each PR pair:

1. **Fetch source diff**: English before/after from source PR
2. **Fetch target diff**: Chinese before/after from target PR
3. **Identify changed sections**: Which sections were modified
4. **Evaluate translation quality**: Accuracy, fluency, terminology, formatting (focused on changed sections)
5. **Evaluate diff quality**: Scope, position, structure, heading-map correctness
6. **Generate verdict**: PASS (≥8), WARN (≥6), FAIL (<6)
7. **Post review** (optional): Comment on target PR with detailed assessment

### 3. Output

**Report File** (`reports/evaluation-<date>.md`):
- Summary statistics (passed/warned/failed)
- Average scores
- Common issues
- Detailed results for each PR pair

**GitHub Review** (if `--post-reviews` enabled):
- Posted as PR review comment on target PR
- Includes scores, verdict, summary, strengths, issues, suggestions

## Review Posting: GitHub UI Behavior

**Important**: This tool uses `pulls.createReview()` which posts **PR reviews**, not regular comments.

### What This Means

| Aspect | PR Review (this tool) | Issue Comment (action reviewer) |
|--------|----------------------|--------------------------------|
| **API Method** | `pulls.createReview()` | `issues.createComment()` |
| **Appears In** | "Files changed" tab + Timeline | "Conversation" tab |
| **PR List Icon** | ❌ No conversation icon | ✅ Shows conversation icon 💬 |
| **Use Case** | Formal code review assessment | Discussion/feedback thread |
| **Update Behavior** | Creates new review each time | Can update existing comment |

### Why PR Reviews?

PR reviews are the appropriate mechanism for **formal quality assessment**:
- Structured evaluation (not a discussion)
- Appears alongside code changes
- Standard for automated review tools
- Clear separation from conversation threads

The action's reviewer uses issue comments for better visibility in PR lists, since it's meant for ongoing monitoring. The evaluator uses PR reviews since it's a one-time assessment tool.

## Configuration

Hardcoded to QuantEcon test repositories:
- Source: `QuantEcon/test-translation-sync`
- Target: `QuantEcon/test-translation-sync.zh-cn`

To use with different repositories, modify constants in `src/github.ts`:
```typescript
const SOURCE_OWNER = 'QuantEcon';
const SOURCE_REPO = 'test-translation-sync';
const TARGET_OWNER = 'QuantEcon';
const TARGET_REPO = 'test-translation-sync.zh-cn';
```

## Model

Uses **Claude Opus 4.5** (`claude-opus-4-5-20251101`) for evaluation.

Requires `ANTHROPIC_API_KEY` environment variable (automatically loaded from `.env` if present).

## Output Example

```
Evaluating: Empty sections (heading only) (24 - minimal)
  Source PR #563 → Target PR #530
  Changed sections: ## Microeconomics, ## Macroeconomics, ...
  Evaluating translation quality...
  Evaluating diff quality...
  Posting review to PR...
  PASS: Translation 9.4/10, Diff 10/10
```

## Related Tools

- **Action Reviewer** (`src/reviewer.ts`): Built-in review mode in the action itself
- **Test Script** (`tool-test-action-on-github.sh`): Creates test PRs for evaluation
- **Bulk Translator** (`tool-bulk-translator/`): One-time bulk translation tool

## Development

```bash
# Build TypeScript
npm run build

# Run directly with tsx (no build needed)
npm run evaluate
```

## See Also

- Main documentation: `../../docs/TEST-REPOSITORIES.md`
- Test plan: `../../TEST_PLAN_v0.7.0.md`
- Test script: `../test-action-on-github.sh`
