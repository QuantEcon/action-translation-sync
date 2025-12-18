# System Architecture: action-translation

**Last Updated**: 18 December 2025  
**Version**: v0.8 (ONBOARD Design)

This document provides a complete architectural overview of the translation sync system, including all operational modes and how they work together.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Core Philosophy](#core-philosophy)
3. [Operational Modes](#operational-modes)
4. [Project Lifecycle](#project-lifecycle)
5. [Mode Details](#mode-details)
6. [Component Architecture](#component-architecture)
7. [Data Structures](#data-structures)
8. [Integration Points](#integration-points)

---

## System Overview

The action-translation system keeps English SOURCE repositories synchronized with translated TARGET repositories across their entire lifecycle.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TRANSLATION SYNC SYSTEM                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                         REPOSITORIES                                 │   │
│   │                                                                      │   │
│   │   SOURCE (English)              TARGET (Translated)                  │   │
│   │   ┌─────────────────┐          ┌─────────────────┐                  │   │
│   │   │ lecture-python  │ ──────▶  │ lecture-python  │                  │   │
│   │   │                 │          │ .zh-cn          │                  │   │
│   │   └─────────────────┘          └─────────────────┘                  │   │
│   │           │                            ▲                             │   │
│   │           │                            │                             │   │
│   │           ▼                            │                             │   │
│   │   ┌─────────────────────────────────────┐                           │   │
│   │   │         OPERATIONAL MODES            │                           │   │
│   │   │                                      │                           │   │
│   │   │  ┌────────┐  ┌────────┐  ┌────────┐ │                           │   │
│   │   │  │  BULK  │  │  SYNC  │  │ONBOARD │ │                           │   │
│   │   │  └────────┘  └────────┘  └────────┘ │                           │   │
│   │   │  ┌────────┐  ┌────────┐             │                           │   │
│   │   │  │ RESYNC │  │ REVIEW │             │                           │   │
│   │   │  └────────┘  └────────┘             │                           │   │
│   │   │                                      │                           │   │
│   │   └─────────────────────────────────────┘                           │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
│   ┌─────────────────────────────────────────────────────────────────────┐   │
│   │                          TOOLS                                       │   │
│   │                                                                      │   │
│   │   action-translation/        GitHub Action (SYNC, REVIEW modes)     │   │
│   │   tool-bulk-translator/      CLI (BULK mode)                        │   │
│   │   tool-alignment/            CLI (ONBOARD, RESYNC, diagnostics)     │   │
│   │                                                                      │   │
│   └─────────────────────────────────────────────────────────────────────┘   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Core Philosophy

### SOURCE is Truth

The English SOURCE repository is authoritative. All workflows flow from SOURCE to TARGET:

```
SOURCE changes  →  TARGET updates   ✓
TARGET changes  →  SOURCE updates   ✗ (use SUGGEST workflow instead)
```

**Implications**:
- Structure mismatches → Realign TARGET to match SOURCE
- Quality issues → Retranslate from SOURCE
- TARGET improvements → Extract as SUGGESTIONS for SOURCE

### Exception: TARGET Improvements

During ONBOARD, if TARGET contains improvements not in SOURCE (bug fixes, clarifications, additional examples), we capture these as **SUGGESTIONS** for potential backport to SOURCE.

```
TARGET has improvements?
    │
    ├── YES → Extract as SUGGESTIONS PR to SOURCE
    │         Then RESYNC TARGET from updated SOURCE
    │
    └── NO  → Proceed with normal ONBOARD/RESYNC
```

This preserves valuable work while maintaining SOURCE as the canonical version.

### Section-Based Translation

Documents are structured into sections (## headings). Translations operate at the **section level**, not on individual blocks.

**Why Section-Based?**
| Block-Based Problems | Section-Based Solutions |
|----------------------|------------------------|
| Can't match paragraphs across languages | Position matching (1st → 1st) |
| Lost context (isolated blocks) | Full context (Claude sees entire sections) |
| Complex matching logic | Simple logic (add/update/delete) |
| Fragile (breaks with structure differences) | Robust (works with variations) |

---

## Operational Modes

### Mode Summary

| Mode | Purpose | When Used | Tool | Cost |
|------|---------|-----------|------|------|
| **BULK** | Full translation of new content | New project initialization | tool-bulk-translator | ~$0.75/file |
| **SYNC** | Incremental translation updates | PR merged to SOURCE | action-translation | ~$0.15/PR |
| **REVIEW** | Quality assessment of translations | PR created to TARGET | action-translation | ~$0.05/PR |
| **ONBOARD** | Align existing repos | One-time setup | tool-alignment | ~$4-8/project |
| **RESYNC** | Recover from drift | As needed | tool-alignment | ~$0.10/file |

### Mode Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MODE RELATIONSHIPS                                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  INITIALIZATION                    STEADY STATE           RECOVERY          │
│  ─────────────────────────────────────────────────────────────────────     │
│                                                                              │
│  New Project:                      PR merged:             Drift detected:   │
│  ┌────────┐                        ┌────────┐             ┌────────┐        │
│  │  BULK  │ ─────────────────────▶ │  SYNC  │ ◀───────── │ RESYNC │        │
│  └────────┘                        └────────┘             └────────┘        │
│       │                                 │                      ▲            │
│       │                                 ▼                      │            │
│       │                            ┌────────┐                  │            │
│       │                            │ REVIEW │                  │            │
│       │                            └────────┘                  │            │
│       │                                                        │            │
│  Existing Project:                                             │            │
│  ┌─────────┐                                                   │            │
│  │ ONBOARD │ ──────────────────────────────────────────────────┘            │
│  └─────────┘                                                                │
│       │                                                                      │
│       │ (also enables SYNC)                                                 │
│       ▼                                                                      │
│  ┌────────┐                                                                 │
│  │  SYNC  │                                                                 │
│  └────────┘                                                                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Project Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PROJECT LIFECYCLE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                      INITIALIZATION                                 │     │
│  │                                                                     │     │
│  │   Path A: New Project               Path B: Existing Project        │     │
│  │   ┌─────────────────────┐          ┌─────────────────────┐         │     │
│  │   │       BULK          │          │      ONBOARD        │         │     │
│  │   │  - Full translation │          │  - 3-step analysis  │         │     │
│  │   │  - Generate maps    │          │  - Generate maps    │         │     │
│  │   │  - Add tracking     │          │  - Add tracking     │         │     │
│  │   └─────────┬───────────┘          └─────────┬───────────┘         │     │
│  │             │                                │                      │     │
│  │             └────────────────┬───────────────┘                      │     │
│  │                              ▼                                      │     │
│  │                     Infrastructure Ready:                           │     │
│  │                     - heading-maps in all files                     │     │
│  │                     - source-commit tracking                        │     │
│  │                     - GitHub Action configured                      │     │
│  │                                                                     │     │
│  └────────────────────────────────┬───────────────────────────────────┘     │
│                                   │                                          │
│  ┌────────────────────────────────▼───────────────────────────────────┐     │
│  │                        STEADY STATE                                 │     │
│  │                                                                     │     │
│  │   ┌─────────────────────────────────────────────────────────┐      │     │
│  │   │                        SYNC                              │      │     │
│  │   │                                                          │      │     │
│  │   │   PR merged to SOURCE                                    │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   Detect changed sections (diff-detector)                │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   Translate changes (UPDATE mode)                        │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   Create translation PR to TARGET                        │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   ┌────────┐                                             │      │     │
│  │   │   │ REVIEW │ (optional: quality assessment)              │      │     │
│  │   │   └────────┘                                             │      │     │
│  │   │                                                          │      │     │
│  │   └─────────────────────────────────────────────────────────┘      │     │
│  │                                                                     │     │
│  └────────────────────────────────┬───────────────────────────────────┘     │
│                                   │                                          │
│                                   │ drift detected                           │
│                                   ▼                                          │
│  ┌────────────────────────────────────────────────────────────────────┐     │
│  │                       DRIFT RECOVERY                                │     │
│  │                                                                     │     │
│  │   ┌─────────────────────────────────────────────────────────┐      │     │
│  │   │                      RESYNC                              │      │     │
│  │   │                                                          │      │     │
│  │   │   Compare source-commit to current SOURCE HEAD           │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   Identify stale files                                   │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   Re-translate changed sections                          │      │     │
│  │   │        │                                                 │      │     │
│  │   │        ▼                                                 │      │     │
│  │   │   Update source-commit tracking                          │      │     │
│  │   │                                                          │      │     │
│  │   └─────────────────────────────────────────────────────────┘      │     │
│  │                              │                                      │     │
│  │                              │ back to steady state                 │     │
│  │                              ▼                                      │     │
│  └──────────────────────────────┴─────────────────────────────────────┘     │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Mode Details

### BULK Mode

**Purpose**: Full translation of new content for project initialization.

**Tool**: `tool-bulk-translator/`

**When Used**: 
- Creating a new translated repository from scratch
- Translating individual new files

**Process**:
```
┌─────────────────────────────────────────────────────────────────┐
│                         BULK Mode                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Input: SOURCE file (English)                                   │
│                                                                  │
│  1. Parse document into sections                                │
│     └── Extract preamble, sections, subsections                 │
│                                                                  │
│  2. Translate each section (NEW mode)                           │
│     └── Full translation with glossary                          │
│     └── Preserve MyST syntax                                    │
│                                                                  │
│  3. Generate heading-map                                        │
│     └── Map English IDs to translated headings                  │
│                                                                  │
│  4. Add source-commit tracking                                  │
│     └── Record SOURCE commit SHA                                │
│                                                                  │
│  Output: TARGET file with frontmatter                           │
│                                                                  │
│  ---                                                            │
│  translation:                                                   │
│    source-commit: abc123                                        │
│    synced-at: 2024-12-18T10:00:00Z                              │
│  heading-map:                                                   │
│    overview: 概述                                                │
│    the-model: 模型                                               │
│  ---                                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**CLI**:
```bash
cd tool-bulk-translator
npm run bulk -- \
  --source ../lecture-python-intro \
  --target ../lecture-intro.zh-cn \
  --target-language zh-cn \
  --file lectures/cobweb.md
```

---

### SYNC Mode

**Purpose**: Incremental translation updates when SOURCE changes.

**Tool**: `action-translation` (GitHub Action)

**When Used**: PR merged to SOURCE repository

**Process**:
```
┌─────────────────────────────────────────────────────────────────┐
│                         SYNC Mode                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Trigger: PR merged to SOURCE                                   │
│                                                                  │
│  1. Detect changed files in PR                                  │
│     └── Filter to docs folder (.md files)                       │
│                                                                  │
│  2. For each changed file:                                      │
│     │                                                            │
│     ├── New file?                                               │
│     │   └── YES: Full translation (NEW mode)                    │
│     │                                                            │
│     ├── Deleted file?                                           │
│     │   └── YES: Create deletion PR                             │
│     │                                                            │
│     └── Modified file:                                          │
│         │                                                        │
│         ├── Parse old SOURCE (before PR)                        │
│         ├── Parse new SOURCE (after PR)                         │
│         ├── Detect section changes (diff-detector)              │
│         │   └── ADDED, MODIFIED, DELETED sections               │
│         │                                                        │
│         ├── For each change:                                    │
│         │   ├── ADDED: Translate (NEW mode)                     │
│         │   ├── MODIFIED: Translate (UPDATE mode)               │
│         │   │   └── Provides: old EN, new EN, current CN        │
│         │   └── DELETED: Remove section                         │
│         │                                                        │
│         ├── Reconstruct TARGET document                         │
│         └── Update heading-map                                  │
│                                                                  │
│  3. Update source-commit tracking                               │
│     └── Set to merged PR's commit SHA                           │
│                                                                  │
│  4. Create translation PR to TARGET repo                        │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**GitHub Action Configuration** (SOURCE repo):
```yaml
name: Translation Sync
on:
  pull_request:
    types: [closed]
    branches: [main]

jobs:
  sync:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: QuantEcon/action-translation@v0.7
        with:
          mode: sync
          source-repo: ${{ github.repository }}
          target-repo: QuantEcon/lecture-intro.zh-cn
          target-language: zh-cn
          docs-folder: lectures
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.TARGET_REPO_TOKEN }}
```

---

### REVIEW Mode

**Purpose**: AI-powered quality assessment of translation PRs.

**Tool**: `action-translation` (GitHub Action)

**When Used**: PR created to TARGET repository

**Process**:
```
┌─────────────────────────────────────────────────────────────────┐
│                        REVIEW Mode                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Trigger: PR opened/updated to TARGET                           │
│                                                                  │
│  1. Identify source PR                                          │
│     └── Parse PR body for source PR reference                   │
│                                                                  │
│  2. Get source diff                                             │
│     └── English before/after from source PR                     │
│                                                                  │
│  3. Evaluate translation quality                                │
│     ├── Accuracy (0-100): Is meaning preserved?                 │
│     ├── Fluency (0-100): Natural in target language?            │
│     ├── Terminology (0-100): Correct technical terms?           │
│     └── Formatting (0-100): MyST syntax preserved?              │
│                                                                  │
│  4. Evaluate diff quality                                       │
│     ├── Scope: Are only changed sections updated?               │
│     ├── Position: Are changes in correct locations?             │
│     ├── Structure: Is document structure intact?                │
│     └── Heading-map: Is it correctly updated?                   │
│                                                                  │
│  5. Generate review verdict                                     │
│     ├── PASS (≥8): Ready to merge                               │
│     ├── WARN (≥6): Minor issues, review recommended             │
│     └── FAIL (<6): Significant issues, needs revision           │
│                                                                  │
│  6. Post review comment to PR                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**GitHub Action Configuration** (TARGET repo):
```yaml
name: Translation Review
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: QuantEcon/action-translation@v0.7
        with:
          mode: review
          source-repo: QuantEcon/lecture-python-intro
          target-language: zh-cn
          docs-folder: lectures
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

---

### ONBOARD Mode

**Purpose**: One-time comprehensive alignment of existing SOURCE and TARGET repos.

**Tool**: `tool-alignment/`

**When Used**: Bringing existing translation projects under automated sync management.

**3-Step Process**:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            ONBOARD Mode                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Step 1: Structure & Heading Match                  │    │
│  │                                                                      │    │
│  │  For each file in SOURCE:                                           │    │
│  │    ├── File exists in TARGET?                                       │    │
│  │    │   ├── NO  → Action: 📄 TRANSLATE (use BULK)                    │    │
│  │    │   └── YES → Compare structure:                                 │    │
│  │    │       ├── Same section count?                                  │    │
│  │    │       ├── LLM: Are headings semantically equivalent?           │    │
│  │    │       └── Structure Result: ALIGNED / PARTIAL / DIVERGED       │    │
│  │    │                                                                │    │
│  │  For each file in TARGET only:                                      │    │
│  │    └── Action: 💡 SUGGEST (propose as new lecture to SOURCE)        │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                   Step 2: Git History Analysis                       │    │
│  │                                                                      │    │
│  │  For each file with TARGET match:                                   │    │
│  │    ├── Get edit history (SOURCE and TARGET)                         │    │
│  │    └── Classify edit pattern:                                       │    │
│  │        ├── BOTH ACTIVE  → 🔍 MANUAL REVIEW (author decides)         │    │
│  │        ├── SOURCE AHEAD → Continue to Step 3                        │    │
│  │        ├── TARGET AHEAD → 💡 SUGGEST                                │    │
│  │        └── STABLE       → Continue to Step 3                        │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                Step 3: Section Content Comparison                    │    │
│  │                                                                      │    │
│  │  For each section pair (SOURCE ↔ TARGET):                           │    │
│  │    ├── LLM Assessment:                                              │    │
│  │    │   ├── Translation Quality (accuracy, fluency, terminology)     │    │
│  │    │   └── Content Similarity (current SOURCE vs TARGET)            │    │
│  │    │                                                                │    │
│  │    └── Section Status:                                              │    │
│  │        ├── ✅ IN SYNC: Quality ≥80%, similarity ≥90%                │    │
│  │        ├── 🔄 STALE: Quality OK but content differs                 │    │
│  │        ├── 📝 QUALITY: Content matches, translation needs work      │    │
│  │        └── ⚠️ DIVERGED: Content differs significantly               │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                   │                                          │
│                                   ▼                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Output: Action Plan                             │    │
│  │                                                                      │    │
│  │  | Action          | When                                    |      │    │
│  │  |-----------------|----------------------------------------|      │    │
│  │  | 📄 TRANSLATE    | File in SOURCE only                    |      │    │
│  │  | 💡 SUGGEST      | File in TARGET only / TARGET ahead     |      │    │
│  │  | 🔍 MANUAL REVIEW| Both repos actively edited             |      │    │
│  │  | ✅ TRACK        | Fully aligned                          |      │    │
│  │  | 📝 HEADING-MAP  | Structure aligned, no map              |      │    │
│  │  | 🔄 RESYNC       | Content stale                          |      │    │
│  │  | ⚠️ REALIGN      | Structure diverged                     |      │    │
│  │                                                                      │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**CLI**:
```bash
cd tool-alignment

# Full ONBOARD (all 3 steps)
npm run onboard -- \
  --source ~/work/quantecon/lecture-python-intro \
  --target ~/work/quantecon/lecture-intro.zh-cn \
  --docs-folder lectures \
  --target-language zh-cn \
  --output ./onboard-report.md

# Preview: Steps 1-2 only (no LLM cost)
npm run onboard -- --preview ...

# Reset a specific file from SOURCE
npm run onboard -- reset cobweb.md ...
```

---

### RESYNC Mode

**Purpose**: Recover from drift when repos fall out of sync.

**Tool**: `tool-alignment/`

**When Used**:
- Direct commits to main (bypassing PRs)
- Stale translations detected by source-commit check
- After MANUAL REVIEW decisions

**Process**:
```
┌─────────────────────────────────────────────────────────────────┐
│                        RESYNC Mode                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Detect staleness                                            │
│     ├── Read source-commit from TARGET frontmatter              │
│     ├── Compare to current SOURCE HEAD                          │
│     └── Has SOURCE file changed since source-commit?            │
│                                                                  │
│  2. Get diff between source-commit and HEAD                     │
│     └── What sections changed in SOURCE?                        │
│                                                                  │
│  3. For each changed section:                                   │
│     └── Translate using UPDATE mode                             │
│         └── Provides: old EN, new EN, current CN                │
│                                                                  │
│  4. Update TARGET file                                          │
│     ├── Apply translated section updates                        │
│     ├── Update heading-map if needed                            │
│     └── Update source-commit to current HEAD                    │
│                                                                  │
│  5. Create PR or commit                                         │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**CLI**:
```bash
cd tool-alignment

# Check staleness across all files
npm run resync -- check \
  --source ~/work/quantecon/lecture-python-intro \
  --target ~/work/quantecon/lecture-intro.zh-cn \
  --docs-folder lectures

# Resync specific file
npm run resync -- \
  --file cobweb.md \
  --source ~/work/quantecon/lecture-python-intro \
  --target ~/work/quantecon/lecture-intro.zh-cn

# Resync all stale files
npm run resync -- --all ...
```

---

## Component Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT ARCHITECTURE                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  action-translation/src/                                                    │
│  ├── index.ts              Entry point, mode routing (~780 lines)           │
│  ├── parser.ts             Stack-based section parser (282 lines)           │
│  ├── diff-detector.ts      Change detection (195 lines)                     │
│  ├── translator.ts         Claude API - SYNC mode (305 lines)               │
│  ├── reviewer.ts           Claude API - REVIEW mode (~700 lines)            │
│  ├── file-processor.ts     Translation orchestration (739 lines)            │
│  ├── heading-map.ts        Heading-map system (246 lines)                   │
│  ├── language-config.ts    Language-specific rules (102 lines)              │
│  ├── inputs.ts             Action inputs validation (~200 lines)            │
│  └── types.ts              TypeScript types (~250 lines)                    │
│                                                                              │
│  tool-alignment/src/                                                        │
│  ├── index.ts              CLI entry point                                  │
│  ├── structural-analyzer.ts Section structure comparison                    │
│  ├── code-analyzer.ts       Code block integrity                            │
│  ├── triage.ts             File categorization                              │
│  ├── triage-report.ts      Report generation                                │
│  ├── file-analyzer.ts      Combined analysis                                │
│  ├── git-analyzer.ts       Git history analysis (planned)                   │
│  └── types.ts              TypeScript types                                 │
│                                                                              │
│  tool-bulk-translator/src/                                                  │
│  └── bulk-translate.ts     Full file translation                            │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Reuse

| Component | BULK | SYNC | REVIEW | ONBOARD | RESYNC |
|-----------|------|------|--------|---------|--------|
| parser.ts | ✅ | ✅ | ✅ | ✅ | ✅ |
| diff-detector.ts | - | ✅ | ✅ | ✅ | ✅ |
| translator.ts | ✅ NEW | ✅ UPDATE | - | - | ✅ UPDATE |
| reviewer.ts | - | - | ✅ | - | - |
| heading-map.ts | ✅ | ✅ | - | ✅ | ✅ |
| file-processor.ts | ✅ | ✅ | - | - | ✅ |
| structural-analyzer.ts | - | - | - | ✅ | ✅ |
| git-analyzer.ts | - | - | - | ✅ | ✅ |

---

## Data Structures

### Section
```typescript
interface Section {
  heading: string;        // "## Economic Models"
  level: number;          // 2, 3, 4, 5, or 6
  id: string;            // "economic-models"
  content: string;        // Full content (without subsections)
  startLine: number;      // Source line number
  endLine: number;        // End line number
  subsections: Section[]; // Recursively nested subsections
}
```

### source-commit Tracking
```yaml
---
translation:
  source-repo: lecture-python-intro
  source-file: lectures/cobweb.md
  source-commit: abc123def456789
  synced-at: 2024-12-18T10:00:00Z
heading-map:
  overview: 概述
  the-model: 模型
  implementation: 实现
---
```

### SectionChange
```typescript
interface SectionChange {
  type: 'added' | 'modified' | 'deleted';
  oldSection?: Section;
  newSection?: Section;
  position?: { index: number; afterSectionId: string };
}
```

### ONBOARD Action
```typescript
type OnboardAction = 
  | 'translate'      // 📄 File in SOURCE only
  | 'suggest'        // 💡 File in TARGET only
  | 'manual-review'  // 🔍 Both repos actively edited
  | 'track'          // ✅ Fully aligned
  | 'heading-map'    // 📝 Structure aligned, no map
  | 'resync'         // 🔄 Content stale
  | 'realign';       // ⚠️ Structure diverged
```

---

## Integration Points

### GitHub Actions
- **SYNC**: Triggered by `pull_request.closed` with `merged: true`
- **REVIEW**: Triggered by `pull_request.opened` or `synchronize`

### Claude API
- **Model**: Claude Sonnet 4.5 (for translation)
- **Model**: Claude Haiku 3.5/4.5 (for quality assessment)
- **Rate Limits**: Handled with exponential backoff

### Git Operations
- **Source commits**: Read via GitHub API
- **PR creation**: GitHub REST API
- **File diffs**: GitHub compare API

### Glossary
- **Location**: `glossary/<language>.json`
- **Format**: `{ "term": "translation", ... }`
- **Size**: ~357 terms (zh-cn, fa)

---

## Related Documentation

- [PLAN_RESYNC_INIT.md](../PLAN_RESYNC_INIT.md) - Implementation plan
- [docs/IMPLEMENTATION.md](IMPLEMENTATION.md) - Code details
- [docs/PROJECT-DESIGN.md](PROJECT-DESIGN.md) - Design decisions
- [docs/HEADING-MAPS.md](HEADING-MAPS.md) - Heading-map system
- [docs/TESTING.md](TESTING.md) - Testing guide

---

**Document Maintainer**: QuantEcon Team
