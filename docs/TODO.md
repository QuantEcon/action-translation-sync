# Development Roadmap

**Current Version**: v0.4.7  
**Status**: Production-Ready ✅  
**Next**: v1.0 (API Stabilization)

---

## v0.4.7 - COMPLETE ✅

**Full Recursive Heading Support** - All nesting levels (##-######) with critical bug fixes

### Features
- ✅ Full recursive parser for all heading levels (##-######)
- ✅ Stack-based parsing with arbitrary nesting depth
- ✅ Recursive section comparison at all depths
- ✅ Subsection count validation (prevents data loss)
- ✅ Title preservation in heading-map
- ✅ Document order preservation in heading-map
- ✅ Recursive serializeSection (handles nested subsections)

### Bug Fixes
- ✅ **CRITICAL**: Sub-subsections (####) not detected (Test 10)
- ✅ serializeSection not recursive (lost nested subsections)
- ✅ Incomplete translations when translator returns simplified content
- ✅ Title entries deleted from heading-map
- ✅ heading-map out of document order

### Testing
- ✅ 133 tests (was 125), all passing
- ✅ 6 new tests for nested subsection detection
- ✅ 2 new tests for title preservation in heading-map
- ✅ GitHub Test 10 now passing (was failing)
- ✅ All 16 GitHub test scenarios passing

### Commits
- `d36eadd` - feat: implement full recursive heading support
- `76c0368` - fix: make serializeSection fully recursive
- `17a3b87` - fix: preserve target subsections when incomplete
- `fba6013` - fix: preserve title in heading-map
- `ce6bd3a` - fix: preserve document order in heading-map

---

## v0.4.6 - COMPLETE ✅

**Critical Bug Fixes** - Section comparison and branch naming

### Bug Fixes
- ✅ Section comparison using exact string equality (not 20% threshold)
- ✅ Branch name collisions fixed (include PR number)
- ✅ 125 tests (was 121), all passing

### Test Enhancements
- ✅ Test 16: Pure section reordering
- ✅ Enhanced PR titles with test metadata
- ✅ Added tests for typo fixes and subtle changes

### Known Issues
- 📝 LLM improvement behavior (Issue #1) - Accepting as beneficial

---

## v0.4.4 - COMPLETE ✅

**Developer Experience & Robustness** - GitHub testing, root-level support, production-ready

### Features
- ✅ Root-level file support (`docs-folder: '.'`)
- ✅ GitHub test infrastructure (16 automated scenarios)
- ✅ Improved PR titles (use filenames, not "1 file(s)")
- ✅ Hyperlinked source PRs in descriptions
- ✅ TEST mode for quick validation
- ✅ Automated test reset script

### Bug Fixes
- ✅ Subsection duplication in `parseTranslatedSubsections()`
- ✅ GitHub Actions quirk: converts `'.'` to `'/'`
- ✅ Normalization adding trailing slash to empty strings
- ✅ Test script merge conflicts (main modified mid-setup)
- ✅ Cross-repo permissions (use QUANTECON_SERVICES_PAT)

### Testing
- ✅ 121 tests (was 87), all passing (+39% coverage)
- ✅ Subsection duplication regression test
- ✅ GitHub test infrastructure with automated reset
- ✅ 9 test scenarios (#97-105) validated

### Documentation
- ✅ Complete documentation audit and updates
- ✅ IMPLEMENTATION.md rewrite (clean, 884 lines)
- ✅ v0.4.4 release notes
- ✅ .github/copilot-instructions.md
- ✅ Updated all docs with current state (Oct 24, 2025)

---

## v0.4.3 - COMPLETE ✅

**Subsection Handling & Developer Experience** - All features working, comprehensively tested

### Features
- ✅ Subsection parsing from translated content
- ✅ Subsections included in heading-map (15 entries vs 10)
- ✅ Recursive subsection processing in heading-map
- ✅ Root-level file support (`docs-folder: '.'`)
- ✅ GitHub test infrastructure (9 automated scenarios)
- ✅ Improved PR titles (use filenames, not "1 file(s)")
- ✅ Hyperlinked source PRs in descriptions

### Bug Fixes
- ✅ Bug #10: Incomplete heading-map (subsections missing)
- ✅ Subsection duplication bug in parseTranslatedSubsections()
- ✅ GitHub Actions quirk: converts `'.'` to `'/'`
- ✅ Normalization adding trailing slash to empty strings
- ✅ Test script merge conflicts (main modified mid-setup)

### Testing
- ✅ 121 tests (was 87), all passing
- ✅ Subsection duplication regression test
- ✅ GitHub test infrastructure with automated reset
- ✅ 9 test scenarios (#97-105) validated
- ✅ Comprehensive validation with test repositories

### Documentation
- ✅ Consolidated TESTING.md (1197→400 lines)
- ✅ Comprehensive IMPLEMENTATION.md rewrite
- ✅ Updated ARCHITECTURE.md (subsection support)
- ✅ Clean documentation structure (12 core files)
- ✅ Documentation audit and updates (Oct 24, 2025)

---

## v1.0 - API Stabilization (Next)

**Goal**: Freeze public interfaces, guarantee backward compatibility

### Requirements
- [ ] Comprehensive test coverage (target: 95%+ core logic)
- [ ] Real-world validation with QuantEcon lectures
- [ ] Performance benchmarks
- [ ] API documentation freeze
- [ ] Semantic versioning commitment

### Testing
- [ ] Phase 2 regression tests (Test Suites 1 & 4)
  - [ ] Test Suite 1: parseTranslatedSubsections() (3 tests)
  - [ ] Test Suite 4: End-to-end integration (1 test)
- [ ] Large document tests (10+ subsections)
- [ ] Deep nesting tests (level 5-6 subsections)
- [ ] Edge case coverage

### Documentation
- [ ] API reference documentation
- [ ] Migration guide (v0.x → v1.0)
- [ ] Best practices guide
- [ ] Troubleshooting guide

### Release Criteria
- [ ] 95%+ test coverage
- [ ] No known critical bugs
- [ ] All QuantEcon lectures translate successfully
- [ ] Performance acceptable (<5 min per lecture)
- [ ] Documentation complete

---

## v1.1+ - Feature Enhancements (Future)

**Focus**: New features while maintaining v1.0 compatibility

### Translation Improvements
- [ ] Support for additional languages (Japanese, Spanish)
- [ ] Custom glossary per-repository
- [ ] Translation memory / caching
- [ ] Batch translation optimization

### Performance
- [ ] Parallel section translation
- [ ] Incremental caching (skip unchanged sections)
- [ ] Bundle size optimization
- [ ] Faster parsing with streaming

### Features
- [ ] Support for nested directives
- [ ] Image caption translation
- [ ] Table content translation
- [ ] Footnote handling
- [ ] Citation translation

### Quality
- [ ] Translation quality metrics
- [ ] Automated validation rules
- [ ] Style consistency checking
- [ ] Terminology enforcement

### Developer Experience
- [ ] CLI tool for local testing
- [ ] Docker container for reproducibility
- [ ] Better error messages
- [ ] Interactive debugging mode

---

## v2.0+ - Major Enhancements (Long-term)

**Possible breaking changes acceptable**

### Architecture
- [ ] Plugin system for extensibility
- [ ] Multiple translation provider support (beyond Claude)
- [ ] Custom parser plugins
- [ ] Custom diff strategies

### Advanced Features
- [ ] Multi-language synchronization (EN→ZH+JA simultaneously)
- [ ] Bidirectional translation
- [ ] Translation suggestions/corrections
- [ ] Machine learning for terminology

---

## Completed Milestones

### v0.3.0 - Section-Based Architecture ✅
**Released**: August 2024

- ✅ Complete rewrite using section-based approach
- ✅ 43% code reduction (1586→976 lines)
- ✅ 28% bundle reduction (2492kB→1794kB)
- ✅ Claude Sonnet 4.5 integration
- ✅ Heading-map system
- ✅ Position-based section matching
- ✅ 77 tests, all passing

### v0.2.2 - Block-Based Prototype ✅
**Released**: July 2024

- ✅ Working prototype with block-based approach
- ✅ Basic translation functionality
- ✅ Identified limitations leading to v0.3.0 redesign

### v0.1.x - Initial Development ✅
**Released**: May-June 2024

- ✅ Project setup and infrastructure
- ✅ Initial parser and translator
- ✅ GitHub Actions integration
- ✅ Glossary system (342 terms)

---

## Maintenance Tasks

### Regular
- [ ] Update Claude model as new versions release
- [ ] Monitor API costs and optimize
- [ ] Review and update glossaries
- [ ] Address user feedback

### As Needed
- [ ] Dependency updates (security patches)
- [ ] Bug fixes from production use
- [ ] Documentation improvements
- [ ] Performance tuning

---

## Contributing

Want to contribute? Check:
- **Good First Issues**: Search GitHub issues tagged `good-first-issue`
- **Help Wanted**: Issues tagged `help-wanted`
- **Documentation**: Always needs improvement
- **Testing**: Add more edge case tests

---

## Questions & Feedback

- **GitHub Issues**: https://github.com/QuantEcon/action-translation-sync/issues
- **Discussions**: https://github.com/QuantEcon/action-translation-sync/discussions
- **Documentation**: See `docs/INDEX.md`
