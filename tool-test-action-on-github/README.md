# GitHub Action Test Tool

This tool provides automated testing of the `action-translation-sync` GitHub Action using real GitHub repositories.

## Overview

The test script creates and manages test PRs in source and target repositories to validate that the translation sync workflow functions correctly across various scenarios.

## Prerequisites

- GitHub CLI (`gh`) installed and authenticated
- Push access to test repositories
- Action configured in source repository

## Test Repositories

- **Source**: `QuantEcon/test-translation-sync`
- **Target**: `QuantEcon/test-translation-sync.zh-cn`

## Usage

```bash
cd /path/to/action-translation-sync/tool-test-action-on-github
./test-action-on-github.sh
```

The script will:
1. Reset test repositories to clean state
2. Run 24 automated test scenarios
3. Create PRs in source repository
4. Wait for translation PRs in target repository
5. Report results

## Test Scenarios

The tool tests various translation scenarios:

1. **New section added** - Adding new content
2. **Section removed** - Deleting content
3. **Subsection updated** - Modifying nested content
4. **Multiple elements changed** - Complex updates
5. **Real-world lecture** - Realistic content changes
6. **Sub-subsection operations** - Deep nesting (####, #####)
7. **Code cell changes** - Comments and titles
8. **Display math changes** - LaTeX equation updates
9. **Section deletions** - Removing subsections
10. **Pure reordering** - Structure-only changes
11. **New document** - Adding complete files
12. **Document deletion** - Removing files
13. **Multiple files** - Multi-file changes
14. **Document rename** - File renaming
15. **Preamble only** - Metadata changes
16. **Deep nesting** - Complex hierarchies
17. **Special characters** - Edge cases in headings
18. **Empty sections** - Placeholder headings

## Test Data

All test scenarios and their corresponding MyST Markdown content are stored in `test-action-on-github-data/`:

- `base-minimal.md` / `base-minimal-zh-cn.md` - Minimal test documents
- `base-lecture.md` / `base-lecture-zh-cn.md` - Realistic lecture documents
- `01-intro-change-minimal.md` through `24-empty-sections-minimal.md` - Test scenarios
- `base-toc.yml` / `base-toc-zh-cn.yml` - Table of contents files

## Test Mode

The script uses **TEST mode** which:
- Uses PR head commit (not merge commit)
- Skips actual translation (returns placeholder text)
- Validates workflow mechanics without API costs
- Triggered by PR label `test-translation`

## Reports

Test results and evaluations are stored in `reports/`:
- GPT5 evaluation reports
- Analysis of all test scenarios
- Translation quality assessments

## Troubleshooting

**Script fails to reset repositories:**
- Check GitHub CLI authentication: `gh auth status`
- Verify repository access permissions

**PRs not created:**
- Check source repository workflow configuration
- Verify GitHub token has correct permissions

**Translation PRs not appearing:**
- Check GitHub Actions logs in source repository
- Verify target repository exists and is accessible

## See Also

- [Main Documentation](../docs/INDEX.md)
- [Testing Guide](../docs/TESTING.md)
- [Test Repositories Setup](../docs/TEST-REPOSITORIES.md)
