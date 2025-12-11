# Test Fixtures for Alignment Tool

This directory contains test fixtures for the `tool-alignment` diagnostic tool.

## Structure

Each test case is a numbered directory containing:
- `source/` - English source files
- `target/` - Chinese (zh-cn) target files  
- `expected.json` - Expected analysis results

## Test Cases

### Alignment Status Tests

| # | Name | Description | Expected Status |
|---|------|-------------|-----------------|
| 01 | `aligned-perfect` | Identical structure, no heading-map | `aligned` |
| 02 | `aligned-with-heading-map` | Identical structure with heading-map | `aligned` |
| 03 | `likely-aligned` | Minor differences (code block count) | `likely-aligned` |
| 04 | `needs-review-missing-section` | Target missing 1 of 5 sections | `needs-review` |
| 05 | `needs-review-extra-section` | Target has 1 extra section | `needs-review` |
| 06 | `diverged-major` | Major mismatch (6 vs 2 sections) | `diverged` |

### File Status Tests

| # | Name | Description | Expected Status |
|---|------|-------------|-----------------|
| 07 | `missing-file` | File only exists in source | `missing` |
| 08 | `extra-file` | File only exists in target | `extra` |

### Config File Tests

| # | Name | Description | Expected Status |
|---|------|-------------|-----------------|
| 09 | `config-identical` | Identical `_toc.yml` | `identical` |
| 10 | `config-diverged` | Different chapter counts | `diverged` |

### Edge Cases

| # | Name | Description | Tests |
|---|------|-------------|-------|
| 11 | `subsections-nested` | Deep nesting (##, ###, ####, #####) | Subsection counting |
| 12 | `code-math-blocks` | Code and math block counting | Block detection |
| 13 | `multi-file-mixed` | Multiple files with mixed status | Full report |

## Running Tests

```bash
cd tool-alignment
npm test
```

## Adding New Test Cases

1. Create numbered directory: `14-your-test-name/`
2. Add `source/` and `target/` subdirectories
3. Create test files in each
4. Add `expected.json` with expected results
5. Update this README
6. Add test case to `structural-analyzer.test.ts`
