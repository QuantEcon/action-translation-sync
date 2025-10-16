# Documentation Review & Cleanup Plan

**Date**: October 16, 2025  
**Goal**: Keep documentation simple, organized, and useful

---

## Documentation Audit

### ✅ KEEP - Essential Documentation

| File | Status | Purpose | Action |
|------|--------|---------|--------|
| **INDEX.md** | ✅ Keep | Documentation hub, navigation | Update to reflect cleanup |
| **PROJECT-DESIGN.md** | ✅ Keep | Core design decisions | Already up-to-date |
| **ARCHITECTURE.md** | ✅ Keep | System architecture | Already up-to-date |
| **IMPLEMENTATION.md** | ✅ Keep | Implementation details | Update model references |
| **QUICKSTART.md** | ✅ Keep | Developer onboarding | Update for test repos |
| **TODO.md** | ✅ Keep | Development roadmap | Already updated |
| **STATUS-REPORT.md** | ✅ Keep | Project status | Already updated |
| **CLAUDE-MODELS.md** | ✅ Keep | Model selection guide | Already up-to-date |

### 🔄 CONSOLIDATE - Merge Similar Content

| Files to Merge | Target | Reason |
|----------------|--------|--------|
| SETUP-TESTING.md | → TEST-REPOSITORIES.md | New comprehensive testing guide |
| TESTING-WORKFLOW.md | → TEST-REPOSITORIES.md | Duplicate testing content |
| QUICK-REFERENCE.md | Keep but update | Still useful as cheat sheet |

### 🗑️ DELETE - Outdated/Redundant

| File | Reason to Delete |
|------|------------------|
| **BUILD-SUMMARY.md** | Build details in IMPLEMENTATION.md, redundant |
| **BUILT-IN-GLOSSARY.md** | Content in glossary/README.md, redundant |
| **GLOSSARY-REORGANIZATION.md** | Historical note, no longer needed |
| **REORGANIZATION.md** | Historical note, no longer needed |
| **READY-TO-RELEASE.md** | Was pre-release checklist, now obsolete |
| **RELEASE-v0.1.0.md** | Historical release notes, archive only |
| **RELEASE-COMPLETE.md** | Merged into RELEASE-v0.1.0.md |
| **README.md** (in docs/) | Redundant with INDEX.md |

### ✅ KEEP - Release Notes Archive

| File | Action |
|------|--------|
| **RELEASE-v0.1.0.md** | Move to `docs/releases/` folder |
| **RELEASE-v0.1.1.md** | Move to `docs/releases/` folder |

---

## Proposed New Structure

```
docs/
├── INDEX.md                    # Documentation hub
├── PROJECT-DESIGN.md           # Design decisions
├── ARCHITECTURE.md             # System architecture
├── IMPLEMENTATION.md           # Implementation details
├── QUICKSTART.md               # Developer onboarding
├── TODO.md                     # Development roadmap
├── STATUS-REPORT.md            # Project status
├── CLAUDE-MODELS.md            # Model selection guide
├── TEST-REPOSITORIES.md        # NEW: Complete testing guide
├── QUICK-REFERENCE.md          # Command cheat sheet
└── releases/                   # Release notes archive
    ├── v0.1.0.md
    └── v0.1.1.md
```

**Total**: 10 main docs + releases/ folder (down from 20 files)

---

## New: TEST-REPOSITORIES.md

**Purpose**: Comprehensive guide for testing using dedicated test repos

**Content**:
1. Why use test repositories (not production)
2. Test repository setup (test-translation-sync, test-translation-sync.zh-cn)
3. Creating test content in lectures/ folder
4. Running tests
5. Verifying translations
6. Cleanup after testing

**Replaces**:
- SETUP-TESTING.md
- TESTING-WORKFLOW.md

---

## Updates Needed

### 1. INDEX.md
- Remove deleted files
- Add releases/ folder
- Update navigation

### 2. IMPLEMENTATION.md
- Update model references to `claude-sonnet-4-20250514`
- Add note about configurable model parameter

### 3. QUICKSTART.md
- Update setup instructions for test repos
- Remove production repo references

### 4. QUICK-REFERENCE.md
- Update with test repo commands
- Add model parameter examples

---

## Action Plan

1. ✅ Create `docs/releases/` folder
2. ✅ Move release notes to `docs/releases/`
3. ✅ Delete redundant/historical files
4. ✅ Create new `TEST-REPOSITORIES.md`
5. ✅ Update INDEX.md
6. ✅ Update IMPLEMENTATION.md
7. ✅ Update QUICKSTART.md
8. ✅ Update QUICK-REFERENCE.md
9. ✅ Commit cleanup

---

## Test Repositories Setup

### Repository 1: test-translation-sync (Source)

**Purpose**: Source repository with English content

**Structure**:
```
test-translation-sync/
├── .github/
│   └── workflows/
│       └── sync-translations.yml
├── lectures/
│   ├── intro.md              # Simple test lecture
│   ├── advanced.md           # With math and code
│   └── _toc.yml              # Table of contents
└── README.md
```

**Content**: Simple MyST Markdown files for testing

### Repository 2: test-translation-sync.zh-cn (Target)

**Purpose**: Target repository for Chinese translations

**Structure**:
```
test-translation-sync.zh-cn/
├── lectures/
│   ├── intro.md              # Translated version
│   ├── advanced.md           # Translated version
│   └── _toc.yml              # TOC (manual or synced)
└── README.md
```

**Initial State**: Empty `lectures/` folder or pre-seeded with initial translations

---

## Benefits of This Approach

✅ **Isolated Testing**: No production pollution  
✅ **Repeatable**: Can reset/recreate anytime  
✅ **Safe**: No risk to production repos  
✅ **Complete**: Full workflow testing (PRs, translations, etc.)  
✅ **Clean**: Easy to understand and maintain  

---

## Next Steps

1. Execute cleanup plan
2. Create test repositories
3. Update documentation
4. Test the action end-to-end
5. Document results

---

**Approval needed**: Ready to proceed with cleanup and test repo creation?
