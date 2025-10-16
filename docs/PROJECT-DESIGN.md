# Translation Syncing Action - Design Document

## Overview

A GitHub Action that automatically synchronizes changes from a source repository to translated versions in target repositories. The action monitors merged pull requests, translates the changes using Claude Sonnet 4.5, and creates pull requests in the target repository with the translated content.

### Example Use Case

Monitor the QuantEcon lecture repository English language version:
- Source: [lecture-python.myst](https://github.com/quantecon/lecture-python.myst)
- Target: [lecture-python.zh-cn](https://github.com/quantecon/lecture-python.zh-cn)

## Workflow

1. **Trigger**: When a PR is merged in the source repository (e.g., `lecture-python.myst`)
2. **Detection**: Identify which files were changed in the merged PR (e.g., `lectures/aiyagari.md`)
3. **Processing**: For each changed file:
   - If file exists in target: Translate only the diff (changed sections)
   - If file is new: Translate entire file and update `_toc.yml`
4. **Submission**: Create a PR in the target repository with translated changes
5. **Review**: All translations go through PR review before merging

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
│  DIFF MODE      FULL MODE              │
└─────────────┬───────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────┐
│   DIFF MODE: Incremental Translation    │
│   1. Parse old & new English versions   │
│   2. Identify changed blocks            │
│   3. Map to target file structure       │
│   4. Translate only changed blocks      │
│   5. Apply translations to target       │
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

### 1. Diff Translation Engine

The key innovation is translating **only the changes**, not the entire file. This prevents unwanted modifications to existing translations.

#### Block-Based Parsing

Parse MyST Markdown into semantic blocks:

```typescript
interface Block {
  type: 'heading' | 'paragraph' | 'code' | 'list' | 'math' | 'directive';
  content: string;
  id?: string;              // For headings (anchor)
  parentHeading?: string;   // Structural context
  startLine: number;
  endLine: number;
  language?: string;        // For code blocks
}
```

#### Change Detection

Compare old and new English versions to identify:
- **Modified blocks**: Content changed
- **Added blocks**: New content inserted
- **Deleted blocks**: Content removed

Use structural matching (heading IDs, parent sections, relative positions) rather than line numbers.

#### Target Mapping

Map each changed block to its corresponding location in the target (translated) file:

1. **Structural alignment**: Match by heading anchors and parent sections
2. **Relative positioning**: Use block order within sections
3. **Fuzzy matching**: Fallback for edge cases (with confidence threshold)

#### Translation Application

Reconstruct target file with translations applied:
- Replace matched blocks with translated content
- Insert new blocks at correct positions
- Remove deleted blocks
- Preserve all unchanged content

### 2. Translation Service

#### Prompt Strategy for Diff Mode

```
You are translating changes from {source-language} to {target-language} for technical documentation.

CRITICAL RULES:
1. ONLY translate the sections marked as [CHANGED]
2. DO NOT modify sections marked as [CONTEXT]
3. Maintain exact MyST Markdown formatting
4. Preserve all code blocks, math equations, and directives unchanged
5. Use the provided glossary for consistent terminology

GLOSSARY:
{glossary-terms}

[CONTEXT - for reference only]
{context-before}
[/CONTEXT]

[CHANGED - translate this section]
{block-to-translate}
[/CHANGED]

[CONTEXT - for reference only]
{context-after}
[/CONTEXT]

Provide ONLY the translated version of the [CHANGED] section.
Do not include any explanations or markers.
```

#### Prompt Strategy for Full Mode

```
You are translating a complete technical lecture from {source-language} to {target-language}.

RULES:
1. Translate all prose content
2. Preserve all MyST Markdown directives and structure exactly
3. DO NOT translate code blocks (keep code as-is)
4. DO NOT translate mathematical equations (keep LaTeX as-is)
5. DO NOT translate URLs, file paths, or technical identifiers
6. Use the provided glossary for consistent terminology
7. Maintain the exact same heading structure and anchors

GLOSSARY:
{glossary-terms}

CONTENT:
{full-content}

Provide the complete translated document maintaining exact MyST structure.
```

### 3. TOC Manager

For new files, automatically update the target repository's `_toc.yml`:

1. **Parse**: Read and parse existing TOC structure
2. **Locate**: Find the corresponding position (match to source repo TOC)
3. **Insert**: Add new entry at the correct location
4. **Validate**: Ensure YAML is valid after modification

### 4. Configuration

#### Action Configuration (placed in source repository)

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
          glossary-path: '.github/translation-glossary.json'
          toc-file: '_toc.yml'
          
          # API keys
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
          
          # PR settings
          pr-labels: 'translation-sync,automated'
          pr-reviewers: 'translation-team'
```

#### Glossary Format

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
    },
    {
      "en": "steady state",
      "zh-cn": "稳态"
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

## Design Solutions to Key Challenges

### Challenge 1: Preventing Unwanted Translation Changes

**Solution**: Block-based diff translation
- Only translate blocks that actually changed in English
- Use structural mapping to locate exact sections in target
- Preserve all unchanged content byte-for-byte

### Challenge 2: Handling New Files

**Solution**: Dual-mode operation
- Detect if file exists in target repository
- Use full translation mode for new files
- Automatically update TOC in target repository

### Challenge 3: Structural Alignment

**Solution**: Multi-strategy matching
- Primary: Heading anchors and parent section IDs
- Secondary: Relative position within sections
- Fallback: Fuzzy matching with confidence scores
- Last resort: Flag for manual review

### Challenge 4: Ensuring Translation Quality

**Solution**: Multiple safeguards
- Glossary for consistent terminology
- Context provision for accurate translation
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

### Structural Mismatches

If block mapping fails (major restructuring):
1. Attempt fuzzy matching
2. If confidence < 80%, flag for manual review
3. Include comment in PR with details
4. Link to specific sections needing attention

### Validation Failures

After applying translations:
1. Validate MyST syntax
2. Check for unintended deletions
3. Verify change size is reasonable
4. Fail workflow if validation fails

## Requirements & Assumptions

### Requirements

1. Source repository uses MyST Markdown format
2. PR merge triggers the action (not individual commits)
3. All translations require PR review before merging
4. Action must fail gracefully on errors (no partial updates)

### Assumptions

1. Source and target filenames are identical (1:1 mapping)
2. Target repository has similar directory structure
3. Both repositories use `_toc.yml` for table of contents
4. Code blocks, math equations, and MyST directives should not be translated

## Implementation Features

### Core Features (v1)

- [ ] PR merge detection and file change tracking
- [ ] MyST Markdown block parser
- [ ] Diff-based change detection
- [ ] Structural block mapping (source → target)
- [ ] Claude Sonnet 4.5 integration
- [ ] Glossary support
- [ ] Diff translation and application
- [ ] Full file translation for new files
- [ ] TOC management and updates
- [ ] PR creation in target repository
- [ ] Error handling and workflow failures
- [ ] MyST validation

### Enhanced Features (Future)

- [ ] Multi-language support (beyond Chinese)
- [ ] Translation memory/cache
- [ ] Confidence scoring for fuzzy matches
- [ ] Automated issue creation for failures
- [ ] Translation quality metrics
- [ ] Batch processing of multiple files
- [ ] Preview/dry-run mode
- [ ] Custom prompt templates
- [ ] Translation review suggestions

## Next Steps

1. Set up project structure
2. Implement MyST parser
3. Build diff detection engine
4. Implement block mapping algorithm
5. Integrate Claude API
6. Create PR management logic
7. Add TOC handling
8. Implement error handling
9. Write tests
10. Create documentation 