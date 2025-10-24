# Bug Analysis: Heading-Map Losing Chinese Translations

## Problem Statement

When the translator returns incomplete nested structure (missing #### subsections), the fix in commit `ab971cb` uses `newSection.subsections` (source/English) instead of `targetSection.subsections` (target/Chinese). This preserves the document structure BUT causes the heading-map to extract English headings instead of Chinese translations.

## Evidence from PR #265

**SOURCE PR #300**: Only content changes, NO heading changes
- All headings remain unchanged in English
- Content updated within sections

**TARGET PR #265 Result** (BROKEN):

### Heading-Map Changes:
```diff
- Vector Spaces::Basic Properties: 基本性质
- Vector Spaces::Basic Properties::Applications in Economics: 在经济学中的应用
+ Vector Spaces::Basic Properties: Basic Properties
```

### Document Changes:
```diff
- ### 基本性质
+ ### Basic Properties

- #### 在经济学中的应用
+ #### Applications in Economics
```

**Impact**: Entire `### Basic Properties` section (including #### subsection) now in English.

## Root Cause Analysis

### Code Flow Trace

#### Step 1: Parse Source (English)
**File**: `src/parser.ts:parseSections()`
```typescript
// Parses source PR #300
sections = [
  {
    heading: "## Vector Spaces",
    subsections: [
      {
        heading: "### Basic Properties",
        subsections: [
          { heading: "#### Applications in Economics", ... }
        ]
      }
    ]
  }
]
```
**Status**: ✅ Working correctly

#### Step 2: Detect Changes
**File**: `src/diff-detector.ts:detectSectionChanges()`
```typescript
// Compares source vs target
// Finds: "### Basic Properties" is MODIFIED (content changed)
// Reason: Content updates in lines 54-58, 59-60
changes = [
  {
    type: 'MODIFIED',
    section: /* English section */,
    oldSection: /* English section */,
    targetSection: /* Chinese section */
  }
]
```
**Status**: ✅ Detection working correctly

#### Step 3: Translate Section
**File**: `src/translator.ts:translateSection()`
```typescript
// UPDATE mode: old English + new English + current Chinese
// Claude returns: Updated Chinese content
// BUT: Does NOT return nested structure (no ###, no ####)
translatedContent = "向量空间满足几个关键性质：\n- Closure under...\n..."
// Missing: "### 基本性质" heading
// Missing: "#### 在经济学中的应用" subsection
```
**Status**: ⚠️ Translator incomplete (expected behavior)

#### Step 4: Parse Translated Content
**File**: `src/file-processor.ts:parseTranslatedSubsections()`
```typescript
// Tries to parse subsections from translated content
subsections = parseSections(translatedContent, level + 1);
// Result: subsections = [] (empty - no ### or #### found)
```
**Status**: ✅ Parser working correctly (nothing to parse)

#### Step 5: Validate Structure (⚠️ CRITICAL DECISION POINT)
**File**: `src/file-processor.ts:processTranslation()`  
**Lines**: 245-295
```typescript
// Compare subsection counts
if (!validateSubsectionStructure(
  newSection.subsections,        // English: 1 ### with 1 ####
  subsections                     // Translated: [] (empty)
)) {
  // MISMATCH DETECTED!
  console.log(
    `⚠️ Subsection structure mismatch for section "${newSection.heading}". ` +
    `Preserving original structure.`
  );
  
  // THIS IS THE FIX FROM ab971cb:
  finalSubsections = newSection.subsections;  // ← ENGLISH SUBSECTIONS!
  
  // OLD CODE (before ab971cb):
  // finalSubsections = targetSection.subsections;  // Would use Chinese
}
```
**Status**: ⚠️ **BUG LOCATION** - Uses English subsections

#### Step 6: Reconstruct Section
**File**: `src/file-processor.ts:processTranslation()`
```typescript
return {
  ...newSection,          // English heading: "## Vector Spaces"
  content: translatedContent + '\n\n',
  subsections: finalSubsections  // ENGLISH: [{ heading: "### Basic Properties", ... }]
};
```
**Status**: ⚠️ Section contains English subsections

#### Step 7: Update Heading-Map (⚠️ BUG EXECUTION)
**File**: `src/heading-map.ts:updateHeadingMap()`  
**Lines**: 48-133
```typescript
function updateHeadingMap(
  existingMap: Record<string, string>,
  sections: Section[],
  targetSections: Section[],
  parentPath: string = ''
): Record<string, string> {
  const newMap = { ...existingMap };
  
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    const targetSection = targetSections[i];
    
    // Extract headings
    const sourceHeading = cleanHeading(section.heading);
    const targetHeading = cleanHeading(targetSection.heading);  // ← LINE 107
    
    // Build path
    const path = parentPath
      ? `${parentPath}${PATH_SEPARATOR}${sourceHeading}`
      : sourceHeading;
    
    // Update map
    newMap[path] = targetHeading;  // ← STORES ENGLISH!
    
    // RECURSIVE: Process subsections
    if (section.subsections.length > 0) {
      updateHeadingMap(
        newMap,
        section.subsections,      // ENGLISH subsections from step 6
        targetSection.subsections,  // ALSO ENGLISH (same array!)
        path
      );
    }
  }
  
  return newMap;
}
```

**THE BUG**:
- Line 107: `const targetHeading = cleanHeading(targetSection.heading);`
- `targetSection` comes from the reconstructed section in step 6
- That section's subsections are `newSection.subsections` (ENGLISH)
- So `targetHeading` extracts `"Basic Properties"` instead of `"基本性质"`
- Line 117: `newMap[path] = targetHeading;` stores `"Vector Spaces::Basic Properties": "Basic Properties"`

#### Step 8: Serialize Document
**File**: `src/file-processor.ts:serializeSection()`
```typescript
// Writes section with English subsections
output = `### Basic Properties\n\nVector spaces satisfy...\n\n#### Applications in Economics\n\n...`
```
**Status**: ⚠️ Writes English headings to document

## Why This Happens

### The Problem Chain

1. **Translator incomplete** (expected) → Returns content without nested structure
2. **Validation detects mismatch** (correct) → Decides to preserve structure
3. **Uses source subsections** (ab971cb fix) → Prevents data loss BUT brings English
4. **Heading-map extracts from reconstructed** (bug) → Extracts English headings
5. **Document serialized with English** (bug) → Writes English to file

### The Core Issue

**In `updateHeadingMap()` at line 107**:
```typescript
const targetHeading = cleanHeading(targetSection.heading);
```

When `targetSection.subsections` contains source (English) subsections, this extracts the **English heading** instead of the **Chinese translation**.

## Solution Analysis

### Requirements

1. ✅ **Preserve document structure** - Don't lose #### subsections
2. ✅ **Preserve Chinese headings** - Keep existing translations in heading-map
3. ✅ **Handle missing translations** - Use English for NEW subsections

### Option A: Hybrid Sections
**Create sections with source structure but target headings**

```typescript
// In file-processor.ts when structure mismatch:
function createHybridSubsections(
  sourceSubsections: Section[],
  targetSubsections: Section[]
): Section[] {
  return sourceSubsections.map((sourceSub, i) => {
    const targetSub = targetSubsections[i];
    return {
      ...sourceSub,  // Use source structure/content
      heading: targetSub?.heading || sourceSub.heading,  // Prefer target heading
      subsections: targetSub
        ? createHybridSubsections(sourceSub.subsections, targetSub.subsections)
        : sourceSub.subsections  // No target? Use source
    };
  });
}

// Usage:
finalSubsections = createHybridSubsections(
  newSection.subsections,
  targetSection.subsections
);
```

**Pros**:
- ✅ Preserves structure (source)
- ✅ Preserves headings (target where available)
- ✅ Handles NEW subsections (source headings)

**Cons**:
- Content might not match heading language
- More complex logic

### Option B: Separate Heading Tracking
**Pass source AND target sections separately to heading-map**

```typescript
// Change updateHeadingMap signature:
function updateHeadingMap(
  existingMap: Record<string, string>,
  sourceSections: Section[],    // For structure/paths
  targetSections: Section[],    // For headings
  originalTargetSections: Section[],  // For existing translations
  parentPath: string = ''
): Record<string, string>
```

**Pros**:
- ✅ Clean separation of concerns
- ✅ Explicit handling of source vs target

**Cons**:
- Complex signature
- Need to track multiple section arrays

### Option C: Don't Update Heading-Map for Hybrid Sections
**Skip heading-map updates for sections using source subsections**

```typescript
// In file-processor.ts:
const usedSourceSubsections = !validateSubsectionStructure(...);

// In heading-map.ts:
if (section.usedSourceSubsections) {
  // Don't update heading-map for this section's subsections
  // Keep existing translations
}
```

**Pros**:
- ✅ Simplest fix
- ✅ Preserves existing translations

**Cons**:
- ❌ Won't add NEW subsections to heading-map
- ❌ Missing entries for truly new subsections

### Option D: Hybrid Approach (RECOMMENDED)
**Merge headings from target into source structure**

```typescript
// In file-processor.ts after validation fails:
function mergeHeadingsIntoStructure(
  sourceSubs: Section[],
  targetSubs: Section[]
): Section[] {
  return sourceSubs.map((source, i) => {
    const target = targetSubs[i];
    
    if (!target) {
      // NEW subsection - keep source (English)
      return source;
    }
    
    // Existing subsection - use target heading, source content
    return {
      ...source,
      heading: target.heading,  // Chinese heading
      subsections: mergeHeadingsIntoStructure(
        source.subsections,
        target.subsections
      )
    };
  });
}

// Usage:
finalSubsections = mergeHeadingsIntoStructure(
  newSection.subsections,      // English structure
  targetSection.subsections    // Chinese headings
);
```

**Pros**:
- ✅ Preserves structure from source
- ✅ Preserves headings from target
- ✅ Handles NEW subsections (uses English)
- ✅ Simple, recursive logic
- ✅ Works with existing heading-map update logic

**Cons**:
- None identified

## Recommended Solution: Option D

### Implementation Plan

1. **Add helper function** in `src/file-processor.ts`:
```typescript
/**
 * Merges target headings into source structure.
 * Uses target headings where available, source headings for new sections.
 */
function mergeHeadingsIntoStructure(
  sourceSections: Section[],
  targetSections: Section[]
): Section[] {
  return sourceSections.map((source, i) => {
    const target = targetSections[i];
    
    if (!target || target.heading === source.heading) {
      // No target or same heading (NEW or unchanged) - keep source
      return source;
    }
    
    // Merge: target heading + source content + recursive subsections
    return {
      ...source,
      heading: target.heading,
      subsections: mergeHeadingsIntoStructure(
        source.subsections,
        target.subsections
      )
    };
  });
}
```

2. **Update validation logic** (lines 270-285):
```typescript
if (!validateSubsectionStructure(newSection.subsections, subsections)) {
  console.log(
    `⚠️ Subsection structure mismatch for section "${newSection.heading}". ` +
    `Merging target headings into source structure.`
  );
  
  // Merge target headings into source structure
  finalSubsections = mergeHeadingsIntoStructure(
    newSection.subsections,      // Source structure (English)
    targetSection.subsections    // Target headings (Chinese)
  );
}
```

3. **Add tests** in `src/__tests__/file-processor.test.ts`:
- Test: Preserve Chinese headings when using source subsections
- Test: Use English headings for NEW subsections
- Test: Recursive merging (#### level)

### Expected Outcome

**For PR #265** (Test 09 scenario):

**Heading-Map** (CORRECT):
```yaml
Vector Spaces::Basic Properties: 基本性质  # ← Preserved
Vector Spaces::Basic Properties::Applications in Economics: 在经济学中的应用  # ← Preserved
```

**Document** (CORRECT):
```markdown
### 基本性质  # ← Preserved Chinese heading

Vector spaces satisfy several key properties:  # ← Updated English content
- Closure under addition and scalar multiplication
...

#### 在经济学中的应用  # ← Preserved Chinese heading

Vector space properties are fundamental...  # ← Updated English content
```

**Why This Works**:
1. Source structure preserved (### with ####)
2. Target headings preserved (基本性质, 在经济学中的应用)
3. Content updated (new English text from translation)
4. Heading-map gets Chinese headings (from merged subsections)

## Testing Strategy

### Unit Tests

1. **Test: mergeHeadingsIntoStructure()**
```typescript
describe('mergeHeadingsIntoStructure', () => {
  it('preserves target headings', () => {
    const source = [{
      heading: '### Basic Properties',
      subsections: [{ heading: '#### Applications in Economics' }]
    }];
    const target = [{
      heading: '### 基本性质',
      subsections: [{ heading: '#### 在经济学中的应用' }]
    }];
    
    const result = mergeHeadingsIntoStructure(source, target);
    
    expect(result[0].heading).toBe('### 基本性质');
    expect(result[0].subsections[0].heading).toBe('#### 在经济学中的应用');
  });
  
  it('uses source heading for NEW subsections', () => {
    const source = [{
      heading: '### Basic Properties',
      subsections: [
        { heading: '#### Applications in Economics' },
        { heading: '#### New Subsection' }  // NEW
      ]
    }];
    const target = [{
      heading: '### 基本性质',
      subsections: [{ heading: '#### 在经济学中的应用' }]
      // Missing second subsection
    }];
    
    const result = mergeHeadingsIntoStructure(source, target);
    
    expect(result[0].subsections[1].heading).toBe('#### New Subsection');
  });
});
```

2. **Integration Test: Heading-Map Update**
```typescript
it('preserves Chinese headings in heading-map when using source subsections', async () => {
  // Setup: Source with updated content, target with Chinese headings
  // Translator returns incomplete structure (no ###, ####)
  // Expected: Heading-map preserves Chinese headings
});
```

### GitHub Repository Test

- **Test 09**: Update content under #### subsection
- **Expected**: Heading-map preserves all Chinese headings
- **Verify**: Check PR files tab for heading-map

## Timeline

1. ✅ **Analysis Complete** - This document
2. ⏭️ **Implement Helper** - Add `mergeHeadingsIntoStructure()`
3. ⏭️ **Update Logic** - Change validation to use helper
4. ⏭️ **Add Tests** - Unit + integration tests
5. ⏭️ **Verify Locally** - `npm test` (expect 140+ tests)
6. ⏭️ **Build & Commit** - `npm run build && npm run package`
7. ⏭️ **Test on GitHub** - Reset repos, re-run Test 09
8. ⏭️ **Verify PR #265** - Check heading-map and document

## Version

This fix will be **v0.4.8**.

---

**Last Updated**: October 24, 2025  
**Author**: GitHub Copilot  
**Status**: Analysis Complete, Ready for Implementation
