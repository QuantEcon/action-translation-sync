# v0.1.0 Release Checklist

**Target Date**: October 16, 2025  
**Status**: Ready for release

## Pre-Release Checklist

- [x] Core functionality implemented
  - [x] MyST parser
  - [x] Diff detector
  - [x] Translation service (Claude Sonnet 4.5)
  - [x] File processor
  - [x] GitHub Actions integration
- [x] Build system working
  - [x] TypeScript compilation
  - [x] ncc bundling (2,451 KB)
  - [x] No build errors
- [x] Documentation complete
  - [x] README.md
  - [x] Setup guide (SETUP-TESTING.md)
  - [x] All technical docs in docs/
  - [x] Copilot instructions
- [ ] Testing
  - [ ] Local build test
  - [ ] Action metadata validation
  - [ ] Dist folder included in release

## Release Process

### Step 1: Final Verification

```bash
# In action-translation-sync repository
cd /Users/mmcky/work/quantecon/action-translation-sync

# Ensure clean build
npm run build

# Verify dist folder exists and is up-to-date
ls -lh dist/

# Should see:
# - index.js (2,451 KB)
```

### Step 2: Commit and Push

```bash
# Ensure everything is committed
git status

# Add any uncommitted changes
git add .
git commit -m "Release v0.1.0 - Initial testing release

Core features:
- MyST Markdown parser with block-based parsing
- Diff detection with multi-strategy matching  
- Claude Sonnet 4.5 integration
- Support for diff and full translation modes
- GitHub Actions workflow integration

Documentation:
- Complete setup guide for testing
- Technical documentation in docs/
- Examples and usage patterns

Note: This is a development release for testing with quantecon/lecture-python.myst.
Breaking changes may occur during the v0.1.x series."

git push origin main
```

### Step 3: Create Tags

```bash
# Create v0.1.0 tag (immutable)
git tag -a v0.1.0 -m "v0.1.0 - Initial testing release

Core Features:
- MyST Markdown parser with block-based parsing
- Diff detection with multi-strategy block matching
- Claude Sonnet 4.5 translation integration
- Diff mode: translates only changed sections
- Full mode: translates new files completely
- Glossary support for consistent terminology
- GitHub Actions integration

Components:
- src/parser.ts - MyST Markdown parser
- src/diff-detector.ts - Change detection engine
- src/translator.ts - Claude Sonnet 4.5 integration
- src/file-processor.ts - Translation orchestration
- src/index.ts - GitHub Action entry point

Documentation:
- docs/SETUP-TESTING.md - Complete setup guide
- docs/ARCHITECTURE.md - System architecture
- docs/IMPLEMENTATION.md - Implementation details
- .github/copilot-instructions.md - Development guidelines

Testing Status:
- Build: ✅ Passing (2,451 KB bundle)
- Unit tests: ✅ Passing
- Integration tests: ⏳ Pending
- Production testing: ⏳ Pending

Known Limitations:
- GitHub PR integration not yet implemented
- TOC management not yet implemented
- Limited test coverage
- No error recovery for partial failures

Breaking Changes:
This is a v0.1.x release - API may change without notice.
Breaking changes are acceptable and expected during development.

Next Steps:
- Test with lecture-python.myst → lecture-python.zh-cn
- Gather feedback on translation quality
- Complete GitHub integration (PR creation)
- Implement TOC management
- Expand test coverage"

# Create v0.1 floating tag (will be updated)
git tag -a v0.1 -m "v0.1 - Development series (floating tag)

This tag will move as we release v0.1.1, v0.1.2, etc.

Use this tag in workflows to automatically get bug fixes:
  uses: quantecon/action-translation-sync@v0.1

For stability, pin to a specific version:
  uses: quantecon/action-translation-sync@v0.1.0

Development Phase: Breaking changes may occur."
```

### Step 4: Push Tags

```bash
# Push both tags
git push origin v0.1.0
git push origin v0.1

# Verify tags are pushed
git ls-remote --tags origin
```

### Step 5: Create GitHub Release (Optional)

Go to: https://github.com/quantecon/action-translation-sync/releases/new

- **Tag**: v0.1.0
- **Title**: v0.1.0 - Initial Testing Release
- **Description**:

```markdown
# Translation Sync Action v0.1.0

🎉 **First testing release!**

This is an initial development release for testing with the QuantEcon lecture series.

## ⚠️ Development Status

- **Version**: v0.1.0 (Development)
- **Stability**: Experimental
- **Breaking Changes**: Expected during v0.1.x series
- **Production Ready**: No

## 🎯 What's Included

### Core Features
✅ MyST Markdown parser with block-based parsing  
✅ Intelligent diff detection (only translates changes)  
✅ Claude Sonnet 4.5 integration  
✅ Support for diff and full translation modes  
✅ Glossary support for consistent terminology  
✅ GitHub Actions workflow integration  

### Components
- `src/parser.ts` - MyST Markdown parser using unified/remark
- `src/diff-detector.ts` - Multi-strategy change detection
- `src/translator.ts` - Claude Sonnet 4.5 API integration
- `src/file-processor.ts` - Translation workflow orchestration
- `src/index.ts` - GitHub Action entry point

### Documentation
- 📖 [Setup & Testing Guide](docs/SETUP-TESTING.md)
- 🏗️ [Architecture Overview](docs/ARCHITECTURE.md)
- 🔧 [Implementation Details](docs/IMPLEMENTATION.md)
- 📚 [Complete Documentation Index](docs/INDEX.md)

## 🧪 Testing

This release is ready for initial testing with:
- **Source**: quantecon/lecture-python.myst
- **Target**: quantecon/lecture-python.zh-cn

See [docs/SETUP-TESTING.md](docs/SETUP-TESTING.md) for complete setup instructions.

## 🚧 Known Limitations

- GitHub PR integration not yet implemented (will fail at PR creation)
- TOC (_toc.yml) management not yet implemented
- Limited test coverage
- No error recovery for partial failures

## 📋 Testing Checklist

- [ ] Diff translation (modify existing file)
- [ ] Full translation (new file)
- [ ] Multiple files in one PR
- [ ] Complex MyST directives
- [ ] Code blocks and math preservation
- [ ] Glossary term consistency

## 💰 Cost Estimate

Claude Sonnet 4.5 pricing (Oct 2025):
- ~$0.13 per typical lecture file
- ~$10 for 100 lecture initial sync

Monitor usage at: https://console.anthropic.com/

## 🔄 Version Tags

- `v0.1.0` - This specific release (immutable)
- `v0.1` - Floating tag (will move with updates)

### Usage

Automatic updates (recommended for testing):
```yaml
uses: quantecon/action-translation-sync@v0.1
```

Pinned version:
```yaml
uses: quantecon/action-translation-sync@v0.1.0
```

## 📝 Feedback

Please report issues, suggestions, and test results at:
https://github.com/quantecon/action-translation-sync/issues

## 🔜 What's Next

After testing and feedback:
- Complete GitHub integration (PR creation)
- Implement TOC management
- Expand test coverage
- Release v0.2.0 with improvements
- Eventually: v1.0.0 (production ready)

---

**Ready to test!** Follow the [setup guide](docs/SETUP-TESTING.md) to get started.
```

- **Pre-release**: ✅ Check this box (it's a development release)
- Click "Publish release"

## Post-Release Checklist

- [ ] Tags created and pushed
  - [ ] v0.1.0 (specific)
  - [ ] v0.1 (floating)
- [ ] GitHub release published (optional)
- [ ] Setup guide sent to tester
- [ ] Secrets configured in lecture-python.myst
  - [ ] ANTHROPIC_API_KEY
  - [ ] PAT_TRANSLATION_SYNC
- [ ] Workflow file created in lecture-python.myst
- [ ] First test PR merged

## Testing Phase Checklist

Follow [docs/SETUP-TESTING.md](SETUP-TESTING.md):

- [ ] Test 1: Simple text change (diff mode)
- [ ] Test 2: New file (full mode)
- [ ] Test 3: Multiple files
- [ ] Test 4: Error handling
- [ ] Collect feedback
- [ ] Document issues

## Future Releases (v0.1.x)

When making updates:

```bash
# 1. Make changes and test
# 2. Commit changes
git commit -m "Fix: description of fix"

# 3. Create new version tag (optional)
git tag -a v0.1.1 -m "v0.1.1 - Bug fixes"
git push origin v0.1.1

# 4. Move floating tag
git tag -f v0.1 -m "v0.1 - Updated to v0.1.1"
git push origin v0.1 --force

# 5. Update release notes on GitHub
```

## Ready to Release? ✅

If all items in "Pre-Release Checklist" are checked, you're ready to proceed with Step 1!
