# Test Action on GitHub - Data Files

This directory contains test scenarios for validating the translation action against real GitHub repositories.

## Structure

- **workflow-template.yml**: GitHub Actions workflow file for test repositories
- **Base documents**: Starting point for all tests (identical between EN and ZH repos)
  - `base-minimal.md` / `base-minimal-zh-cn.md` - Simple 2-section document
  - `base-lecture.md` / `base-lecture-zh-cn.md` - Realistic lecture example

- **Test scenarios**: Modified versions for testing specific changes
  - `01-intro-change-minimal.md` - Intro text modified
  - `02-title-change-minimal.md` - Title modified
  - `03-section-content-minimal.md` - Section content modified
  - `04-section-reorder-minimal.md` - Sections reordered
  - `05-add-section-minimal.md` - New section added
  - `06-delete-section-minimal.md` - Section removed
  - `07-subsection-change-minimal.md` - Subsection modified
  - `08-multi-element-minimal.md` - Multiple changes
  - `09-real-world-lecture.md` - Realistic lecture update (uses lecture base)

## File Structure

Test files use **flat structure** (no `lectures/` folder):
- Source repo: `lecture.md` (root level)
- Target repo: `lecture.md` (root level)
- Workflow configured with `docs-folder: ''` to match root files

## Usage

Run the test setup script from the repository root:

```bash
./scripts/test-action-on-github.sh
```

This will:
1. Create empty repositories on GitHub
2. Initialize local repos with base documents and workflow
3. Push initial state to GitHub
4. Create 9 test PRs with different scenarios
5. Add `test-translation` label to each PR
6. Print summary of created PRs

Then observe the GitHub Actions running and creating translation PRs on `test-translation-sync.zh-cn`.

## Test Scenarios

Each scenario tests a specific document element change:

1. **Intro Change** - Only introduction paragraph modified
2. **Title Change** - Only document title modified  
3. **Section Content** - Content within one section modified
4. **Section Reorder** - Sections rearranged (tests heading-map)
5. **Add Section** - New section added to document
6. **Delete Section** - Existing section removed
7. **Subsection Change** - Content within subsection modified
8. **Multi-Element** - Complex change (title + intro + section + new section)
9. **Real World** - Realistic lecture update with real content

## Notes

- All scenarios use the same base document state
- Minimal scenarios test in isolation
- Real-world scenario tests realistic content
- PRs are created as drafts with `test-translation` label
