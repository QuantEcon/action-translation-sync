#!/bin/bash
# Example: Bulk translate lecture-python to Chinese (Simplified)

# Set your API keys (or export from environment)
export ANTHROPIC_API_KEY="${ANTHROPIC_API_KEY:-your-anthropic-api-key-here}"
export GITHUB_TOKEN="${GITHUB_TOKEN:-your-github-token-here}"

# Run bulk translation
npm run translate -- \
  --source-repo QuantEcon/lecture-python \
  --target-folder lecture-python.zh-cn \
  --source-language en \
  --target-language zh-cn \
  --docs-folder lectures/ \
  --anthropic-api-key "$ANTHROPIC_API_KEY" \
  --github-token "$GITHUB_TOKEN" \
  --batch-delay 1000

# After completion, you can:
# 1. Review translations: cd lecture-python.zh-cn
# 2. Build the book: jupyter-book build .
# 3. Initialize git and push to GitHub
