# E2E Test Fixtures

This directory contains end-to-end test fixtures for validating the complete translation workflow.

## Structure

Each test scenario consists of 4 files:

```
XX-scenario-name-old-en.md        # English document BEFORE changes
XX-scenario-name-new-en.md        # English document AFTER changes
XX-scenario-name-current-zh.md    # Chinese document (current state)
XX-scenario-name-expected-zh.md   # Chinese document (expected after translation)
```

## Test Scenarios

### 01 - Intro Change Only
**What it tests**: Changes to intro text only, all sections unchanged

- **Change**: Intro paragraph reworded
- **Expected**: Only intro translated, all sections preserved

### 02 - Title Change Only  
**What it tests**: Changes to document title (#) only

- **Change**: Title text modified
- **Expected**: Only title translated, intro and sections preserved

### 03 - Section Content Change
**What it tests**: Changes to section content only

- **Change**: Content within a ## section modified
- **Expected**: Only that section translated, others preserved

### 04 - Section Reordering
**What it tests**: Sections moved to different positions

- **Change**: Section order rearranged
- **Expected**: Chinese sections reordered to match, no translation needed

### 05 - Add New Section
**What it tests**: New section added to document

- **Change**: New ## section inserted
- **Expected**: New section translated and inserted at correct position

### 06 - Delete Section
**What it tests**: Section removed from document

- **Change**: A ## section deleted
- **Expected**: Corresponding Chinese section removed

### 07 - Subsection Change
**What it tests**: Changes to ### subsection only

- **Change**: Subsection content modified
- **Expected**: Parent section updated with new subsection translation

### 08 - Multi-Element Change
**What it tests**: Multiple changes in one commit

- **Change**: Title + intro + section all modified
- **Expected**: All changed elements translated, unchanged preserved

## Usage

These fixtures are used by `e2e-fixtures.test.ts` which:

1. Loads the 4 files for each scenario
2. Runs the complete translation pipeline
3. Compares result against expected output

## Adding New Scenarios

To add a new test scenario:

1. Create 4 files with pattern: `XX-name-{old-en,new-en,current-zh,expected-zh}.md`
2. Document the scenario in this README
3. The test suite will automatically detect and run it

## Notes

- Use realistic MyST Markdown structure
- Include frontmatter with jupytext config
- Add heading-map in Chinese files
- Keep scenarios focused on ONE type of change for clarity
