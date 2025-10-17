# Translation Syncing Action - Design Document

## Overview

A GitHub Action that automatically synchronizes changes from a source repository to translated versions in target repositories. The action monitors merged pull requests, translates the changes using Claude Sonnet 4.5, and creates pull requests in the target repository with the translated content.

### Example Use Case

Monitor the QuantEcon lecture repository English language version:
- Source: [lecture-python.myst](https://github.com/quantecon/lecture-python.myst)
- Target: [lecture-python.zh-cn](https://github.com/quantecon/lecture-python.zh-cn)

## Core Design Philosophy: Simplicity & Maintainability

**Priority #1**: Keep the codebase simple and easy to maintain.

- Favor straightforward solutions over clever optimizations
- Write clear, readable code with descriptive names
- Avoid over-engineering and premature optimization
- Keep functions small and focused
- Minimize dependencies
- Document WHY, not just WHAT

## Why Section-Based Translation?

### The Problem with Block-Based Approaches

Initial attempts used fine-grained block parsing (paragraphs, lists, code blocks, etc.). This approach had several issues:

1. **Complex Matching**: Matching individual blocks across languages is error-prone
2. **Fragmented Context**: Translating paragraphs in isolation loses narrative flow
3. **Code Complexity**: AST parsing and block reconstruction added 1000+ lines
4. **Bundle Bloat**: Dependencies like `unified` and `remark` added 700kB

### The Section-Based Solution

We switched to translating entire `## Section` blocks:

1. **Robust Position Matching**: 1st section → 1st section (language-independent)
2. **Full Context**: Translator sees complete section narrative
3. **Simple Parsing**: Line-by-line split on `##` (no AST needed)
4. **Better Translations**: Claude gets full context, produces coherent prose

**Result**: 43% less code, 28% smaller bundle, better translations.

## Workflow

1. **Trigger**: When a PR is merged in the source repository (e.g., `lecture-python.myst`)
2. **Detection**: Identify which files were changed in the merged PR (e.g., `lectures/aiyagari.md`)
3. **Processing**: For each changed file:
   - If file exists in target: Detect section changes (added, modified, deleted)
   - If file is new: Translate entire file
4. **Translation**: Use Claude Sonnet 4.5 with UPDATE or NEW mode
5. **Submission**: Create a PR in the target repository with translations
6. **Review**: All translations go through PR review before merging

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────┐
│   PR Merged Event (Source Repo)        │
│   - Verify PR was merged (not closed)   │
│   - Get list of changed *.md files      │
│   - Filter by docs folder pattern       │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   For Each Changed File                 │
│                                         │
│   ┌─────────────────────────────────┐  │
│   │ Check: File exists in target?   │  │
│   └─────────┬───────────────────────┘  │
│             │                           │
│    ┌────────┴────────┐                 │
│    │                 │                 │
│   YES               NO                 │
│    │                 │                 │
│    ▼                 ▼                 │
│ SECTION MODE     FULL MODE             │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   SECTION MODE: Incremental Changes    │
│   1. Parse old & new English into ##    │
│   2. Detect section changes              │
│   3. Parse target file into sections     │
│   4. For ADDED: translateNewSection()   │
│   5. For MODIFIED: translateSection()   │
│      (provides old EN + new EN + CN)    │
│   6. For DELETED: remove section        │
│   7. Reconstruct document               │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   FULL MODE: Complete Translation       │
│   1. Translate entire file              │
│   2. Create new file in target repo     │
│   3. Parse _toc.yml structure           │
│   4. Insert entry at matching position  │
│   5. Validate TOC syntax                │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   Create PR in Target Repository        │
│   - Branch: translation-sync-{sha}      │
│   - Title: "Sync: [files] from PR #{n}" │
│   - Body: Links + change summary        │
│   - Labels: translation-sync            │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   Result Handling                       │
│   - Success: Comment on source PR       │
│   - Failure: Fail workflow & log error  │
└─────────────────────────────────────────┘
```

## Core Components

### 1. Section Parser (172 lines)

Simple line-by-line parser that splits documents on `## Heading` markers.

**Key Features**:
- Splits on `##` level-2 headings (lectures use level-2 for main sections)
- Handles `###` subsections within each `##` section
- Generates heading IDs for cross-references
- No AST parsing needed (no `unified` or `remark` dependencies)

**Example**:
```markdown
# Lecture Title

## Introduction
This is the intro.

### Background
Some context here.

## Main Theory
The core content.
```

Parsed into:
```typescript
[
  {
    heading: "Introduction",
    level: 2,
    id: "introduction",
    content: "This is the intro.\n\n### Background\nSome context here.",
    subsections: ["Background"]
  },
  {
    heading: "Main Theory",
    level: 2,
    id: "main-theory",
    content: "The core content.",
    subsections: []
  }
]
```

### 2. Diff Detector (178 lines)

Detects section-level changes between old and new English versions.

**Matching Strategy**:
1. **Position Match**: Try matching section at index i → index i
2. **ID Match**: Fallback to matching by heading ID
3. **Structural Check**: Compare level and subsection count

**Change Types**:
- **ADDED**: New section inserted
- **MODIFIED**: Section content changed (detected via length or code block count)
- **DELETED**: Section removed

**Why Position Matching Works**:
- In typical edits, most sections stay in the same position
- Adding "## Economic Models" as 3rd section → 3rd section in Chinese
- Language-independent (doesn't rely on heading text)
- Simple and reliable

### 3. Translation Service (257 lines)

Uses Claude Sonnet 4.5 (`claude-sonnet-4.5-20241022`) with two modes:

#### UPDATE Mode (for MODIFIED sections)

Provides Claude with:
- **Old English**: Original section content
- **New English**: Updated section content
- **Current Translation**: Existing Chinese translation

Claude updates the translation to match the new English while preserving style.

**Example Prompt**:
```
You are updating a Chinese translation to reflect changes in the English source.

OLD ENGLISH:
## Introduction
This lecture covers dynamic programming.

NEW ENGLISH:
## Introduction
This lecture covers dynamic programming and optimal control.

CURRENT CHINESE:
## 介绍
本讲座涵盖动态规划。

Provide the UPDATED CHINESE translation reflecting the changes.
```

#### NEW Mode (for ADDED sections)

Translates a complete new section from scratch.

**Example Prompt**:
```
Translate this English section to Chinese.

ENGLISH:
## Economic Models
We examine household optimization problems.

GLOSSARY:
- household: 家庭
- optimization: 优化

Provide the complete Chinese translation.
```

### 4. File Processor (244 lines)

Orchestrates the translation workflow:

1. **Detect Changes**: Use diff detector on old/new English
2. **Parse Target**: Split current Chinese translation into sections
3. **Process Each Change**:
   - **ADDED**: Translate with NEW mode, insert at position
   - **MODIFIED**: Translate with UPDATE mode, replace section
   - **DELETED**: Remove from array
4. **Reconstruct**: Join sections with `\n\n`, trim whitespace
5. **Validate**: Check MyST syntax

**Position-Based Insertion**:
```typescript
// If "## Economic Models" is added as 3rd section in English:
// 1. Translate the new section
// 2. Insert at index 2 in Chinese sections array
// 3. Result: 3rd section in Chinese matches 3rd section in English
```

## Design Solutions to Key Challenges

### Challenge 1: Preventing Unwanted Translation Changes

**Solution**: Section-based UPDATE mode
- Only translate sections that actually changed in English
- Provide Claude with old EN + new EN + current CN
- Preserves style and terminology of unchanged sections
- No modifications to unaffected sections

### Challenge 2: Cross-Language Structural Matching

**Solution**: Position-based matching
- Language-independent (no heading text comparison needed)
- Robust to translation differences ("Introduction" vs "介绍")
- Simple index matching: sections[i] → sections[i]
- Fallback to ID matching if positions shift

### Challenge 3: Translation Context

**Solution**: Full section translation
- Claude sees complete section narrative (not isolated paragraphs)
- Better coherence and flow
- Subsections provide context for main section
- Glossary terms available throughout

### Challenge 4: Code Complexity

**Solution**: Simplicity over flexibility
- No AST parsing (700kB of dependencies removed)
- Line-by-line parsing sufficient for `##` splits
- Position matching simpler than ID/structural matching
- Straight-line control flow (no complex recursion)

### Challenge 5: Ensuring Translation Quality

**Solution**: Multiple safeguards
- Glossary for consistent terminology
- Full section context for accurate translation
- MyST validation after translation
- Human PR review before merging
- Workflow fails if translation errors occur

## Error Handling

### Translation Failures

If Claude API fails or returns invalid content:
1. Log detailed error with file and reason
2. Fail the GitHub Action workflow
3. Do not create a PR with broken content
4. Optionally create an issue in target repo for tracking

### Section Matching Failures

If section count drastically changes (major restructuring):
1. Position matching continues to work (insert/delete operations)
2. ID matching provides fallback
3. Worst case: Flag for manual review in PR body

### Validation Failures

After applying translations:
1. Validate MyST syntax
2. Check for unintended deletions
3. Verify change size is reasonable
4. Fail workflow if validation fails

## Configuration

### Action Configuration (placed in source repository)

```yaml
# .github/workflows/sync-translations.yml
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
          # Target repository
          target-repo: 'quantecon/lecture-python.zh-cn'
          target-language: 'zh-cn'
          
          # Source settings
          docs-folder: 'lectures/'
          source-language: 'en'
          
          # Translation settings
          glossary-path: 'glossary/zh-cn.json'
          toc-file: '_toc.yml'
          
          # API keys
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
          # PR settings
          pr-labels: 'translation-sync,automated'
          pr-reviewers: 'translation-team'
```

### Glossary Format

```json
{
  "version": "1.0",
  "targetLanguage": "zh-cn",
  "terms": {
    "household": "家庭",
    "equilibrium": "均衡",
    "steady state": "稳态",
    "dynamic programming": "动态规划"
  }
}
```

## Requirements & Assumptions

### Requirements

1. Source repository uses MyST Markdown format
2. Main sections use `## Level-2 Headings`
3. PR merge triggers the action (not individual commits)
4. All translations require PR review before merging
5. Action must fail gracefully on errors (no partial updates)

### Assumptions

1. Source and target filenames are identical (1:1 mapping)
2. Target repository has similar directory structure
3. Both repositories use `_toc.yml` for table of contents
4. Code blocks, math equations, and MyST directives should not be translated
5. Section order is generally stable (allows position matching)

## Implementation Status

### Completed Features

- ✅ PR merge detection and file change tracking
- ✅ Section-based MyST parser (172 lines)
- ✅ Section-level diff detection (178 lines)
- ✅ Position-based section matching
- ✅ Claude Sonnet 4.5 integration (257 lines)
- ✅ Glossary support (342 terms for zh-cn)
- ✅ UPDATE and NEW translation modes
- ✅ Section-based file reconstruction (244 lines)
- ✅ PR creation in target repository
- ✅ Error handling and workflow failures
- ✅ MyST validation

### Future Enhancements

- [ ] TOC management for new files
- [ ] Multi-language support (ja, es)
- [ ] Translation confidence scoring
- [ ] Automated issue creation for failures
- [ ] Translation quality metrics
- [ ] Preview/dry-run mode

## Key Metrics

**Code Reduction** (block-based → section-based):
- Total: 1586 → 976 lines (43% reduction)
- parser.ts: 390 → 172 lines
- diff-detector.ts: 538 → 178 lines
- translator.ts: 233 → 257 lines
- file-processor.ts: 425 → 244 lines

**Bundle Size**:
- Before: 2492kB
- After: 1794kB (28% reduction)

**Dependencies Removed**:
- unified ecosystem (~700kB)
- Complex AST parsing
- Backward compatibility code

## Design Principles

1. **Simplicity First**: Simple code is maintainable code
2. **No Premature Optimization**: Get it right before making it fast
3. **Clear Over Clever**: Future you will thank present you
4. **Test As You Go**: But keep tests simple too
5. **Document WHY**: Explain reasoning, not just what the code does

## Version Strategy

**Current: v0.1.x** (Development)
- Breaking changes freely allowed
- API stability not guaranteed
- Focus on getting the core right

**Future: v1.0** (Production)
- Breaking changes avoided
- API stability guaranteed
- Comprehensive automated tests

---

When in doubt, ask: **"Is this the simplest solution that could work?"**

If yes, do it. If no, simplify.
