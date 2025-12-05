# Future Features Planning

**Document Status**: Planning & Design Discussion  
**Last Updated**: December 2025  
**Version**: Draft v0.1

This document outlines potential future features for the `action-translation` system. Each feature is explored with implementation ideas, pros/cons, and design considerations.

---

## Table of Contents

1. [Resync Workflow / Tool](#1-resync-workflow--tool)
2. [Multi-Language Hub-Spoke Architecture](#2-multi-language-hub-spoke-architecture)
3. [Bidirectional Sync / Upstream Suggestions](#3-bidirectional-sync--upstream-suggestions)

---

## 1. Resync Workflow / Tool

### Problem Statement

The current implementation triggers translation sync on **PR merge events only**. However, occasionally edits are made directly to `main` without going through a PR:

- Direct commits to main (emergency fixes, admin edits)
- Force pushes
- GitHub web UI quick edits
- Automated commits (bots, CI/CD)

This can cause source and target repositories to diverge silently.

### Frequency Assessment

- **~99% of changes** transit through PRs (current workflow handles these)
- **~1% edge cases** could cause divergence
- Impact: Cumulative drift over time if not addressed

### Option A: Scheduled Resync Tool

**Concept**: A scheduled workflow that periodically compares source and target repositories, identifies divergence, and creates sync PRs.

```yaml
# .github/workflows/resync-check.yml
name: Weekly Resync Check

on:
  schedule:
    - cron: '0 6 * * 1'  # Every Monday at 6 AM UTC
  workflow_dispatch:     # Manual trigger

jobs:
  resync:
    runs-on: ubuntu-latest
    steps:
      - uses: QuantEcon/action-translation@v0.8
        with:
          mode: resync
          source-repo: QuantEcon/lecture-python.myst
          target-repo: QuantEcon/lecture-python.zh-cn
          # ...
```

**Implementation Approach**:

1. **Fetch both repositories** at their current HEAD
2. **Compare structure and sections**:
   - File presence check (does target have all source files?)
   - Section count comparison (same number of `##` sections?)
   - Heading-map validation (all source section IDs present in target's heading-map?)
3. **Generate divergence report**:
   - Files in source but not target
   - Files with section differences
   - Files deleted in source but present in target
4. **Action options**:
   - **Report only**: Create issue with divergence summary
   - **Auto-sync**: Create PR with missing translations
   - **Hybrid**: Report + auto-sync for simple cases

**Pros**:
- ✅ Catches all divergence regardless of cause
- ✅ Scheduled = predictable maintenance window
- ✅ Can run weekly/monthly based on change frequency
- ✅ Manual trigger for on-demand checks
- ✅ Non-intrusive to normal workflow

**Cons**:
- ❌ Delayed detection (up to 1 week/month)
- ❌ Bulk changes harder to review than incremental
- ❌ May create large PRs if divergence accumulated
- ❌ Requires additional scheduled workflow

### Option B: Main Branch Commit Filter

**Concept**: Monitor all commits to main (not just PR merges) and trigger sync for content-related changes.

```yaml
# Enhanced workflow trigger
on:
  push:
    branches: [main]
    paths:
      - 'lectures/**/*.md'
      - '_toc.yml'
```

**Implementation Approach**:

1. **Trigger on push to main** (catches direct commits)
2. **Filter commits**:
   - Check if commit came from merged PR (skip - already handled)
   - Check if commit is content-related (not CI/docs/config)
3. **Process non-PR commits** same as merged PR workflow

**Detection Logic**:
```typescript
// Pseudo-code for commit source detection
function isFromMergedPR(commit: Commit): boolean {
  // Check commit message patterns
  if (commit.message.includes('Merge pull request')) return true;
  if (commit.message.includes('(#')) return true;  // Squash merge
  
  // Check associated PRs via API
  const prs = await github.repos.listPullRequestsAssociatedWithCommit();
  return prs.some(pr => pr.merged);
}
```

**Pros**:
- ✅ Real-time detection (immediate sync)
- ✅ Incremental changes = smaller PRs
- ✅ Same workflow file (simpler setup)
- ✅ No accumulation of divergence

**Cons**:
- ❌ More complex trigger logic
- ❌ Potential for duplicate syncs (PR merge + push event)
- ❌ May trigger on non-content commits (need careful filtering)
- ❌ Higher API usage (checking every push)

### Option C: Monitoring & Notification (Lightweight)

**Concept**: Scheduled check that only monitors for divergence and notifies, without automatic fixing.

```yaml
# Creates GitHub issue when divergence detected
- uses: QuantEcon/action-translation@v0.8
  with:
    mode: monitor
    notification: issue  # or: slack, email
```

**Pros**:
- ✅ Simplest implementation
- ✅ Human decides how to fix
- ✅ Good for low-frequency divergence
- ✅ Visibility without automation risk

**Cons**:
- ❌ Manual intervention required
- ❌ May be ignored if frequent false positives

### Recommendation

**Hybrid Approach**: Implement both monitoring and on-demand resync.

1. **Weekly monitoring** (Option C) - Lightweight check, create issue if divergence found
2. **Manual resync command** (Option A) - Run when needed to fix divergence
3. **Future enhancement** (Option B) - Add push-to-main filtering if divergence is frequent

**Suggested Priority**: Medium (rare edge case, but important for long-term maintenance)

### Implementation Considerations

- **New mode**: `mode: resync` or `mode: monitor`
- **Inputs needed**:
  - `resync-strategy`: `report-only` | `auto-sync` | `hybrid`
  - `notification-channel`: `issue` | `slack` | `none`
- **State tracking**: May need to track "last synced commit" per file
- **Conflict handling**: What if target has local-only changes?

---

## 2. Multi-Language Hub-Spoke Architecture

### Current Design

The action already supports multiple languages through separate workflow files:

```
lecture-python.myst/              # English (Hub)
├── .github/workflows/
│   ├── sync-translation-zh-cn.yml    # → Chinese
│   ├── sync-translation-fa.yml       # → Farsi
│   └── sync-translation-es.yml       # → Spanish (future)
```

Each workflow independently syncs to its target repository:

```
                    ┌─────────────────────────┐
                    │  lecture-python.myst    │
                    │       (English Hub)     │
                    └───────────┬─────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           │                    │                    │
           ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ lecture-python   │  │ lecture-python   │  │ lecture-python   │
│     .zh-cn       │  │       .fa        │  │       .es        │
│   (Chinese)      │  │     (Farsi)      │  │    (Spanish)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
```

### Why Hub-Spoke?

**Advantages**:

1. **Single Source of Truth**: English content is authoritative
2. **Independent Language Teams**: Each translation can progress at its own pace
3. **Isolated Failures**: Issue with Chinese sync doesn't affect Farsi
4. **Simple Mental Model**: One-way flow, clear ownership
5. **Scalable**: Add new languages without changing existing workflows
6. **Review Decoupling**: Each language has its own review process

**Trade-offs**:

1. **No cross-language learning**: Good translation in Chinese doesn't help Spanish
2. **Duplication of effort**: Similar phrasing translated multiple times
3. **Hub dependency**: English must be correct first

### Alternative Architectures Considered

#### Alternative A: Mesh / Peer-to-Peer

```
┌──────────────┐     ┌──────────────┐
│   English    │◀───▶│   Chinese    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       │    ┌──────────────┐│
       └───▶│    Farsi     │◀┘
            └──────────────┘
```

**Concept**: All repositories sync with each other. Changes in any language propagate to all others.

**Pros**:
- ✅ Improvements from any language benefit all
- ✅ No single point of dependency

**Cons**:
- ❌ **Complexity explosion**: N languages = N×(N-1) sync relationships
- ❌ **Conflict resolution nightmare**: Which version wins?
- ❌ **Quality control**: Who reviews Chinese → English changes?
- ❌ **Translation chaining errors**: Chinese→English→Farsi accumulates errors
- ❌ **No clear ownership**: Who is authoritative?

**Verdict**: ❌ Not recommended. Complexity is prohibitive for academic content where accuracy matters.

#### Alternative B: Monorepo (All Languages in One Repo)

```
lecture-python/
├── en/
│   └── lectures/
│       └── aiyagari.md
├── zh-cn/
│   └── lectures/
│       └── aiyagari.md
└── fa/
    └── lectures/
        └── aiyagari.md
```

**Concept**: Single repository contains all language versions in folders.

**Pros**:
- ✅ Single PR can update multiple languages
- ✅ Easier to see translation status at a glance
- ✅ Atomic commits across languages
- ✅ Simpler CI/CD (one repo to manage)

**Cons**:
- ❌ **Large repository**: Cloning includes all languages
- ❌ **Permission complexity**: Can't give Chinese team write access to only `zh-cn/`
- ❌ **Build complexity**: Jupyter Book needs separate builds per language
- ❌ **Review noise**: PRs touch files reviewers may not understand
- ❌ **Branch conflicts**: Parallel work on different languages may conflict

**Verdict**: ⚠️ Could work for small projects, but doesn't scale well for large lecture series with independent language teams.

#### Alternative C: Federated Hub (Multiple Hubs)

```
                    ┌─────────────────────────┐
                    │  lecture-python.myst    │
                    │    (English - Primary)  │
                    └───────────┬─────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │                                   │
              ▼                                   ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  lecture-python.zh-cn   │         │  lecture-python.ar      │
│  (Chinese - Regional)   │         │  (Arabic - Regional)    │
└───────────┬─────────────┘         └───────────┬─────────────┘
            │                                   │
     ┌──────┴──────┐                     ┌──────┴──────┐
     ▼             ▼                     ▼             ▼
┌─────────┐  ┌─────────┐           ┌─────────┐  ┌─────────┐
│ zh-tw   │  │ zh-hk   │           │  fa     │  │  ur     │
│(Taiwan) │  │(HK)     │           │(Farsi)  │  │(Urdu)   │
└─────────┘  └─────────┘           └─────────┘  └─────────┘
```

**Concept**: Primary hub (English) syncs to regional hubs, which then sync to related languages.

**Use Case**: Chinese Simplified → Chinese Traditional / Hong Kong variants. Arabic → Farsi / Urdu (shared script families).

**Pros**:
- ✅ Regional expertise at intermediate level
- ✅ Shared terminology within language families
- ✅ Reduces load on primary hub maintainers

**Cons**:
- ❌ **Added latency**: Changes propagate through two hops
- ❌ **Intermediate hub dependency**: Regional hub becomes bottleneck
- ❌ **Complexity**: More workflows to manage

**Verdict**: ⚠️ Potentially useful at scale (10+ languages), but premature for current needs.

### Why Hub-Spoke is Right for QuantEcon

| Factor | Hub-Spoke | Mesh | Monorepo | Federated |
|--------|-----------|------|----------|-----------|
| Simplicity | ✅ Best | ❌ Worst | ⚠️ Medium | ⚠️ Medium |
| Clear ownership | ✅ Yes | ❌ No | ⚠️ Partial | ✅ Yes |
| Independent teams | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| Quality control | ✅ Easy | ❌ Hard | ⚠️ Medium | ✅ Easy |
| Scales to 5-10 langs | ✅ Yes | ❌ No | ⚠️ Barely | ✅ Yes |
| Implementation effort | ✅ Low | ❌ High | ⚠️ Medium | ⚠️ Medium |

**Conclusion**: Hub-spoke is the right choice because:

1. **QuantEcon's content model**: English is authoritative, translations are derivatives
2. **Team structure**: Independent language maintainers, not a centralized translation team
3. **Quality requirements**: Academic content requires careful review, not automatic propagation
4. **Scale**: 3-5 languages is the sweet spot for hub-spoke (no complexity explosion)

**When to reconsider**:
- If QuantEcon expands to 10+ languages → consider Federated Hub
- If language teams want shared ownership → still not Mesh, but add suggestion workflow (Section 3)

### Multi-Language Coordination Scenarios

#### Scenario 1: Simultaneous Language Sync

When a PR is merged in English, all language workflows trigger:

```
English PR Merged
       │
       ├──▶ sync-zh-cn.yml ──▶ Chinese PR created
       ├──▶ sync-fa.yml ────▶ Farsi PR created  
       └──▶ sync-es.yml ────▶ Spanish PR created
```

**Current Behavior**: ✅ Already supported (parallel workflows)

**Consideration**: PRs are created independently, merged independently.

#### Scenario 2: Language-Specific Glossaries

Each language needs its own glossary:

```
glossary/
├── zh-cn.json    # Chinese terminology
├── fa.json       # Farsi terminology
├── es.json       # Spanish terminology (future)
└── README.md
```

**Current Behavior**: ✅ Already supported via `glossary-path` input

#### Scenario 3: Language-Specific Translation Rules

Different languages have different typographic conventions:

```typescript
// language-config.ts already supports this
const languageConfigs: Record<string, LanguageConfig> = {
  'zh-cn': {
    name: '简体中文',
    punctuation: 'chinese',
    spacing: 'no-spaces-around-cjk',
    // ...
  },
  'fa': {
    name: 'فارسی',
    direction: 'rtl',
    punctuation: 'persian',
    // ...
  }
};
```

**Current Behavior**: ✅ Already supported in `language-config.ts`

### Design Documentation

#### Recommended Setup for New Languages

1. **Create target repository**: `{repo}.{lang-code}` (e.g., `lecture-python.es`)
2. **Bootstrap with bulk translator**: Use `tool-bulk-translator/` for initial translation
3. **Add workflow file**: Copy template, update language config
4. **Add glossary**: Create `glossary/{lang-code}.json`
5. **Configure review workflow**: Add review mode to target repo

#### Workflow Template

```yaml
# .github/workflows/sync-translation-{lang}.yml
name: Sync Translation ({Language Name})

on:
  pull_request:
    types: [closed]
    branches: [main]
    paths:
      - 'lectures/**/*.md'
      - '_toc.yml'

jobs:
  sync:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 2
      
      - uses: QuantEcon/action-translation@v0.8
        with:
          mode: sync
          target-repo: ${{ github.repository }}.{lang-code}
          target-language: {lang-code}
          docs-folder: lectures/
          anthropic-api-key: ${{ secrets.ANTHROPIC_API_KEY }}
          github-token: ${{ secrets.TRANSLATION_PAT }}
```

### Future Enhancements

#### Cross-Language Consistency Checking

**Concept**: Ensure technical terms are translated consistently across all languages.

```
Glossary term: "utility function"
├── zh-cn: "效用函数" ✓
├── fa: "تابع مطلوبیت" ✓
└── es: "función de utilidad" ✓
```

**Implementation**: Glossary validation tool that checks all language files.

#### Translation Status Dashboard

**Concept**: Central view of translation progress across all languages.

```
Lecture: aiyagari.md
├── English: ✓ (source)
├── Chinese: ✓ (synced @ v1.2.3)
├── Farsi: ⚠ (3 sections behind)
└── Spanish: ✗ (not started)
```

**Implementation**: GitHub Action that generates status badge/page.

---

## 3. Bidirectional Sync / Upstream Suggestions

### Problem Statement

Currently, sync is **unidirectional**: English → Other Languages.

But valuable improvements may originate in translations:
- Translator finds error in English original
- Better explanation discovered while translating
- Code bug found during translation review
- Clearer mathematical notation suggested

### Design Philosophy

**QuantEcon's Position**: English is the **source of truth**. Any upstream changes must be:
1. Reviewed by English content maintainers
2. Approved before propagation to other languages
3. Clearly marked as "suggestions" not "corrections"

This is **not automatic bidirectional sync**, but rather a **suggestion workflow**.

### Proposed: Upstream Suggestion System

```
                    ┌─────────────────────────┐
                    │  lecture-python.myst    │
            ┌───────│       (English Hub)     │◀───────┐
            │       └───────────┬─────────────┘        │
            │                   │                      │
         Sync Down          Sync Down           Suggestions Up
            │                   │                      │
            ▼                   ▼                      │
┌──────────────────┐  ┌──────────────────┐            │
│ lecture-python   │  │ lecture-python   │────────────┘
│     .zh-cn       │  │       .fa        │
│   (Chinese)      │  │     (Farsi)      │
└──────────────────┘  └──────────────────┘
```

### Workflow Design

#### Trigger: Label-Based

Translator adds special label to translation PR:

```yaml
# In target repo (e.g., lecture-python.zh-cn)
on:
  pull_request:
    types: [labeled]
    
jobs:
  suggest-upstream:
    if: contains(github.event.label.name, 'suggest-upstream')
    # ...
```

#### Alternative Trigger: Comment Command

```markdown
<!-- In PR comment -->
/suggest-upstream

This translation revealed a potential improvement to the original English:
- Line 45: "Bellman equation" should include the discount factor
- Line 78: Code example has off-by-one error
```

### Suggestion PR Format

When triggered, create PR in English repository:

```markdown
# Suggestion from Chinese Translation

**Source**: lecture-python.zh-cn PR #42
**Translator**: @translator-username
**Language**: Chinese (zh-cn)

## Suggested Changes

The following suggestions were identified during translation of `lectures/aiyagari.md`:

### 1. Mathematical Notation (Line 45)

**Current English**:
```
The Bellman equation is V(s) = max{u(c) + V(s')}
```

**Suggested Improvement**:
```
The Bellman equation is V(s) = max{u(c) + βV(s')}
```

**Reason**: Missing discount factor β

---

### 2. Code Example (Line 78)

**Current Code**:
```python
for i in range(n):
    result[i+1] = compute(i)  # IndexError when i = n-1
```

**Suggested Fix**:
```python
for i in range(n-1):
    result[i+1] = compute(i)
```

---

## Review Instructions

- [ ] Review each suggestion
- [ ] Accept/modify/reject as appropriate
- [ ] Merge to propagate to all languages

**Note**: This PR was auto-generated from translation feedback. 
The Chinese translation PR will be updated once this is resolved.
```

### Implementation Approaches

#### Approach A: Manual Suggestion Entry

Translator manually writes suggestions in PR description or comment.

**Workflow**:
1. Translator adds `suggest-upstream` label to translation PR
2. Action reads PR description for suggestions (structured format)
3. Creates suggestion PR in English repo
4. Links the two PRs

**Pros**:
- ✅ Simple implementation
- ✅ Human-curated suggestions
- ✅ No AI interpretation errors

**Cons**:
- ❌ Requires structured format discipline
- ❌ Extra work for translator

#### Approach B: AI-Assisted Suggestion Extraction

Use Claude to identify potential upstream improvements.

**Workflow**:
1. Translator adds label + freeform comment describing issue
2. Action sends context to Claude
3. Claude formats suggestion PR content
4. Human reviews before creation

**Prompt Example**:
```
You are reviewing a translation from English to Chinese.
The translator has identified potential issues with the English original.

Translator's comment:
"{translator_comment}"

English section:
"{english_content}"

Chinese translation:
"{chinese_content}"

Please identify specific suggestions for improving the English original.
Format as actionable items with line references.
```

**Pros**:
- ✅ Natural language input from translator
- ✅ Consistent formatting
- ✅ Can catch related issues

**Cons**:
- ❌ More complex implementation
- ❌ AI may misinterpret suggestions
- ❌ Additional API costs

#### Approach C: Diff-Based Detection

Automatically detect when translation differs structurally from source.

**Concept**: If Chinese translation has content that doesn't map to English, flag for review.

**Example Detection**:
```
English: "The function returns a value"
Chinese: "该函数返回一个值。注意：原文可能有误，此处应为'返回一个数组'"
         (Note: Original may be wrong, should be 'returns an array')

Detection: Chinese has translator note suggesting English error
```

**Pros**:
- ✅ Catches organic feedback
- ✅ No extra translator action needed

**Cons**:
- ❌ High false positive rate
- ❌ Complex detection logic
- ❌ Translator notes may be internal, not upstream suggestions

### Recommended Implementation

**Phase 1: Manual Workflow** (Low effort, immediate value)

1. Create issue template in English repo for translation suggestions
2. Document process for translators to submit suggestions
3. No automation - just clear process

**Phase 2: Label-Triggered Suggestions** (Medium effort)

1. Add `mode: suggest` to action
2. Trigger on `suggest-upstream` label
3. Parse structured description format
4. Create linked suggestion PR

**Phase 3: AI-Assisted** (Higher effort, nice-to-have)

1. Add Claude-powered suggestion extraction
2. Handle freeform translator comments
3. Smart formatting and deduplication

### Workflow Configuration

```yaml
# .github/workflows/upstream-suggestions.yml (in target repo)
name: Upstream Suggestions

on:
  pull_request:
    types: [labeled]

jobs:
  suggest:
    if: github.event.label.name == 'suggest-upstream'
    runs-on: ubuntu-latest
    steps:
      - uses: QuantEcon/action-translation@v0.9
        with:
          mode: suggest
          source-repo: QuantEcon/lecture-python.myst
          suggestion-format: structured  # or: freeform (AI-assisted)
          github-token: ${{ secrets.TRANSLATION_PAT }}
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  Target Repo (lecture-python.zh-cn)                         │
│                                                             │
│  Translation PR #42                                         │
│  ├── Label: "suggest-upstream" (added by translator)        │
│  └── Description:                                           │
│      ```                                                    │
│      ## Upstream Suggestions                                │
│      - [ ] Line 45: Missing discount factor β               │
│      - [ ] Line 78: Off-by-one error in loop                │
│      ```                                                    │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ Action triggered
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  action-translation (mode: suggest)                         │
│                                                             │
│  1. Parse suggestion items from PR description              │
│  2. Fetch relevant English content                          │
│  3. Format suggestion PR content                            │
│  4. Create PR in source repo                                │
│  5. Add cross-reference comment to original PR              │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  Source Repo (lecture-python.myst)                          │
│                                                             │
│  Suggestion PR #123                                         │
│  ├── Title: "Suggestion from zh-cn: aiyagari.md"           │
│  ├── Labels: ["translation-suggestion", "zh-cn"]            │
│  ├── Body: Formatted suggestions with context               │
│  └── Linked: References target PR #42                       │
└─────────────────────────────────────────────────────────────┘
```

### Considerations

1. **Permission Model**: Target repo needs write access to source repo (via PAT)
2. **Spam Prevention**: Limit suggestions per PR, require maintainer approval
3. **Tracking**: Link suggestion PR back to translation PR for updates
4. **Resolution**: When suggestion PR is merged/closed, notify translation PR

---

## Summary & Prioritization

| Feature | Priority | Effort | Value | Status |
|---------|----------|--------|-------|--------|
| Resync Monitoring | Medium | Low | Medium | Planned |
| Resync Auto-fix | Low | Medium | Medium | Future |
| Multi-lang Documentation | High | Low | High | **Ready to implement** |
| Upstream Suggestions (Manual) | Medium | Low | Medium | Planned |
| Upstream Suggestions (Automated) | Low | High | Medium | Future |

### Recommended Roadmap

**v0.8.0** (Near-term)
- [ ] Document multi-language hub-spoke setup
- [ ] Add workflow templates for new languages
- [ ] Resync monitoring mode (report-only)

**v0.9.0** (Medium-term)
- [ ] Label-triggered upstream suggestions
- [ ] Suggestion PR creation and linking
- [ ] Resync auto-fix mode

**v1.0.0** (Future)
- [ ] AI-assisted suggestion extraction
- [ ] Cross-language consistency checking
- [ ] Translation status dashboard

---

## Appendix: Configuration Reference (Proposed)

### Resync Mode Inputs

```yaml
inputs:
  mode:
    description: 'resync | monitor'
  resync-strategy:
    description: 'report-only | auto-sync | hybrid'
    default: 'report-only'
  resync-scope:
    description: 'all | changed-since-last-sync'
    default: 'all'
  notification:
    description: 'issue | comment | none'
    default: 'issue'
```

### Suggest Mode Inputs

```yaml
inputs:
  mode:
    description: 'suggest'
  source-repo:
    description: 'English repository (owner/repo)'
    required: true
  suggestion-format:
    description: 'structured | freeform'
    default: 'structured'
  suggestion-labels:
    description: 'Labels for suggestion PRs'
    default: 'translation-suggestion'
```

---

**Document Maintainer**: QuantEcon Team  
**Feedback**: Open an issue or discussion in the repository
