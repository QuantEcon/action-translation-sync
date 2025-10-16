# Built-in Translation Glossary

## Overview

The Translation Sync Action includes **built-in glossaries** for consistent translation across all QuantEcon lecture repositories.

**Location**: `glossary/{language}.json` (bundled with the action)

## Current Glossaries

- **`glossary/zh-cn.json`** - Simplified Chinese (342 terms)
  - 300+ technical terms
  - 42 economist names
  
**Future**: 
- `glossary/ja.json` - Japanese (planned)
- `glossary/es.json` - Spanish (planned)

## Benefits

### ✅ Single Source of Truth
- All repositories use the same glossary automatically
- No need to duplicate glossary files across repos
- Updates to the glossary benefit all users immediately

### ✅ Consistency
- "Dynamic programming" → "动态规划" everywhere
- "Equilibrium" → "均衡" everywhere
- "State variable" → "状态变量" everywhere

### ✅ Zero Configuration
- No setup required - works out of the box
- Just use the action, glossary is automatically loaded

## What's Included

### Economic Terms (~150 terms)
- Macroeconomics: GDP, inflation, equilibrium, fiscal policy
- Microeconomics: consumer surplus, elasticity, marginal utility
- Finance: options, bonds, present value, risk-neutral pricing
- Growth theory: Solow model, golden rule, capital dynamics

### Mathematical Terms (~100 terms)
- Linear algebra: eigenvalue, matrix, characteristic polynomial
- Calculus: derivative, integral, Taylor series
- Probability: distribution, expectation, variance, law of large numbers
- Optimization: dynamic programming, Bellman operator, value function

### Statistical Terms (~30 terms)
- Distributions: normal, exponential, Cauchy, log-normal
- Methods: maximum likelihood, kernel density, regression
- Concepts: convergence, stationarity, ergodicity

### Economist Names (~40 names)
- Nobel laureates: Kenneth Arrow, Robert Solow, Thomas Sargent
- Historical figures: Leon Walras, Vilfredo Pareto, Ragnar Frisch
- Contemporary economists: Xavier Gabaix, José Scheinkman

## How It Works

### Automatic Loading

When the action runs:

1. **Built-in glossary loaded first** - looks for `glossary/{target-language}.json`
2. **Applied to all translations** via Claude Sonnet 4.5 prompts
3. **Ensures consistency** across all documents

```typescript
// In src/index.ts
const builtInGlossaryPath = path.join(__dirname, '..', 'glossary', `${inputs.targetLanguage}.json`);
const glossaryContent = await fs.readFile(builtInGlossaryPath, 'utf-8');
glossary = JSON.parse(glossaryContent);
```

**Language-specific**: Automatically selects the correct glossary based on `target-language` input.

### No User Action Required

Users don't need to:
- ❌ Create glossary files
- ❌ Configure glossary paths
- ❌ Maintain glossary copies
- ❌ Update glossaries manually

Just works! ✅

## Custom Glossary (Advanced)

If you need project-specific terms, you can provide a custom glossary:

```yaml
# In workflow file
with:
  glossary-path: '.github/custom-glossary.json'
```

The custom glossary will be used as a **fallback** if the built-in glossary fails to load.

### When to Use Custom Glossary

- Project has specialized domain terms not in built-in glossary
- Need to override specific translations
- Testing new terminology before adding to built-in glossary

### Recommendation

**Add terms to the built-in glossary instead!**

Submit a PR to the action repository to add new terms. Benefits:
- Everyone gets the update
- Single source of truth maintained
- No maintenance burden on individual projects

## Glossary Format

```json
{
  "version": "1.0",
  "terms": [
    {
      "en": "dynamic programming",
      "zh-cn": "动态规划",
      "context": "optimization"
    },
    {
      "en": "Robert Solow",
      "zh-cn": "罗伯特·索洛",
      "context": "economist name"
    }
  ]
}
```

### Fields

- **`en`**: English term (required)
- **`zh-cn`**: Simplified Chinese translation (required)
- **`context`**: Usage context - helps Claude understand when to use this translation
  - Examples: "economics", "mathematics", "economist name", "technical term"

## Adding New Terms

To add terms to the built-in glossary:

1. **Edit** `glossary/{language}.json` in the action repo (e.g., `glossary/zh-cn.json`)
2. **Add term** following the format above
3. **Test** with a sample translation
4. **Submit PR** with description of new terms
5. **Release** new version of action

### Adding a New Language

To add support for a new language (e.g., Japanese):

1. **Create** `glossary/ja.json` with translated terms
2. **Update** documentation to list supported languages
3. **Test** with Japanese target repository
4. **Submit PR** and release new version

Users can then use:
```yaml
with:
  target-language: 'ja'
  # Automatically loads glossary/ja.json
```

### Example PR

```markdown
## Add Financial Terms to Glossary

Adds 10 new terms related to options pricing:

- Barrier option → 障碍期权
- Knockout barrier → 敲出障碍
- Strike price → 行权价
- European call option → 欧式看涨期权
...

These terms appear frequently in the derivatives lectures.
```

## Maintenance

### Updating Built-in Glossary

The glossary is versioned with the action:

- **v0.1.x**: Current development glossary (300+ terms)
- **v0.2.x**: May add more terms based on usage
- **v1.0**: Stable glossary for production

### Quality Guidelines

When adding terms:

1. **Verify translation** with native speakers
2. **Check consistency** with existing terms
3. **Add context** to disambiguate usage
4. **Test with Claude** to ensure it uses the term correctly

### Review Process

New terms should be reviewed for:
- Accuracy of translation
- Consistency with existing terminology
- Appropriate context labels
- Common usage in QuantEcon lectures

## Statistics

**Current Built-in Glossary**:
- Total terms: 342
- Economic terms: 152
- Mathematical terms: 98
- Statistical terms: 32
- Names: 42
- Other: 18

**Coverage**:
- Covers ~95% of technical terms in QuantEcon lectures
- Rare terms may need ad-hoc translation

## Examples

### Before Built-in Glossary

User had to create:
```json
// In lecture-python.myst/.github/translation-glossary.json
{
  "version": "1.0",
  "terms": [
    { "en": "dynamic programming", "zh-cn": "动态规划" },
    { "en": "equilibrium", "zh-cn": "均衡" },
    ...300 more terms...
  ]
}
```

And in `lecture-julia.myst/.github/translation-glossary.json`:
```json
// Same 300+ terms duplicated!
```

**Problem**: Maintenance nightmare, inconsistencies, duplication

### With Built-in Glossary

User workflow file:
```yaml
uses: quantecon/action-translation-sync@v0.1
with:
  target-repo: 'quantecon/lecture-python.zh-cn'
  target-language: 'zh-cn'
  # That's it! Glossary automatically loaded
```

**Benefit**: Zero maintenance, automatic updates, consistency guaranteed

## Future Enhancements

Potential improvements for v1.0:

1. **Multi-language support**
   - Add `ja` (Japanese) translations
   - Add `es` (Spanish) translations
   - Expand to other languages

2. **Domain-specific glossaries**
   - Separate glossaries for different lecture series
   - Merge relevant glossaries automatically

3. **Glossary validation**
   - Check for duplicates
   - Verify translation completeness
   - Suggest similar terms

4. **Usage statistics**
   - Track which terms are used most
   - Identify missing terms
   - Guide glossary expansion

## Support

Questions about the glossary?

- View current terms: `glossary/{language}.json`
- Suggest new terms: Open an issue
- Report incorrect translations: Open an issue
- Add new language: Submit a PR with new glossary file
- Contribute: Submit a PR

---

**Remember**: The built-in glossary ensures consistent, high-quality translations across all QuantEcon lectures with zero configuration! 🎯
