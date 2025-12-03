# Bulk Translator Tool

A standalone CLI tool for **one-time bulk translation** of entire Jupyter Book lecture series using Claude AI.

## Purpose

This tool is designed for **initial setup** when creating a new language version of an existing lecture series. After the initial bulk translation, use the main `action-translation-sync` GitHub Action for incremental updates.

**Use Case**: Creating `lecture-python.zh-cn` from `lecture-python`

## Quick Start

```bash
# 1. Install dependencies
cd tool-bulk-translator
npm install

# 2. Preview (no API keys needed for public repos)
npm run translate -- \
  --source-repo QuantEcon/lecture-python-intro \
  --target-folder /tmp/preview \
  --target-language zh-cn \
  --docs-folder lectures \
  --dry-run

# 3. Actual translation
export ANTHROPIC_API_KEY="your-api-key"
export GITHUB_TOKEN="your-github-token"

npm run translate -- \
  --source-repo QuantEcon/lecture-python \
  --target-folder lecture-python.zh-cn \
  --target-language zh-cn \
  --docs-folder lectures
```

## Command Options

| Option | Required | Default | Description |
|--------|----------|---------|-------------|
| `--source-repo` | Yes | - | Source repository (`owner/repo`) |
| `--target-folder` | Yes | - | Local folder path for translations |
| `--target-language` | Yes | - | Target language code (`zh-cn`, `ja`, `es`) |
| `--source-language` | No | `en` | Source language code |
| `--docs-folder` | No | `lectures/` | Docs folder in repo |
| `--anthropic-api-key` | No* | - | Anthropic API key (not needed for `--dry-run`) |
| `--github-token` | No* | - | GitHub PAT (optional for public repos in `--dry-run`) |
| `--glossary-path` | No | Built-in | Custom glossary file |
| `--model` | No | `claude-sonnet-4-5-20250929` | AI model for translation |
| `--batch-delay` | No | `1000` | Delay between lectures in ms |
| `--resume-from` | No | - | Resume from specific lecture file |
| `--dry-run` | No | - | Preview lectures without translating |

*Required for actual translation, optional for `--dry-run` mode with public repositories

### Model Selection

The tool defaults to **Claude Sonnet 4.5** for a good balance of quality and cost.

For potentially higher quality translations (at ~67% higher cost), you can use **Claude Opus 4.5**:

```bash
npm run translate -- \
  --source-repo QuantEcon/lecture-python \
  --target-folder lecture-python.zh-cn \
  --target-language zh-cn \
  --model claude-opus-4-5-20251101
```

**Available Claude models**:
- `claude-sonnet-4-5-20250929` - Best balance of speed, quality, and cost (default)
- `claude-opus-4-5-20251101` - Maximum intelligence, higher cost
- `claude-haiku-4-5-20251001` - Fastest, lowest cost

*Note: Future versions may support additional providers like Google Gemini.*

## Dry-Run Mode

Preview what will be translated **without making any API calls or creating files**:

```bash
npm run translate -- \
  --source-repo QuantEcon/lecture-python-intro \
  --target-folder /tmp/preview \
  --target-language zh-cn \
  --docs-folder lectures \
  --dry-run
```

**What dry-run does**:
- ✅ Fetches `_toc.yml` from GitHub repository
- ✅ Lists all lectures that would be translated
- ✅ Shows lecture count and file paths
- ❌ **No API calls to Claude** (zero cost)
- ❌ **No files created** on disk
- ❌ **No API keys needed** for public repositories

## How It Works

1. **Setup**: Validates inputs, loads glossary, initializes Claude API
2. **Prepare**: Fetches source repo, copies non-.md files (images, configs, data)
3. **Translate**: Processes each lecture from `_toc.yml` sequentially
4. **Generate**: Creates heading-maps, preserves MyST formatting
5. **Report**: Outputs translation summary with stats

### Why One Lecture at a Time?

**Quality Benefits**:
- ✅ Focused context within single topic
- ✅ Consistent terminology throughout lecture
- ✅ Better handling of math/code in context
- ✅ Coherent narrative flow (intro → body → conclusion)

**Practical Benefits**:
- ✅ Stays within token limits for large lectures
- ✅ Independent error recovery per lecture
- ✅ Clear progress tracking (15/50 done)
- ✅ Easy quality spot-checking

## Cost Estimation

| Model | Input | Output | ~Cost per lecture |
|-------|-------|--------|-------------------|
| Sonnet 4.5 | $3/MTok | $15/MTok | ~$0.18 |
| Opus 4.5 | $5/MTok | $25/MTok | ~$0.30 |

For 50 lectures:
- **Sonnet 4.5**: ~$9
- **Opus 4.5**: ~$15

## After Bulk Translation

Once the initial translation is complete:

1. **Review translations** in the target folder
2. **Build book**: `jupyter-book build lecture-python.zh-cn`
3. **Push to GitHub** as new repository
4. **Configure `action-translation-sync`** for incremental updates

## Example: Full Workflow

```bash
# Step 1: Preview
npm run translate -- \
  --source-repo QuantEcon/lecture-python \
  --target-folder ~/translations/lecture-python.zh-cn \
  --target-language zh-cn \
  --dry-run

# Step 2: Translate with Opus for maximum quality
npm run translate -- \
  --source-repo QuantEcon/lecture-python \
  --target-folder ~/translations/lecture-python.zh-cn \
  --target-language zh-cn \
  --model claude-opus-4-5-20251101 \
  --anthropic-api-key $ANTHROPIC_API_KEY \
  --github-token $GITHUB_TOKEN

# Step 3: Build and verify
cd ~/translations/lecture-python.zh-cn
jupyter-book build .

# Step 4: Push to GitHub
git init
git add .
git commit -m "Initial Chinese translation"
git remote add origin https://github.com/QuantEcon/lecture-python.zh-cn.git
git push -u origin main
```

## Troubleshooting

### Resume after failure

If translation fails partway through, resume from the last successful lecture:

```bash
npm run translate -- \
  --source-repo QuantEcon/lecture-python \
  --target-folder lecture-python.zh-cn \
  --target-language zh-cn \
  --resume-from lectures/markov_chains_I.md
```

### Rate limits

If you hit API rate limits, increase the batch delay:

```bash
--batch-delay 5000  # 5 seconds between lectures
```

## Related

- **[action-translation-sync](../)** - GitHub Action for incremental translation sync
- **[tool-test-action-on-github](../tool-test-action-on-github/)** - Testing framework
