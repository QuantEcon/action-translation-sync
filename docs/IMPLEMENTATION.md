# Implementation Guide# Implementation Guide# Implementation Details



This document explains how the Translation Sync Action works internally. For architecture overview, see [ARCHITECTURE.md](ARCHITECTURE.md). For design decisions, see [PROJECT-DESIGN.md](PROJECT-DESIGN.md).



---This document explains how the Translation Sync Action works internally. For architecture overview, see [ARCHITECTURE.md](ARCHITECTURE.md). For design decisions, see [PROJECT-DESIGN.md](PROJECT-DESIGN.md).## Overview



## Overview



The implementation is **simple by design** - ~1,200 lines of core code across 6 modules, no complex AST parsing, and straightforward position-based matching.---This document explains the implementation details of the section-based translation sync action. The implementation is **simple by design** - 976 lines of core code across 4 modules, no complex AST parsing, and straightforward position-based matching.



**Core Philosophy**: Keep it simple, maintainable, and easy to understand.



---## Core Components**Core Philosophy**: Keep it simple, maintainable, and easy to understand.



## Core Modules



### 1. Entry Point (`src/index.ts` - 118 lines)### 1. Entry Point (`src/index.ts`)## Core Modules



#### Purpose

GitHub Actions entry point that orchestrates the translation workflow.

**Purpose**: GitHub Actions entry point### 1. Section Parser (`src/parser.ts` - 172 lines)

#### Key Responsibilities

- Read action inputs (repos, languages, API keys)

- Detect changed files in merged PR

- Orchestrate translation workflow**Key Functions**:#### Purpose

- Create translation PRs in target repo

- Reads action inputs (repos, languages, API keys)Parse MyST Markdown documents into `## Section` blocks using simple line-by-line parsing.

#### Main Flow

```typescript- Detects changed files in merged PR

1. Get merged PR details from GitHub

2. Detect changed lecture files (*.md in docs-folder)- Orchestrates translation workflow#### Key Functions

3. For each changed file:

   - Fetch source (English) and target (Chinese) content- Creates translation PRs

   - Process file (translate via file-processor)

   - Create PR in target repo with translations**`parseSections(content: string, filepath: string): Section[]`**

```

**Flow**:

---

```typescriptMain parser function. Splits document on `## Heading` markers.

### 2. Parser (`src/parser.ts` - 172 lines)

1. Get merged PR details

#### Purpose

Parse MyST Markdown documents into `## Section` blocks using simple line-by-line parsing.2. Detect changed lecture files (*.md in lectures/)```typescript



#### Key Functions3. For each changed file:// Input:



**`parseSections(content: string, filepath: string): Section[]`**   - Fetch source (English) and target (Chinese) content# Lecture Title



Main parser function. Splits document on `## Heading` markers.   - Process file (translate)



```typescript   - Create PR in target repo## Introduction

// Input:

# Lecture Title```This is the intro.



## Introduction

This is the intro.

---### Background

### Background

Some history here.Some history here.



## Main Theory### 2. File Processor (`src/file-processor.ts`)

The core content.

## Main Theory

// Output:

[**Purpose**: Orchestrates section-based translationThe core content.

  {

    heading: "Introduction",

    level: 2,

    id: "introduction",**Key Methods**:// Output:

    content: "## Introduction\n\nThis is the intro.\n\n### Background\nSome history here.\n\n",

    startLine: 3,[

    endLine: 8,

    subsections: [#### `processFile(sourceContent, targetContent, filename)`  {

      { heading: "Background", level: 3, ... }

    ]Main orchestration method:    heading: "Introduction",

  },

  {1. Parse source and target documents    level: 2,

    heading: "Main Theory",

    level: 2,2. Detect section changes (ADDED/MODIFIED/DELETED)    id: "introduction",

    id: "main-theory",

    content: "## Main Theory\n\nThe core content.\n\n",3. Translate changed sections    content: "This is the intro.\n\n### Background\nSome history here.",

    startLine: 10,

    endLine: 11,4. Reconstruct target document    startLine: 3,

    subsections: []

  }5. Update heading-map    endLine: 8,

]

```    subsections: ["Background"]



**Algorithm**:#### `parseTranslatedSubsections(content, sourceSection)` (v0.4.3)  },

1. Split content into lines

2. For each line, check if it starts with `## ` (level-2 heading)Extracts subsections from translated content:  {

3. When found, save previous section (if any)

4. Start new section with this heading- Wraps content in minimal MyST document    heading: "Main Theory",

5. Accumulate content lines until next `## ` or EOF

6. Track `###` subsections within each section (recursive parsing)- Parses with parser to extract structure    level: 2,

7. Generate heading ID from heading text

- Returns array of subsection objects    id: "main-theory",

**Why Line-by-Line?**

- No dependencies needed (no `unified`, `remark`, etc.)- Critical for heading-map completeness    content: "The core content.",

- Simple and fast (~1000 lines/ms)

- Sufficient for `##` heading detection    startLine: 10,

- Easy to debug and maintain

**Subsection Handling** (v0.4.3):    endLine: 11,

**`generateHeadingId(text: string): string`**

- After translating a section, parse the result to extract subsections    subsections: []

Creates consistent heading anchors for cross-references.

- Add subsections to Section object  }

```typescript

generateHeadingId("Economic Models") // → "economic-models"- Include subsections in heading-map updates]

generateHeadingId("The Bellman Equation") // → "the-bellman-equation"

```- This enables incremental subsection updates```



**Algorithm**:

1. Convert to lowercase

2. Replace spaces with hyphens#### `reconstructFromSections(sections, frontmatter, preamble)`**Algorithm**:

3. Remove special characters

4. Trim leading/trailing hyphensRebuilds complete document:1. Split content into lines



**`findSectionById(sections: Section[], id: string): Section | undefined`**- Combines frontmatter + preamble + sections2. For each line, check if it starts with `## ` (level-2 heading)



Recursively searches for a section by its ID. Checks top-level sections and nested subsections.- Preserves document structure3. When found, save previous section (if any)



**`validateMyST(content: string, filepath: string): ValidationResult`**- **Important**: section.content already includes subsections (don't append them again)4. Start new section with this heading



Basic MyST syntax validation:5. Accumulate content lines until next `## ` or EOF

- Check for unclosed code blocks (odd number of ` ``` `)

- Check for unclosed directives (odd number of ` ::: `)**Size**: ~470 lines6. Track `###` subsections within each section

- Return errors with line numbers if found

7. Generate heading ID from heading text

#### Data Structure

---

```typescript

interface Section {**Why Line-by-Line?**

  heading: string;        // "## Economic Models"

  level: number;          // 2, 3, 4, etc.### 3. Parser (`src/parser.ts`)- No dependencies needed (no `unified`, `remark`, etc.)

  id: string;            // "economic-models"

  content: string;        // Full content including subsections- Simple and fast

  startLine: number;      // Source line number

  endLine: number;        // End line number**Purpose**: Parses MyST Markdown into structured sections- Sufficient for `##` heading detection

  subsections: Section[]; // Nested subsections (v0.4.0+)

}- Easy to debug and maintain

```

**Key Methods**:

#### No AST Parsing

**`generateHeadingId(text: string): string`**

The old block-based approach used `unified` and `remark` to build an Abstract Syntax Tree. This added:

- 700kB to bundle size#### `parseSections(content, filename)`

- Complex AST traversal logic

- Many dependencies to maintainMain parsing method:Creates consistent heading anchors for cross-references.



The section-based approach just splits on `##` - no AST needed!```typescript



---Returns: {```typescript



### 3. Diff Detector (`src/diff-detector.ts` - 178 lines)  frontmatter: string,    // YAML frontmattergenerateHeadingId("Economic Models") // → "economic-models"



#### Purpose  preamble: string,       // Title + introgenerateHeadingId("The Bellman Equation") // → "the-bellman-equation"

Detect section-level changes between old and new English versions.

  sections: Section[]     // Parsed sections```

#### Key Functions

}

**`detectSectionChanges(oldContent, newContent, filepath): SectionChange[]`**

```**Algorithm**:

Main diff detection function. Returns array of changes (added, modified, deleted).

1. Convert to lowercase

```typescript

// Old English:**Parsing Strategy**:2. Replace spaces with hyphens

## Introduction

This is v1.- Line-by-line parsing3. Remove special characters



## Theory- Splits on ## headings (level 2)4. Trim leading/trailing hyphens

The math.

- Extracts ### subsections (level 3+) recursively

// New English:

## Introduction- Preserves exact content**`findSectionById(sections: Section[], id: string): Section | undefined`**

This is v2.

- Generates IDs from headings

## Economic Models   ← NEW

Household optimization.Recursively searches for a section by its ID. Checks top-level sections and nested subsections.



## Theory**Section Structure**:

The math.

```typescript**`validateMyST(content: string, filepath: string): ValidationResult`**

// Output:

[interface Section {

  {

    type: 'modified',  heading: string;        // "## Economic Models"Basic MyST syntax validation:

    oldSection: { heading: "Introduction", content: "This is v1.", ... },

    newSection: { heading: "Introduction", content: "This is v2.", ... },  level: number;          // 2, 3, 4, etc.- Check for unclosed code blocks (odd number of ` ``` `)

    position: 0

  },  id: string;            // "economic-models"- Check for unclosed directives (odd number of ` ::: `)

  {

    type: 'added',  content: string;        // Full content including subsections- Return errors with line numbers if found

    newSection: { heading: "Economic Models", content: "Household...", ... },

    position: 1  startLine: number;      // Source line number

  }

]  endLine: number;        // End line number#### No AST Parsing

```

  subsections: Section[]; // Nested subsections

**Algorithm**:

1. Parse old content into sections}The old block-based approach used `unified` and `remark` to build an Abstract Syntax Tree. This added:

2. Parse new content into sections

3. For each new section at index i:```- 700kB to bundle size

   - Try position match: Does old section at index i match?

   - If not, try ID match: Does any old section have same ID?- Complex AST traversal logic

   - If match found and content differs: MODIFIED

   - If no match found: ADDED**Key Features**:- Many dependencies to maintain

4. For each old section not matched: DELETED

- Preserves frontmatter (Jupyter/MyST metadata)

**`sectionsMatch(section1: Section, section2: Section): boolean`**

- Preserves preamble (title + introduction)The section-based approach just splits on `##` - no AST needed!

Checks if two sections are the "same section" (for matching purposes).

- Handles nested subsections

```typescript

// Checks:- Uses unified/remark for robust parsing### 2. Diff Detector (`src/diff-detector.ts` - 178 lines)

// 1. Same heading level (both level-2)

// 2. Same number of subsections

// 3. (Optional) Same heading ID

**Size**: ~170 lines#### Purpose

// Match:

{ heading: "Introduction", level: 2, subsections: ["Background"] }Detect section-level changes between old and new English versions.

{ heading: "Introduction", level: 2, subsections: ["Background"] }

---

// Don't match:

{ heading: "Introduction", level: 2, subsections: [] }#### Key Functions

{ heading: "Introduction", level: 2, subsections: ["Background"] }

```### 4. Diff Detector (`src/diff-detector.ts`)



**Why This Works**:**`detectSectionChanges(oldContent, newContent, filepath): SectionChange[]`**

- Level and subsection count provide structural signature

- Heading ID provides fallback for renamed sections**Purpose**: Detects changes between document versions

- Language-independent (works with "Introduction" and "介绍")

Main diff detection function. Returns array of changes (added, modified, deleted).

**`sectionContentEqual(section1: Section, section2: Section): boolean`**

**Key Methods**:

Checks if section content actually changed (to distinguish modified from unchanged).

```typescript

```typescript

// Two strategies:#### `detectChanges(oldContent, newContent, filename)`// Old English:

// 1. Length difference > 10% → definitely changed

// 2. Code block count differs → definitely changedDetects section-level changes:## Introduction



if (Math.abs(len1 - len2) / len1 > 0.1) return false;```typescriptThis is v1.

if (codeBlocks1.length !== codeBlocks2.length) return false;

Returns: {

return true; // Likely unchanged

```  changes: SectionChange[],## Theory



---  preambleChanged: booleanThe math.



### 4. Translator (`src/translator.ts` - 257 lines)}



#### Purpose```// New English:

Translates content using Claude API (Claude Sonnet 4.5).

## Introduction

#### Translation Modes

**Change Types**:This is v2.

**Mode 1: UPDATE (Incremental Translation)**

- **ADDED**: New section in source

For MODIFIED sections - uses diff-based translation:

- **MODIFIED**: Existing section changed## Economic Models   ← NEW

```

You are translating from English to Chinese.- **DELETED**: Section removed from sourceHousehold optimization.



OLD ENGLISH:

[previous English content]

**Matching Strategy**:## Theory

NEW ENGLISH:

[updated English content]- **Primary**: Match by section IDThe math.



CURRENT CHINESE:- **Fallback**: Match by position

[existing Chinese translation]

- **Why**: IDs are language-independent (generated from English headings)// Output:

Provide ONLY the updated Chinese translation.

```[



**Benefits**:**Example**:  {

- Maintains translation consistency

- Preserves terminology choices```typescript    type: 'modified',

- Faster than full re-translation

- Uses glossary for key termsOld: [Introduction, Theory, Data]    oldSection: { heading: "Introduction", content: "This is v1.", ... },



**Mode 2: NEW (Full Translation)**New: [Introduction, Models, Theory, Data]    newSection: { heading: "Introduction", content: "This is v2.", ... },



For ADDED sections or new files:    position: 0



```Detected:   },

Translate the following from English to Chinese.

- ADDED: "Models" at position 1  {

Use this glossary:

[glossary terms]- All others matched by ID (not position!)    type: 'added',



[English content]```    newSection: { heading: "Economic Models", content: "Household...", ... },



Provide ONLY the Chinese translation.    position: 1

```

**Preamble Detection**:  }

#### Key Functions

- Compares title and introduction text]

**`translateSection(request: SectionTranslationRequest): Promise<string>`**

- Returns `preambleChanged: true` if different```

Main translation function. Routes to UPDATE or NEW mode.



**`translateNewSection(request: SectionTranslationRequest): Promise<string>`**

**Size**: ~178 lines**Algorithm**:

Full translation for new sections.

1. Parse old content into sections

**`translateModifiedSection(request: SectionTranslationRequest): Promise<string>`**

---2. Parse new content into sections

Incremental translation for modified sections.

3. For each new section at index i:

#### Prompt Engineering

### 5. Translator (`src/translator.ts`)   - Try position match: Does old section at index i match?

**Key Instructions**:

1. Maintain the translation style and terminology   - If not, try ID match: Does any old section have same ID?

2. Preserve all MyST syntax (directives, roles, etc.)

3. Keep code blocks unchanged**Purpose**: Translates content using Claude API   - If match found and content differs: MODIFIED

4. Use glossary terms consistently

5. Preserve math equations   - If no match found: ADDED

6. Keep cross-references intact

**Translation Modes**:4. For each old section not matched: DELETED

**Example**:

```markdown

English:

```{code-cell} ipython3#### Mode 1: UPDATE (Incremental Translation)**`sectionsMatch(section1: Section, section2: Section): boolean`**

print("Hello")

```For MODIFIED sections - uses diff-based translation:



Chinese:Checks if two sections are the "same section" (for matching purposes).

```{code-cell} ipython3

print("Hello")**Prompt Structure**:

```

`````````typescript



---You are translating from English to Chinese.// Checks:



### 5. File Processor (`src/file-processor.ts` - 244 lines)// 1. Same heading level (both level-2)



#### PurposeOLD ENGLISH:// 2. Same number of subsections

Orchestrates section-based translation workflow.

[previous English content]// 3. (Optional) Same heading ID

#### Key Functions



**`processFile(sourceContent, targetContent, filename)`**

NEW ENGLISH:// Match:

Main orchestration function:

[updated English content]{ heading: "Introduction", level: 2, subsections: ["Background"] }

```typescript

1. Parse source and target documents{ heading: "Introduction", level: 2, subsections: ["Background"] }

2. Detect section changes (ADDED/MODIFIED/DELETED)

3. Translate changed sectionsCURRENT CHINESE:

4. Reconstruct target document

5. Update heading-map[existing Chinese translation]// Don't match:

```

{ heading: "Introduction", level: 2, subsections: [] }

**`parseTranslatedSubsections(content, sourceSection)` (v0.4.3)**

Provide ONLY the updated Chinese translation.{ heading: "Introduction", level: 2, subsections: ["Background"] }

Extracts subsections from translated content:

``````

```typescript

// Input: Translated section content

## Economic Models

**Benefits**:**Why This Works**:

### Household Problem

Maximize utility...- Maintains translation consistency- Level and subsection count provide structural signature



### Firm Problem- Preserves terminology choices- Heading ID provides fallback for renamed sections

Maximize profits...

- Faster than full re-translation- Language-independent (works with "Introduction" and "介绍")

// Output: 

{- Uses glossary for key terms

  subsections: [

    { heading: "Household Problem", level: 3, ... },**`sectionContentEqual(section1: Section, section2: Section): boolean`**

    { heading: "Firm Problem", level: 3, ... }

  ],#### Mode 2: NEW (Full Translation)

  contentWithoutSubsections: "## Economic Models\n\n"  // Stripped

}For ADDED sections or new files:Checks if section content actually changed (to distinguish modified from unchanged).

```



**Why**: Critical for heading-map completeness and preventing duplication.

**Prompt Structure**:```typescript

**Algorithm**:

1. Wrap translated content in minimal MyST document```// Two strategies:

2. Parse with parser to extract structure

3. Extract subsections from parsed resultTranslate the following from English to Chinese.// 1. Length difference > 10% → definitely changed

4. Strip subsections from content (lines after first subsection)

5. Return both subsections array and stripped content// 2. Code block count differs → definitely changed



**`reconstructFromSections(sections, frontmatter, preamble)`**Use this glossary:



Rebuilds complete document:[glossary terms]if (Math.abs(len1 - len2) / len1 > 0.1) return false;



```typescriptif (codeBlocks1.length !== codeBlocks2.length) return false;

// Input:

sections = [[English content]

  { heading: "Intro", content: "## Intro\n\nText.\n\n", subsections: [...] },

  { heading: "Theory", content: "## Theory\n\nMath.\n\n", subsections: [] }return true; // Likely unchanged

]

Provide ONLY the Chinese translation.```

// Output:

---```

jupytext: ...

---**Why Not Exact Comparison?**



# Title**Special Handling**:- Minor formatting changes shouldn't trigger re-translation



Preamble text.- **Code blocks**: Preserved unchanged (``` ... ```)- Small edits (fix typo) might not need full translation



## Intro- **Math equations**: Preserved unchanged ($$...$$, $...$)- This is heuristic, Claude still sees the changes



Text.- **MyST directives**: Syntax preserved, content translated



### Subsection  ← From subsections array- **URLs**: Preserved unchanged**`extractCodeBlocks(content: string): string[]`**

Content.

- **Variable names**: Preserved unchanged

## Theory

Finds all ` ```...``` ` code blocks in content. Used to detect if code changed (which often means content changed significantly).

Math.

```**Glossary Integration**:



**Important**: - Loads from `glossary/{language}.json`#### Position Matching

- `section.content` is stripped of subsections (v0.4.3 fix)

- Subsections appended separately from `section.subsections` array- Example: `glossary/zh-cn.json` (342 terms)

- This prevents duplication

- Ensures consistent terminologyThe key insight: **Most edits don't reorder sections.**

---

- Terms include: GDP, marginal cost, opportunity cost, etc.

### 6. Heading Map System (`src/heading-map.ts` - 200 lines)

```

#### Purpose

Maintain mapping between English and Chinese section headings for language-independent matching.**API Details**:English v1:          English v2:



#### Heading Map Structure- Model: Claude Sonnet 4.5 (`claude-sonnet-4.5-20241022`)1. Introduction      1. Introduction      ← Position match



```typescript- Max tokens: 81922. Theory           2. Economic Models   ← NEW (no match)

// Stored in translated document frontmatter:

---- Temperature: 0.3 (deterministic)3. Examples         3. Theory           ← Position match (was #2)

jupytext: ...

heading-map:                    4. Examples         ← Position match (was #3)

  introduction: "介绍"

  background: "背景"**Size**: ~257 lines```

  economic-models: "经济模型"

  household-problem: "家庭问题"  ← Subsection (v0.4.0+)

---

```---Position matching is:



**Key Features**:- **Simple**: Index-based lookup

- Flat structure (no nesting)

- Includes both sections AND subsections (v0.4.0+)### 6. Heading Map System (`src/heading-map.ts`)- **Fast**: O(1) per section

- Automatically populated on first translation

- Self-maintaining (updates with each translation)- **Language-independent**: Doesn't rely on heading text



**Why It's Needed**:**Purpose**: Maintains cross-language section mappings- **Robust**: Works across translations

```typescript

// Without heading-map:

English: "## Introduction" (id: "introduction")

Chinese: "## 介绍" (id: "介绍")  ← Different ID!**What is a Heading-Map?**### 3. Translation Service (`src/translator.ts` - 257 lines)



// Can't match sections by ID alone



// With heading-map:A heading-map is a YAML dictionary in the frontmatter that maps English section headings to their Chinese translations:#### Purpose

heading-map:

  introduction: "介绍"Translate sections using Claude Sonnet 4.5 with full context.



// Now we can match!```yaml

englishId = "introduction"

chineseHeading = headingMap[englishId]  // "介绍"---#### Key Functions

```

heading-map:

#### Key Functions

  Introduction: 简介**`translateSection(request: SectionTranslationRequest): Promise<string>`**

**`extractHeadingMap(content): Record<string, string>`**

  Economic Models: 经济模型

Extracts existing heading-map from frontmatter.

  Core Principles: 核心原则    # Subsection!Router function that dispatches to UPDATE or NEW mode based on request type.

```typescript

// Input: Document with frontmatter  Theory: 理论

---

heading-map:---```typescript

  intro: "介绍"

---```if (request.mode === 'update') {



// Output:  return await this.translateSectionUpdate(request);

{ "intro": "介绍" }

```**Why Heading-Maps?**} else {



**`updateHeadingMap(existing, sourceSections, targetSections): Record<string, string>`**  return await this.translateNewSection(request);



Updates heading-map with new translations.Without heading-maps, we can't do incremental updates:}



```typescript- English section IDs: `introduction`, `economic-models````

// Existing map:

{ "intro": "介绍" }- Chinese section IDs: `简介`, `经济模型` (different!)



// New translations:- Can't match sections across languages**`translateSectionUpdate(request: SectionTranslationRequest): Promise<string>`**

sourceSections = [

  { id: "intro", heading: "Introduction" },

  { id: "theory", heading: "Theory" }

]With heading-maps:Handles MODIFIED sections. Provides Claude with old EN, new EN, and current CN translation.

targetSections = [

  { id: "intro", heading: "介绍" },- Look up: "Economic Models" → "经济模型"

  { id: "theory", heading: "理论" }

]- Match sections correctly**Prompt Structure**:



// Updated map:- Update only changed sections```

{

  "intro": "介绍",You are updating a Chinese translation to reflect changes in the English source.

  "theory": "理论"  ← Added

}**Key Functions**:

```

KEY RULES:

**Algorithm** (v0.4.3 with subsection support):

1. Start with existing map#### `extractHeadingMap(content)`1. Maintain the translation style and terminology

2. For each source section:

   - Add section heading to map: `map[sourceId] = targetHeading`Extracts existing heading-map from frontmatter2. Update only what changed in the English

   - Recursively process subsections (v0.4.0+)

3. Return updated map3. Preserve all code blocks, math, and MyST directives unchanged



**`injectHeadingMap(content, map): string`**#### `updateHeadingMap(existing, sourceSections, targetSections)`4. Use glossary terms consistently



Injects updated heading-map into frontmatter.Updates heading-map with new translations:



```typescript- Adds new section mappingsGLOSSARY (if applicable):

// Input:

content = "---\njupytext: ...\n---\n\n# Title\n\n..."- Removes deleted sections- household: 家庭

map = { "intro": "介绍", "theory": "理论" }

- **Recursively processes subsections** (v0.4.3)- equilibrium: 均衡

// Output:

---- Preserves existing mappings

jupytext: ...

heading-map:OLD ENGLISH SECTION:

  intro: "介绍"

  theory: "理论"#### `injectHeadingMap(content, map)`## Introduction

---

Injects updated heading-map back into frontmatterThis lecture covers dynamic programming.

# Title



...

```**Subsection Support** (v0.4.3):### Key Concepts



---```typescriptWe examine value functions.



## Data Flowconst processSections = (



### Full Workflow Example  sourceSecs: Section[],NEW ENGLISH SECTION:



```  targetSecs: Section[],## Introduction

1. PR merged in English repo

   ↓  level: number = 0This lecture covers dynamic programming and optimal control.

2. index.ts: Detect changed files

   File: "lectures/intro.md") => {

   ↓

3. Fetch content  sourceSecs.forEach((source, i) => {### Key Concepts

   sourceContent = English intro.md (new version)

   targetContent = Chinese intro.md (current version)    // Add section mappingWe examine value functions and policy functions.

   ↓

4. file-processor.ts: processFile()    map.set(sourceHeading, targetHeading);

   ↓

5. parser.ts: Parse both documents    CURRENT CHINESE TRANSLATION:

   sourceSections = [Intro, Background, Theory]

   targetSections = [介绍, 背景]    // Recursively process subsections## 介绍

   ↓

6. diff-detector.ts: Detect changes    if (source.subsections.length > 0) {本讲座涵盖动态规划。

   changes = [

     { type: 'modified', section: 'Intro' },      processSections(

     { type: 'added', section: 'Theory' }

   ]        source.subsections,### 关键概念

   ↓

7. translator.ts: Translate changed sections        target.subsections,我们研究价值函数。

   - Intro: UPDATE mode (was modified)

   - Theory: NEW mode (was added)        level + 1

   ↓

8. file-processor.ts: Parse subsections from translated content (v0.4.3)      );Provide the UPDATED CHINESE translation that reflects the changes in the new English version.

   - Extract ### subsections from translated text

   - Strip subsections from section.content    }Output only the translation, no explanations.

   - Add to section.subsections array

   ↓  });```

9. file-processor.ts: Reconstruct document

   - Combine frontmatter + preamble + sections};

   - Append subsections from array (not from content)

   ↓```**Why This Works**:

10. heading-map.ts: Update heading-map

    - Add new section: theory → "理论"- Claude sees what changed (old vs new)

    - Add subsections recursively

    ↓**Size**: ~140 lines- Claude preserves existing style (current translation)

11. index.ts: Create PR in Chinese repo

    - Title: "Update intro.md"- Claude updates only what's necessary

    - Body: Links to source PR

    - Files: lectures/intro.md---- Full section provides context for coherent prose

```



---

## Data Flow**`translateNewSection(request: SectionTranslationRequest): Promise<string>`**

## Key Implementation Details



### Subsection Handling (v0.4.3)

### Scenario: Adding "## Economic Models" SectionHandles ADDED sections. Translates from scratch.

**Problem**: Subsections (`### Heading`) need special handling because:

1. They appear in translated content but weren't tracked

2. Heading-map was incomplete without them

3. Could duplicate if not handled carefully**Input**:**Prompt Structure**:



**Solution**:- English PR merged with new section```

1. **Parse**: Extract subsections from translated content

2. **Strip**: Remove subsections from section.content- Chinese translation exists (5 sections)Translate this English section to Chinese.

3. **Track**: Store in section.subsections array

4. **Map**: Include in heading-map updates

5. **Reconstruct**: Append from array, not content

**Step-by-Step**:RULES:

**Result**: No duplication, complete heading-maps, proper subsection tracking.

1. Translate all prose content

### Root-Level File Support (v0.4.3)

1. **Detection** (`index.ts`)2. Preserve code blocks unchanged

**Problem**: Files at repository root (not in subfolder) need special handling.

   ```3. Preserve math equations unchanged

**GitHub Actions Quirk**: Converts `docs-folder: '.'` to `docs-folder: '/'`

   Merged PR #42: "Add economic models section"4. Preserve MyST directives unchanged

**Solution**:

```typescript   Changed files: lectures/intro.md5. Use glossary terms consistently

// index.ts:

let docsFolder = core.getInput('docs-folder') || 'lectures/';   ```



// Handle both '.' and '/' as rootGLOSSARY (if applicable):

if (docsFolder === '.' || docsFolder === '/') {

  docsFolder = '';2. **Parsing** (`parser.ts`)- household: 家庭

}

   ```- optimization: 优化

// Normalize: add trailing slash (but skip empty string)

if (docsFolder && !docsFolder.endsWith('/')) {   Old English: 5 sections [Getting Started, Math, Python, Data, Conclusion]

  docsFolder = docsFolder + '/';

}   New English: 6 sections [Getting Started, Models, Math, Python, Data, Conclusion]ENGLISH SECTION:



// Filter files   Chinese: 5 sections## Economic Models

const changedFiles = allFiles.filter(file => {

  if (docsFolder === '') {   ```We examine household optimization problems in dynamic settings.

    // Root level: any .md file in root (not in subdirectories)

    return file.endsWith('.md') && !file.includes('/');

  } else {

    // Subfolder: files starting with docsFolder3. **Diff Detection** (`diff-detector.ts`)### The Bellman Equation

    return file.startsWith(docsFolder) && file.endsWith('.md');

  }   ```The value function satisfies:

});

```   Change detected:



### Error Handling   - Type: ADDED$$



**Parser Errors**:   - Section: "## Economic Models"V(x) = \max_{c} u(c) + \beta V(x')

- Invalid MyST syntax → Include in PR as comment

- Missing frontmatter → Create new frontmatter   - Position: 1 (after Getting Started)$$

- Unclosed blocks → Validation warning

   ```

**Translation Errors**:

- API timeout → Retry with exponential backoffProvide the complete Chinese translation.

- Rate limit → Wait and retry

- Invalid response → Log and skip section4. **Translation** (`translator.ts`)Output only the translation, no explanations.



**Diff Detection Edge Cases**:   ``````

- Empty documents → Treat as all sections added

- No changes → Skip translation   Mode: NEW (ADDED section)

- Preamble only change → Translate preamble only

   Input: "## Economic Models\n\nThis section covers..."**`translateFullDocument(request: TranslationRequest): Promise<string>`**

---

   Output: "## 经济模型\n\n本节介绍..."

## Testing Strategy

   Glossary used: "economic model" → "经济模型"Handles completely new files. Translates entire document (not used for section updates).

See [TESTING.md](TESTING.md) for complete testing guide.

   ```

**Test Coverage**: 121 tests across 5 test files

**`formatGlossary(glossary: Glossary, targetLanguage: string): string`**

**Key Test Areas**:

1. Parser: MyST parsing, frontmatter, subsections5. **Reconstruction** (`file-processor.ts`)

2. Diff Detector: Change detection, matching strategies

3. File Processor: Section reconstruction, subsection handling   ```Formats glossary terms for inclusion in prompts:

4. Heading-Map: Map updates, subsection inclusion

5. Integration: End-to-end workflows   Parse Chinese sections (5)



**Regression Tests** (v0.4.3):   Insert translated section at position 1```typescript

- Subsection duplication prevention

- Heading-map completeness   Result: 6 sections// Input:

- Root-level file handling

   Update heading-map: "Economic Models" → "经济模型"{ terms: { "household": "家庭", "equilibrium": "均衡" } }

---

   ```

## Performance

// Output:

**Benchmarks** (typical lecture):

- Parsing: ~5ms for 500-line document6. **PR Creation** (`index.ts`)"- household: 家庭\n- equilibrium: 均衡"

- Diff detection: ~10ms for 20 sections

- Translation: ~5s per section (Claude API)   ``````

- Reconstruction: ~2ms

- **Total**: ~2-3 minutes for typical lecture (15-20 sections)   Create branch: translation-sync-2025-10-18...



**Optimizations**:   Commit: "Update intro.md - Add Economic Models section"#### Claude Model

- Only translate changed sections (not entire document)

- Parallel section translation (when possible)   Open PR in Chinese repo

- Efficient line-by-line parsing (no AST)

- Minimal bundle size (1794kB)   ```Uses **Claude Sonnet 4.5** (`claude-sonnet-4.5-20241022`):



---- Latest and most capable model



## Dependencies**Result**: Chinese PR ready for review with new section inserted at correct position.- Best at following complex instructions



**Core Dependencies**:- Excellent at preserving formatting

- `@actions/core`: GitHub Actions integration

- `@actions/github`: GitHub API---- Handles long context (full sections)

- `@anthropic-ai/sdk`: Claude API

- `@octokit/rest`: GitHub REST API



**No AST Dependencies**:## Key Implementation Details#### Token Usage

- ❌ `unified`, `remark`, `remark-parse`

- ❌ `mdast-util-*` packages

- ✅ Simple line-by-line parsing instead

### Section Matching StrategyLogged for each translation:

**Total Bundle**: 1794kB (28% reduction from v0.2.x)

```

---

**Challenge**: How to match sections when structure changes?Input tokens: 523

## Future Improvements

Output tokens: 412

See [TODO.md](TODO.md) for roadmap.

**Solution**: Three-tier matchingTotal cost: $0.012

**Potential Enhancements**:

- Parallel section translation1. **Exact ID match**: `section.id === targetSection.id````

- Translation caching

- Additional languages2. **Heading-map lookup**: Use English → Chinese mapping

- Custom glossaries

- Quality metrics3. **Position fallback**: Match by index if no ID matchHelps track API usage and costs.



---



**Last Updated**: October 24, 2025**Why this works**:### 4. File Processor (`src/file-processor.ts` - 244 lines)


- ID matching handles unchanged sections

- Heading-map handles cross-language matching#### Purpose

- Position fallback handles new sectionsOrchestrate the translation workflow for each file.



### Content Preservation#### Key Functions



**Challenge**: Preserve code, math, MyST syntax**`processSectionBased(oldEnglish, newEnglish, currentTarget, ...): Promise<string>`**



**Solution**: Claude prompt engineeringMain workflow for existing files (incremental translation).

```

CRITICAL RULES:**Algorithm**:

1. Code blocks (```) - Do NOT translate, copy exactly1. **Detect Changes**: Call diff detector on old/new English

2. Math equations ($$, $) - Do NOT translate, copy exactly     ```typescript

3. MyST directives ({note}, {warning}) - Keep syntax, translate content   const changes = await diffDetector.detectSectionChanges(

4. URLs - Do NOT translate     oldEnglish, 

5. Variable names - Do NOT translate     newEnglish, 

```     filepath

   );

**Works because**: Claude Sonnet 4.5 follows instructions precisely   ```



### Frontmatter & Preamble Preservation2. **Parse Target**: Split current Chinese into sections

   ```typescript

**Challenge**: Don't lose Jupyter metadata or document title   const targetSections = parser.parseSections(currentTarget, filepath);

   ```

**Solution**: Parser extracts, processor preserves

```typescript3. **Process Each Change**:

const { frontmatter, preamble, sections } = parser.parseSections(content);   ```typescript

   for (const change of changes) {

// After translation...     if (change.type === 'added') {

const newContent = reconstructFromSections(       // Translate new section

  translatedSections,       const translation = await translator.translateSection({

  frontmatter,  // Preserved!         mode: 'new',

  preamble      // Preserved!         englishSection: change.newSection,

);         targetLanguage,

```         glossary

       });

### Subsection Handling (v0.4.3 Feature)       

       // Insert at position

**Challenge**: Subsections (###) weren't being tracked for incremental updates       targetSections.splice(change.position, 0, {

         ...change.newSection,

**Problem**:          content: translation

- Old behavior: Only ## sections in heading-map       });

- Result: Subsection changes triggered full section re-translation     }

     

**Solution** (v0.4.3):     else if (change.type === 'modified') {

1. After translating a section, parse the translated content       // Find matching section in target

2. Extract subsections using `parseTranslatedSubsections()`       const index = this.findMatchingSectionIndex(

3. Add subsections to Section object         targetSections,

4. Recursively process subsections in `updateHeadingMap()`         change.newSection,

         change.position

**Result**:       );

- Heading-map includes subsections       

- Incremental subsection updates work       // Translate with UPDATE mode

- Example: 10 sections + 5 subsections = 15 heading-map entries       const translation = await translator.translateSection({

         mode: 'update',

**Implementation**:         oldEnglish: change.oldSection.content,

```typescript         newEnglish: change.newSection.content,

// In file-processor.ts         currentTranslation: targetSections[index].content,

const translatedContent = await translator.translateSection(section);         targetLanguage,

         glossary

// Extract subsections from translated content       });

const subsections = await this.parseTranslatedSubsections(       

  translatedContent,       // Replace section

  section       targetSections[index] = {

);         ...targetSections[index],

         content: translation

// Create section with subsections       };

const translatedSection: Section = {     }

  ...section,     

  content: translatedContent,     else if (change.type === 'deleted') {

  subsections: subsections  // Now included!       // Find and remove section

};       const index = this.findMatchingSectionIndex(...);

```       targetSections.splice(index, 1);

     }

**Critical Bug Fix** (also v0.4.3):   }

- `reconstructFromSections()` was appending subsections twice   ```

- Problem: section.content already includes subsections

- Solution: Don't append subsections separately, they're already there4. **Reconstruct Document**: Join sections back together

   ```typescript

---   const result = this.reconstructFromSections(targetSections);

   ```

## Error Handling

5. **Validate**: Check MyST syntax

### API Errors   ```typescript

   const validation = parser.validateMyST(result, filepath);

**Claude API failures**:   if (!validation.valid) {

```typescript     throw new Error(`Invalid MyST: ${validation.errors.join(', ')}`);

try {   }

  const translation = await claude.messages.create({...});   ```

} catch (error) {

  core.warning(`Translation failed: ${error.message}`);6. **Return**: Translated document

  // Continue with next section

}**`findMatchingSectionIndex(targetSections, sourceSection, position): number`**

```

Finds the index of the corresponding section in the target document.

**Strategy**: Fail gracefully, log warnings, continue processing

**Strategy**:

### Validation Errors1. **Position match**: Try `targetSections[position]`

2. **ID match**: Search for section with same ID

**MyST syntax validation**:3. **Throw error**: If no match found (shouldn't happen in normal operation)

```typescript

const validation = await validator.validate(content);**Why Position First?**

if (!validation.valid) {- Most common case: sections in same order

  core.error(`Invalid MyST syntax: ${validation.errors}`);- Fast: O(1) lookup

  // Still create PR with warning comment- Simple: Just index access

}

```**`reconstructFromSections(sections: Section[]): string`**



**Strategy**: Create PR anyway with validation warnings for human reviewJoins sections back into a complete document.



### GitHub API Errors```typescript

// Input:

**Rate limiting, network issues**:[

```typescript  { heading: "Introduction", content: "The intro.\n\n### Background\n..." },

const octokit = github.getOctokit(token, {  { heading: "Theory", content: "The math." }

  retry: {]

    enabled: true,

    retries: 3// Output:

  }## Introduction

});The intro.

```

### Background

**Strategy**: Automatic retries with exponential backoff...



---## Theory

The math.

## Performance Characteristics```



**Typical Lecture File**:**Algorithm**:

- Size: ~50KB1. For each section: Add `## ${heading}\n${content}`

- Sections: 8-122. Join with `\n\n` (double newline between sections)

- Processing time: 2-3 minutes3. Trim whitespace from start and end

- API calls: 9-13 (1 preamble + 8-12 sections)4. Ensure file ends with single newline



**Optimization Strategies**:**`processFull(englishContent, ...): Promise<string>`**

1. **Parallel parsing**: Source and target parsed concurrently

2. **Caching**: Unchanged sections not re-translatedHandles completely new files (full translation, not section-based).

3. **Incremental**: Only changed sections translated

4. **Heading-map**: Enables precise section matching1. Translate entire document

2. Return translated content

**Token Usage** (Claude API):3. (TOC management not yet implemented)

- Average section: ~800 tokens input, ~600 tokens output

- Cost: ~$0.10-0.15 per lecture file**`validateMyST(content, filepath): void`**

- Budget: Claude Sonnet 4.5 pricing

Validates MyST syntax and throws if errors found:

---- Unclosed code blocks

- Unclosed directives

## Testing- Malformed headings



Tests ensure correctness before code reaches production. See [TESTING.md](TESTING.md) for full details.### 5. Main Entry Point (`src/index.ts`)



**Test Structure**: 87 tests across 5 files#### Purpose

- `parser.test.ts`: MyST parsing, frontmatter extraction (15 tests)GitHub Action entry point that orchestrates the workflow.

- `diff-detector.test.ts`: Change detection (15 tests)

- `file-processor.test.ts`: Section matching, reconstruction (20 tests)#### Key Functions

- `heading-map.test.ts`: Heading-map operations (28 tests)

- `integration.test.ts`: End-to-end workflows (9 tests)**`run(): Promise<void>`**



**Regression Tests** (v0.4.3):Main action function:

- 10 tests prevent regression of subsection bugs

- Test subsection parsing, heading-map inclusion, no duplication1. **Validate Event**: Check PR was merged (not just closed)

- See [REGRESSION-TESTS-v0.4.3.md](REGRESSION-TESTS-v0.4.3.md) for details   ```typescript

   if (!context.payload.pull_request?.merged) {

**Running Tests**:     core.setFailed('PR was not merged');

```bash     return;

npm test              # All tests   }

npm test -- --watch   # Watch mode   ```

npm test -- parser    # Specific file

```2. **Get Changed Files**: From PR diff

   ```typescript

---   const files = await github.rest.pulls.listFiles({

     owner, repo,

## Debugging     pull_number: pr.number

   });

### Enable Debug Logging   ```



Set `INPUT_DEBUG: 'true'` in workflow or action inputs.3. **Filter Markdown Files**: Only process `*.md` in docs folder

   ```typescript

**Output**:   const mdFiles = files.data.filter(f => 

```     f.filename.endsWith('.md') &&

[FileProcessor] Processing lectures/intro.md     f.filename.startsWith(inputs.docsFolder)

[FileProcessor] Source sections: 6   );

[FileProcessor] Target sections: 5   ```

[DiffDetector] Detected 1 ADDED, 0 MODIFIED, 0 DELETED

[Translator] Translating NEW section: Economic Models4. **Load Glossary**: From repo or built-in

[FileProcessor] Updated heading map to 6 entries   ```typescript

```   const glossary = await loadGlossary(

     inputs.glossaryPath,

### Check Action Logs     inputs.targetLanguage

   );

GitHub Actions → Your workflow → Translation job   ```



Look for:5. **Process Each File**:

- Section counts   ```typescript

- Change detection results   for (const file of mdFiles) {

- Translation API calls     const processor = new FileProcessor(...);

- Heading-map updates     

     if (targetFileExists) {

### Manual Testing       // Incremental translation

       const result = await processor.processSectionBased(

Use test repositories for manual validation:         oldEnglish,

1. Set up test repos (see [TEST-REPOSITORIES.md](TEST-REPOSITORIES.md))         newEnglish,

2. Create test PR in English repo         currentTarget,

3. Merge and watch action run         ...

4. Verify Chinese PR created correctly       );

5. Check translation quality and structure     } else {

       // Full translation

---       const result = await processor.processFull(...);

     }

## Common Issues & Solutions     

     translatedFiles.push({

### Issue: Section not translated       path: file.filename,

       content: result

**Symptoms**: English section appears in Chinese output     });

   }

**Causes**:   ```

- Section ID mismatch

- Heading-map out of sync6. **Create PR**: In target repository (future)

- Translation API error   ```typescript

   // TODO: Implement PR creation

**Debug**:   ```

```bash

# Check heading-map in Chinese file frontmatter7. **Handle Errors**: Fail workflow if anything goes wrong

grep -A 20 "heading-map:" lectures/file.md   ```typescript

   } catch (error) {

# Check action logs for translation errors     core.setFailed(error.message);

# Look for: "Translation failed" or "API error"   }

```   ```



**Solution**: ### 6. Type Definitions (`src/types.ts` - 125 lines)

- Update heading-map manually if needed

- Re-run actionAll TypeScript interfaces for the section-based approach:

- Check API key valid

```typescript

### Issue: Duplicate subsections// Core section structure

interface Section {

**Symptoms**: Subsections appear twice in output (Fixed in v0.4.3)  heading: string;

  level: number;

**Cause**: `reconstructFromSections()` was appending subsections that were already in section.content  id: string;

  content: string;

**Solution**: ✅ Fixed in v0.4.3 - section.content already includes subsections, don't append them again  startLine: number;

  endLine: number;

### Issue: Missing frontmatter  subsections: string[];

}

**Symptoms**: Jupyter metadata lost, notebook invalid

// Change detection

**Cause**: Parser not extracting frontmatter, or reconstruction not including itinterface SectionChange {

  type: 'added' | 'modified' | 'deleted';

**Debug**:  oldSection?: Section;

```typescript  newSection?: Section;

const { frontmatter, preamble, sections } = await parser.parseSections(content);  position?: number;

console.log('Frontmatter:', frontmatter ? 'Found' : 'Missing');}

```

// Translation requests

**Solution**: Ensure `reconstructFromSections()` receives frontmatter parameterinterface SectionTranslationRequest {

  mode: 'update' | 'new';

### Issue: Code blocks translated  

  // For UPDATE mode:

**Symptoms**: Python code contains Chinese text, syntax errors  oldEnglish?: string;

  newEnglish?: string;

**Cause**: Claude not following preservation rules  currentTranslation?: string;

  

**Solution**:   // For NEW mode:

- Check translator prompt includes code preservation rules  englishSection?: Section;

- Verify code blocks properly marked with ```   

- May need to adjust Claude prompt  // Common:

  targetLanguage: string;

---  sourceLanguage: string;

  glossary?: Glossary;

## Version History}



### v0.4.3 (Current)// Glossary

- ✅ Subsection parsing from translated contentinterface Glossary {

- ✅ Subsections included in heading-map (15 entries instead of 10)  version: string;

- ✅ Fixed subsection duplication bug  targetLanguage: string;

- ✅ Enhanced debug logging  terms: Record<string, string>;

- ✅ 10 regression tests added (87 total)}



### v0.3.0// Action inputs

- Section-based architectureinterface ActionInputs {

- Heading-map system  targetRepo: string;

- Position-based matching  targetLanguage: string;

- 43% code reduction  sourceLanguage: string;

  docsFolder: string;

### v0.2.2  glossaryPath?: string;

- Working prototype  tocFile: string;

- Block-based approach (deprecated)  anthropicApiKey: string;

  githubToken: string;

### v0.1.x  prLabels?: string;

- Initial development  prReviewers?: string;

- Basic translation}



---// Results

interface TranslatedFile {

## Related Documentation  path: string;

  content: string;

- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview  changeType: 'modified' | 'added';

- **[PROJECT-DESIGN.md](PROJECT-DESIGN.md)** - Design decisions and rationale}

- **[TESTING.md](TESTING.md)** - Testing guide and test suite

- **[HEADING-MAPS.md](HEADING-MAPS.md)** - Heading-map system detailsinterface SyncResult {

- **[CLAUDE-MODELS.md](CLAUDE-MODELS.md)** - AI model information  files: TranslatedFile[];

- **[QUICKSTART.md](QUICKSTART.md)** - Developer onboarding guide  prUrl?: string;

- **[TEST-REPOSITORIES.md](TEST-REPOSITORIES.md)** - Manual testing setup  success: boolean;

}

---```



## Contributing## Data Flow Example



When adding features:Let's trace what happens when "## Economic Models" is added as the 3rd section:



1. **Update tests first**: Write failing test for new behavior### 1. Trigger (GitHub Actions)

2. **Implement feature**: Make test pass```

3. **Add regression test**: Prevent future bugsPR #42 merged in quantecon/lecture-python.myst

4. **Update docs**: Keep this file currentChanged: lectures/aiyagari.md

5. **Test manually**: Use test repositories```



When fixing bugs:### 2. Entry Point (index.ts)

```typescript

1. **Write regression test**: Test that fails with bug// Detect changed files

2. **Fix the bug**: Make test passconst files = ['lectures/aiyagari.md'];

3. **Verify no regressions**: Run all 87 tests

4. **Document the fix**: Add to version history// Load old and new versions

5. **Update validation**: Manual test with real contentconst oldEnglish = "... ## Introduction ... ## Theory ...";

const newEnglish = "... ## Introduction ... ## Economic Models ... ## Theory ...";

---

// Load current target

## Questions?const currentChinese = "... ## 介绍 ... ## 理论 ...";

```

- **Architecture questions**: See [ARCHITECTURE.md](ARCHITECTURE.md)

- **Design decisions**: See [PROJECT-DESIGN.md](PROJECT-DESIGN.md)### 3. Diff Detection (diff-detector.ts)

- **Setup help**: See [QUICKSTART.md](QUICKSTART.md)```typescript

- **Testing help**: See [TESTING.md](TESTING.md)// Parse old English: 2 sections

- **Issues**: Open GitHub issue with debug logs[

  { heading: "Introduction", position: 0, ... },
  { heading: "Theory", position: 1, ... }
]

// Parse new English: 3 sections
[
  { heading: "Introduction", position: 0, ... },
  { heading: "Economic Models", position: 1, ... },
  { heading: "Theory", position: 2, ... }
]

// Detect changes:
[
  {
    type: 'added',
    newSection: { heading: "Economic Models", ... },
    position: 1
  }
]
```

### 4. Translation (translator.ts)
```typescript
// Translate new section
const prompt = `
Translate this English section to Chinese.

GLOSSARY:
- household: 家庭
- optimization: 优化

ENGLISH SECTION:
## Economic Models
We examine household optimization problems...
`;

const response = await claude.messages.create({
  model: 'claude-sonnet-4.5-20241022',
  messages: [{ role: 'user', content: prompt }]
});

const translation = "## 经济模型\n我们研究家庭优化问题...";
```

### 5. File Processing (file-processor.ts)
```typescript
// Parse current Chinese: 2 sections
const targetSections = [
  { heading: "介绍", ... },
  { heading: "理论", ... }
];

// Insert at position 1
targetSections.splice(1, 0, {
  heading: "经济模型",
  content: "我们研究家庭优化问题..."
});

// Now: 3 sections
[
  { heading: "介绍", position: 0, ... },
  { heading: "经济模型", position: 1, ... },
  { heading: "理论", position: 2, ... }
]

// Reconstruct document
const result = `
## 介绍
...

## 经济模型
我们研究家庭优化问题...

## 理论
...
`;
```

### 6. Result
```typescript
// Create PR in quantecon/lecture-python.zh-cn
{
  files: [{
    path: 'lectures/aiyagari.md',
    content: '... ## 介绍 ... ## 经济模型 ... ## 理论 ...',
    changeType: 'modified'
  }],
  prUrl: 'https://github.com/quantecon/lecture-python.zh-cn/pull/123'
}
```

## Key Design Decisions

### 1. Why Section-Based?

**Alternatives Considered**:
- **Line-based diff**: Too fragile (formatting changes trigger re-translation)
- **Paragraph-based**: Loses context, complex matching
- **Full document**: Wasteful, loses existing translations

**Why Sections Won**:
- Natural semantic unit (## Introduction, ## Theory, etc.)
- Provides full context for Claude
- Position-based matching works across languages
- Simple to parse and reconstruct
- Matches how humans think about documents

### 2. Why Position Matching?

**Alternatives Considered**:
- **Heading text matching**: Breaks with translation ("Introduction" vs "介绍")
- **ID matching only**: Breaks when headings renamed
- **Content similarity**: Complex, slow, unreliable

**Why Position Won**:
- Language-independent (index 0 → index 0)
- Fast and simple (O(1) lookup)
- Robust to translation differences
- Works for 95% of edits (sections stay in order)
- ID matching as fallback for edge cases

### 3. Why No AST Parsing?

**Alternatives Considered**:
- **unified + remark**: Full AST parsing (our old approach)
- **markdown-it**: Different AST parser
- **Custom parser**: Full MyST grammar

**Why Line-by-Line Won**:
- Sufficient for detecting `## ` headings
- No dependencies (700kB saved)
- Faster parsing
- Easier to maintain
- Less code (390 → 172 lines)

### 4. Why UPDATE Mode?

**Alternatives Considered**:
- **Full re-translation**: Loses existing style and terminology
- **Diff translation with context**: Complex prompt engineering
- **Translation memory**: Requires database

**Why UPDATE Won**:
- Preserves existing translation style
- Claude sees exactly what changed
- Maintains terminology consistency
- Simple prompt structure
- Best translation quality

## Performance Characteristics

### Parser
- **Speed**: O(n) where n = number of lines
- **Memory**: O(s) where s = number of sections
- **Typical**: <100ms for lecture-sized files

### Diff Detector
- **Speed**: O(s) where s = number of sections (position matching is O(1))
- **Memory**: O(s) for section storage
- **Typical**: <50ms for lecture-sized files

### Translator
- **Speed**: Limited by Claude API (~2-5 seconds per section)
- **Memory**: O(content size) for prompt construction
- **Typical**: 3 seconds per section, parallel processing possible

### File Processor
- **Speed**: Sum of diff + translation + reconstruction
- **Memory**: O(file size) for document in memory
- **Typical**: 5-15 seconds per file depending on changes

## Error Handling

### Parse Errors
- Invalid MyST syntax detected
- Unclosed code blocks or directives
- **Action**: Fail workflow with error details

### Translation Errors
- Claude API failure (timeout, rate limit, invalid response)
- Translation doesn't match format
- **Action**: Retry once, then fail workflow

### Validation Errors
- Translated content has MyST syntax errors
- Sections missing after reconstruction
- **Action**: Fail workflow, preserve original

### GitHub Errors
- Can't fetch old/new file content
- Can't create PR in target repo
- **Action**: Fail workflow with detailed error

## Testing Strategy

### Unit Tests
- Parser: Test section splitting, ID generation, subsection detection
- Diff Detector: Test position matching, ID fallback, change detection
- Translator: Test prompt construction (mock Claude API)
- File Processor: Test section operations (mock translation)

### Integration Tests
- End-to-end file processing with real files
- Mock Claude API responses
- Verify section order maintained
- Check MyST validity

### Manual Tests
- Real PR in test repository
- Verify GitHub Actions workflow
- Check translation quality
- Validate PR creation

## Deployment

### Build Process
1. `npm install` - Install dependencies
2. `npm run build` - Compile TypeScript + bundle with ncc
3. Result: `dist/index.js` (1794kB)

### Bundle Contents
- Compiled TypeScript (976 lines → ~50kB)
- Node modules (Anthropic SDK, GitHub SDK)
- Action runner code
- Total: 1794kB (down from 2492kB)

### Release Process
1. Commit changes
2. Update version in `package.json`
3. Run `npm run build`
4. Commit `dist/index.js`
5. Create Git tag (e.g., `v0.3.0`)
6. Push to GitHub
7. Create GitHub Release

### Action Usage
```yaml
- uses: quantecon/action-translation-sync@v0.3.0
  with:
    target-repo: 'quantecon/lecture-python.zh-cn'
    target-language: 'zh-cn'
    # ... other inputs
```

## Monitoring & Debugging

### Logging
- `@actions/core.info()` for progress
- `@actions/core.debug()` for details (enabled with `ACTIONS_STEP_DEBUG`)
- `@actions/core.warning()` for non-fatal issues
- `@actions/core.error()` for failures

### Debug Output
```
[info] Processing file: lectures/aiyagari.md
[debug] Old version: 142 lines, 2 sections
[debug] New version: 168 lines, 3 sections
[info] Detected changes: 1 added, 0 modified, 0 deleted
[info] Section added at position 1: Economic Models
[debug] Translating new section (487 tokens)
[info] Translation complete (412 output tokens)
[info] Reconstructed document: 186 lines
[info] MyST validation: passed
```

### Cost Tracking
```
[info] Token usage for lectures/aiyagari.md:
  Input: 523 tokens
  Output: 412 tokens
  Cost: $0.012
[info] Total session tokens: 1847 input, 1456 output
[info] Total session cost: $0.043
```

## Future Enhancements

### Short Term
- [ ] TOC management for new files
- [ ] Parallel section translation (process multiple sections simultaneously)
- [ ] Better error messages (show section headings in errors)
- [ ] Dry-run mode (preview changes without creating PR)

### Medium Term
- [ ] Translation confidence scoring (flag uncertain translations)
- [ ] Support for other languages (Japanese, Spanish)
- [ ] Automatic glossary expansion (learn new terms from translations)
- [ ] Translation memory (reuse previous translations)

### Long Term
- [ ] Multi-file atomic operations (all files succeed or none)
- [ ] Incremental TOC updates (not just new files)
- [ ] Section-level rollback (undo bad translations)
- [ ] Quality metrics dashboard (translation accuracy, cost, time)

## Conclusion

The section-based implementation is:

✅ **Simple**: 976 lines of core code, no complex algorithms  
✅ **Fast**: Position matching is O(1), parsing is O(n)  
✅ **Maintainable**: Clear separation of concerns, well-documented  
✅ **Reliable**: Position matching robust across languages  
✅ **Compact**: 28% smaller bundle (1794kB vs 2492kB)  
✅ **Effective**: Full context produces better translations  

The implementation proves that **simpler is better** - we removed 43% of code and got better results.
