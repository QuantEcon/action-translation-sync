# Architecture Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Action Workflow                      │
│                                                                 │
│  Trigger: PR Merged in Source Repository                       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                        index.ts                                 │
│                     Main Entry Point                            │
│                                                                 │
│  • Validate PR event                                            │
│  • Get changed files from GitHub API                            │
│  • Load glossary                                                │
│  • Process each file                                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                   file-processor.ts                             │
│                  File Orchestration                             │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  Decide: Diff Mode or Full Mode?                         │  │
│  └──────────┬────────────────────────────┬──────────────────┘  │
│             │                            │                      │
│        Diff Mode                    Full Mode                   │
│             │                            │                      │
└─────────────┼────────────────────────────┼──────────────────────┘
              │                            │
              ▼                            ▼
   ┌──────────────────────┐    ┌──────────────────────┐
   │  diff-detector.ts    │    │   translator.ts      │
   │  Change Detection    │    │   Full Translation   │
   │                      │    │                      │
   │  1. Parse old/new    │    │  1. Translate entire │
   │  2. Find changes     │    │     document         │
   │  3. Map to target    │    │  2. Validate MyST    │
   └──────────┬───────────┘    └──────────┬───────────┘
              │                            │
              ▼                            │
   ┌──────────────────────┐               │
   │   translator.ts      │               │
   │   Diff Translation   │               │
   │                      │               │
   │  1. Translate blocks │               │
   │  2. Apply to target  │               │
   └──────────┬───────────┘               │
              │                            │
              └────────────┬───────────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │  Translated Content  │
              │  (validated MyST)    │
              └──────────┬───────────┘
                          │
                          ▼
              ┌──────────────────────┐
              │   TODO: Create PR    │
              │   in Target Repo     │
              └──────────────────────┘
```

## Component Details

### Parser (parser.ts)

```
Input: Markdown String
         │
         ▼
    ┌────────┐
    │unified │ ← remark-parse
    │pipeline│ ← remark-directive
    │        │ ← remark-math
    │        │ ← remark-gfm
    └────┬───┘
         │
         ▼
    AST (Abstract Syntax Tree)
         │
         ▼
    visit() each node
         │
         ▼
    Extract blocks with:
    • Type (heading/paragraph/code/etc)
    • Content
    • Line numbers
    • Parent heading
    • ID (for headings)
         │
         ▼
    Output: ParsedDocument
    {
      blocks: Block[],
      metadata: {
        filepath,
        totalLines,
        hasCode,
        hasMath,
        hasDirectives
      }
    }
```

### Diff Detector (diff-detector.ts)

```
Inputs: oldContent, newContent
            │
            ▼
    Parse both documents
            │
            ▼
    Build block maps
            │
            ▼
    For each new block:
    ┌───────────────────┐
    │ Find in old doc?  │
    └─────┬─────────────┘
          │
    ┌─────┴─────┐
    │           │
   YES         NO
    │           │
    ▼           ▼
 Compare    Mark as ADDED
 content    
    │
┌───┴───┐
│       │
Same  Different
│       │
Skip  Mark as MODIFIED
│
▼
For remaining old blocks:
Mark as DELETED
│
▼
Output: ChangeBlock[]
{
  type: 'added' | 'modified' | 'deleted',
  oldBlock?,
  newBlock?,
  anchor,
  position
}
```

### Matching Strategies

```
Block Matching (findCorrespondingBlock):

Strategy 1: Exact ID Match
├─ If block has ID (heading)
└─ Find block with same ID

Strategy 2: Structural Match
├─ Match by parent heading
└─ Match by block type

Strategy 3: Position Match
├─ Use approximate index
└─ Check if types match

Strategy 4: Fuzzy Match
├─ Calculate Jaccard similarity
├─ Compare word sets
└─ Return if confidence > 0.7
```

### Translation Flow

```
Diff Mode:
┌────────────────────┐
│  Changed Blocks    │
└─────────┬──────────┘
          │
          ▼
For each changed block:
┌────────────────────┐
│  Get context       │
│  • Before blocks   │
│  • After blocks    │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Build prompt:     │
│  [CONTEXT]         │
│  [CHANGED]         │
│  [CONTEXT]         │
│  + Glossary        │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Call Claude API   │
│  (Sonnet 4.5)      │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Translated text   │
└─────────┬──────────┘
          │
          ▼
Apply to target document

Full Mode:
┌────────────────────┐
│  Entire document   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Build prompt:     │
│  + Full content    │
│  + Glossary        │
│  + Rules           │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Call Claude API   │
└─────────┬──────────┘
          │
          ▼
┌────────────────────┐
│  Translated doc    │
└────────────────────┘
```

## Data Flow Example

```
Source PR: Modify lectures/aiyagari.md
│
├─ Old content: "The Aiyagari model studies..."
├─ New content: "The Aiyagari model is a canonical..."
│
▼
Parser processes both versions
│
├─ Old blocks: [heading, paragraph_old, code]
├─ New blocks: [heading, paragraph_new, code]
│
▼
Diff Detector compares
│
├─ Changes: [{ type: 'modified', oldBlock: paragraph_old, newBlock: paragraph_new }]
│
▼
Map to target (Chinese version)
│
├─ Find: paragraph in Chinese doc with same parent heading
│
▼
Translator translates new paragraph
│
├─ Input: "The Aiyagari model is a canonical..."
├─ Context: heading + code blocks
├─ Glossary: "model" → "模型"
├─ Output: "Aiyagari模型是一个典型的..."
│
▼
File Processor applies translation
│
├─ Replace old Chinese paragraph with new translation
├─ Keep heading and code unchanged
│
▼
Output: Updated Chinese document
│
▼
TODO: Create PR in target repo
```

## Technology Stack

```
┌─────────────────────────────────────┐
│         Runtime: Node.js 20         │
└─────────────────────────────────────┘
              │
    ┌─────────┴──────────┐
    │                    │
    ▼                    ▼
┌────────┐        ┌──────────────┐
│TypeScript│      │GitHub Actions│
│  5.3     │      │   Toolkit    │
└────────┘        └──────────────┘
    │                    │
    ▼                    ▼
┌─────────────────────────────────────┐
│           Dependencies              │
│                                     │
│  • unified (markdown pipeline)      │
│  • remark-* (parsers/plugins)       │
│  • @anthropic-ai/sdk (Claude)       │
│  • @actions/core (GitHub)           │
│  • @actions/github (API)            │
│  • js-yaml (TOC parsing)            │
└─────────────────────────────────────┘
```

## Current State vs Target State

### ✅ Implemented (Steps 1-3)

```
┌───────────┐    ┌──────────┐    ┌───────────┐
│  Parser   │ → │   Diff   │ → │Translator │
│  (MyST)   │    │ Detector │    │ (Claude)  │
└───────────┘    └──────────┘    └───────────┘
```

### 🚧 TODO (Steps 4-6)

```
┌───────────┐    ┌──────────┐    ┌───────────┐
│   Clone   │ → │  Create  │ → │  Create   │
│   Target  │    │  Branch  │    │    PR     │
└───────────┘    └──────────┘    └───────────┘
```

---

See IMPLEMENTATION.md for complete details.
