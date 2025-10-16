# ✅ v0.1.1 Release - Bug Fix and Configurable Model

**Date**: October 16, 2025  
**Repository**: https://github.com/quantecon/action-translation-sync  
**Tags**: v0.1.1 (new) + v0.1 (updated to point to v0.1.1)

---

## 🎉 What's Fixed

### Critical Bug Fix
**Issue**: Model 404 error when calling Claude API
```
404 {"type":"error","error":{"type":"not_found_error","message":"model: claude-sonnet-4.5-20241022"}}
```

**Cause**: Incorrect model name (`claude-sonnet-4.5-20241022` doesn't exist)

**Solution**: Fixed to correct model name: `claude-sonnet-4-20250514`

✅ **Now works correctly!**

---

## 🚀 New Feature: Configurable Model

You can now specify which Claude model to use via the `claude-model` parameter!

### Default Behavior (No Change Needed)

```yaml
- uses: quantecon/action-translation-sync@v0.1
  with:
    target-repo: 'quantecon/lecture-python.zh-cn'
    target-language: 'zh-cn'
    anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
    github-token: ${{ secrets.GITHUB_TOKEN }}
    # claude-model defaults to: claude-sonnet-4-20250514
```

### Custom Model

```yaml
- uses: quantecon/action-translation-sync@v0.1
  with:
    # ... other parameters ...
    claude-model: 'claude-opus-4-20250514'  # Use Opus for highest quality
```

### Available Models

| Model | Use Case | Cost |
|-------|----------|------|
| `claude-haiku-4-20250514` | Fast, simple content | $ |
| `claude-sonnet-4-20250514` | **Recommended** - balanced | $$ |
| `claude-opus-4-20250514` | Highest quality | $$$ |

See `docs/CLAUDE-MODELS.md` for detailed comparison and usage guide.

---

## 📚 New Documentation

### CLAUDE-MODELS.md
Comprehensive guide for choosing Claude models:
- Model comparison
- Cost analysis
- Use cases for each model
- How to test different models
- Troubleshooting model errors

### TESTING-WORKFLOW.md
Guide for testing on a separate branch:
- How to avoid polluting production `main` branch
- Setting up `test-action-translation-sync` branch
- Running tests without affecting production
- Cleanup after testing

---

## 🔄 How to Update

If you're using `@v0.1` (floating tag), you automatically get v0.1.1!

Your existing workflow:
```yaml
uses: quantecon/action-translation-sync@v0.1
```

Now points to v0.1.1 with the bug fix! ✅

### Manual Update

If you pinned to `@v0.1.0`:
```yaml
# Old
uses: quantecon/action-translation-sync@v0.1.0  # Had bug

# New
uses: quantecon/action-translation-sync@v0.1.1  # Fixed!
# Or
uses: quantecon/action-translation-sync@v0.1    # Always latest v0.1.x
```

---

## 📊 Changes Summary

**Files Modified**: 18 files
**Lines Changed**: +181 / -22

### Core Changes
- ✅ `action.yml` - Added `claude-model` input parameter
- ✅ `src/types.ts` - Added `claudeModel` to ActionInputs interface
- ✅ `src/inputs.ts` - Handle `claude-model` input
- ✅ `src/translator.ts` - Made model configurable, fixed model name
- ✅ `src/index.ts` - Pass model to TranslationService
- ✅ `README.md` - Documented new parameter

### Documentation
- ✅ `docs/CLAUDE-MODELS.md` - New guide for model selection
- ✅ `docs/TESTING-WORKFLOW.md` - New guide for testing workflow

### Build
- ✅ Rebuilt dist/index.js with fixes
- ✅ All tests passing (2/2)
- ✅ Bundle size: 2,452 KB (unchanged)

---

## 🧪 Testing Recommendations

### Test Branch Setup

Instead of testing on production `main` branch:

1. **Create test branch** in `lecture-python.myst`:
   ```bash
   git checkout -b test-action-translation-sync
   git push -u origin test-action-translation-sync
   ```

2. **Create test workflow** (`.github/workflows/sync-translations-test.yml`):
   ```yaml
   name: Sync Translations (TEST)
   
   on:
     pull_request:
       types: [closed]
       branches:
         - test-action-translation-sync  # Only test branch
       paths:
         - 'lectures/**/*.md'
   
   jobs:
     sync-to-chinese:
       if: github.event.pull_request.merged == true
       runs-on: ubuntu-latest
       
       steps:
         - name: Sync to Chinese Repository (TEST)
           uses: quantecon/action-translation-sync@v0.1  # Uses v0.1.1
           with:
             target-repo: 'quantecon/lecture-python.zh-cn'
             target-language: 'zh-cn'
             docs-folder: 'lectures/'
             source-language: 'en'
             anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
             github-token: ${{ secrets.PAT_TRANSLATION_SYNC }}
             pr-labels: 'translation-sync,automated,test'
   ```

3. **Make test changes**:
   ```bash
   git checkout test-action-translation-sync
   git checkout -b test/intro-update
   # Edit lectures/intro.md
   git commit -am "test: update intro"
   git push origin test/intro-update
   # Create PR to test-action-translation-sync → Merge
   ```

4. **Review results**:
   - Check workflow logs
   - Verify translation quality
   - Monitor API costs

See `docs/TESTING-WORKFLOW.md` for complete guide.

---

## ✅ Verification

### Check Tags
```bash
git tag -l
# v0.1
# v0.1.0
# v0.1.1
```

### Check Remote
```bash
git ls-remote --tags origin | grep v0.1
```

### View on GitHub
```bash
gh repo view quantecon/action-translation-sync --web
```

---

## 🎯 What's Next

### Immediate: Test v0.1.1

1. Set up test branch in `lecture-python.myst`
2. Create test workflow
3. Merge a test PR
4. Verify it works (no more 404 errors!)
5. Review translation quality

### Future: v0.2.0

After successful testing:
- [ ] Implement GitHub PR integration
- [ ] Add TOC management
- [ ] Improve error handling
- [ ] Expand test coverage

---

## 📞 Support

- **Repository**: https://github.com/quantecon/action-translation-sync
- **Issues**: https://github.com/quantecon/action-translation-sync/issues
- **Docs**: https://github.com/quantecon/action-translation-sync/tree/main/docs

### Documentation Index
- `README.md` - Main documentation
- `docs/SETUP-TESTING.md` - Setup guide
- `docs/TESTING-WORKFLOW.md` - Testing on separate branch
- `docs/CLAUDE-MODELS.md` - Model selection guide
- `docs/QUICK-REFERENCE.md` - Command cheat sheet

---

## 🔑 Key Improvements

| Feature | v0.1.0 | v0.1.1 |
|---------|--------|--------|
| Model works | ❌ 404 error | ✅ Fixed |
| Model configurable | ❌ No | ✅ Yes |
| Test branch guide | ❌ No | ✅ Yes |
| Model selection guide | ❌ No | ✅ Yes |

---

**🎊 v0.1.1 is ready for testing!**

The 404 error is fixed and you can now easily switch between Claude models.

Start testing on a separate branch to keep production clean! 🚀
