# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2025-12-04

### Added
- **Markdown Syntax Validation in Prompts**: LLM-based syntax checking
  - Translator prompts (UPDATE, NEW, FULL DOCUMENT) now include explicit syntax rules
  - Evaluator includes "Syntax" as 5th evaluation criterion
  - `syntaxErrors` array in evaluation response for critical markdown errors
  - Syntax errors displayed prominently in PR comments with 🔴 markers
  - Rules: space after `#` in headings, matching code/math delimiters
- **Configurable Max Suggestions**: Evaluator now supports `--max-suggestions` flag
  - Default increased from ~2 to 5 suggestions
  - Prompt explicitly allows 0 suggestions for excellent translations
- **Changed Sections Detection**: Evaluator focuses suggestions on modified content only
  - Computes changed sections by comparing before/after content
  - Supports preamble changes, additions, modifications, deletions
  - Deep nesting support (######), empty sections, special characters

### Fixed  
- **Evaluator**: Changed sections list no longer includes non-existent sections
- **File Rename Handling**: Renamed files now properly handled in translation sync
  - Previously: renamed files were added as new files, leaving orphaned translations
  - Now: existing translation is transferred to new filename, old file is deleted
  - Uses GitHub's `previous_filename` field for rename detection
  - Preserves heading-map and existing translations when files are renamed

### Documentation
- Created myst-lint project proposal: QuantEcon/meta#268

## [0.6.0] - 2025-12-03

### Added
- **Opus 4.5 Evaluation Tool**: Quality assessment framework for translations
  - Located in `tool-test-action-on-github/evaluate/`
  - Uses Claude Opus 4.5 for translation quality evaluation
  - Evaluates: Translation quality, diff accuracy, glossary compliance, heading-map handling
  - Posts review comments on GitHub PRs with structured feedback
  - Includes all 355 glossary terms for validation
  - Supports `--list-only` flag for dry-run mode
- **Input Validation**: Language code validation against configured languages in `LANGUAGE_CONFIGS`
  - New functions: `getSupportedLanguages()`, `isLanguageSupported()`, `validateLanguageCode()`
  - Clear error messages with list of supported languages
  - Guidance to add new languages via `LANGUAGE_CONFIGS`
- **Model Validation**: Claude model name validation with warning for unrecognized patterns
  - Validates against known Claude model patterns (sonnet, opus, haiku variants)
  - Warning only (doesn't block) to allow new models
- **Improved API Error Handling**: Specific error messages for Anthropic API failures
  - Authentication errors: Guides to check API key secret
  - Rate limit errors: Informs about automatic retry
  - Connection errors: Suggests checking network
  - Bad request errors: Indicates prompt/content issues
- **8 New Tests**: Validation function test coverage

### Changed
- **Dependencies**: Removed 10 unused AST-related packages (unified, remark-*, mdast-*, diff)
  - Reduced total packages from 527 to 439
  - Removed ~700KB of unnecessary dependencies
  - Packages removed: `unified`, `remark-parse`, `remark-stringify`, `remark-directive`, `remark-math`, `remark-gfm`, `mdast-util-to-string`, `unist-util-visit`, `diff`, `@types/diff`
- **LANGUAGE_CONFIGS**: Now exported for external access and validation

### Fixed
- **translator.ts**: Fixed Claude model default mismatch
  - Changed default from `claude-sonnet-4.5-20241022` to `claude-sonnet-4-5-20250929`
  - Now matches the default specified in `action.yml`

### Documentation
- **TESTING.md**: Updated test count from 125 to 147, expanded test file breakdown
- **ARCHITECTURE.md**: Updated line counts for all 7 modules to reflect current codebase
- **INDEX.md**: Replaced corrupted file with clean version (was severely corrupted with merged/duplicated lines)
- **STATUS-REPORT.md**: Removed references to non-existent TODO.md, updated to use GitHub Issues
- **copilot-instructions.md**: Updated version, line counts, and test coverage metrics

## [0.5.1] - 2025-11-06

### Added
- **Language Configuration System**: New `language-config.ts` module for extensible language-specific translation rules
- Chinese-specific punctuation rules (full-width characters)
- Support for easy addition of new target languages (Japanese, Spanish, etc.)

### Changed
- Translation prompts now automatically include language-specific rules
- Case-insensitive language code lookups

### Documentation
- Added GPT5 comprehensive evaluation results (21 scenarios, 100% pass rate)

## [0.5.0] - 2025-11-06

### Added
- **TOC File Support**: `_toc.yml` files are now automatically synced to target repos
- **File Deletion Handling**: Deleted files are now removed from target repos
- 8 new test scenarios covering document lifecycle operations

### Changed
- Enhanced PR descriptions to include file deletions

## [0.4.10] - 2025-10-31

### Fixed
- Root-level file handling for `docs-folder: '.'` configuration
- GitHub Actions quirk that converts `.` to `/` in inputs

## [0.4.7] - 2025-10-24

### Added
- Full recursive subsection support for arbitrary nesting depth (####, #####, ######)
- Recursive subsection change detection in diff-detector
- Subsection integration into heading-maps

### Fixed
- Subsection duplication prevention in document reconstruction

## [0.4.6] - 2025-10-23

### Added
- Heading-map system for language-independent section matching
- Automatic heading-map population on first translation

## [0.4.5] - 2025-10-22

### Changed
- Improved preamble change detection
- Enhanced section position matching

## [0.4.4] - 2025-10-21

### Added
- UPDATE mode for incremental translation of modified sections
- Glossary support for consistent terminology

## [0.4.3] - 2025-10-20

### Added
- NEW mode for full section translation
- Basic MyST Markdown parsing

## [0.3.0] - 2025-10-15

### Changed
- **Architecture Overhaul**: Migrated from block-based to section-based translation
- Removed AST parsing in favor of simple line-by-line approach

## [0.2.2] - 2025-10-10

### Fixed
- Various bug fixes and stability improvements

## [0.1.2] - 2025-10-05

### Fixed
- Initial bug fixes

## [0.1.1] - 2025-10-03

### Fixed
- Minor fixes after initial release

## [0.1.0] - 2025-10-01

### Added
- Initial release
- Basic translation workflow using Claude AI
- GitHub Actions integration
- Support for MyST Markdown documents

---

For detailed release notes, see [docs/releases/](docs/releases/).
