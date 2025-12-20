# Translation Glossaries

This folder contains built-in translation glossaries for the Translation Sync Action.

## Structure

Each language has its own glossary file:

```
glossary/
├── README.md          # This file
├── zh-cn.json         # Simplified Chinese glossary
├── ja.json            # Japanese glossary (future)
└── es.json            # Spanish glossary (future)
```

## File Naming Convention

Glossary files are named using **language codes**:

- `zh-cn.json` - Simplified Chinese (中文简体)
- `zh-tw.json` - Traditional Chinese (中文繁體) - future
- `fa.json` - Persian/Farsi (فارسی)
- `hi.json` - Hindi (हिन्दी)
- `ja.json` - Japanese (日本語) - future
- `es.json` - Spanish (Español) - future
- `fr.json` - French (Français) - future

The filename **must match** the `target-language` input in the workflow configuration.

## How It Works

When the action runs with `target-language: 'zh-cn'`:

1. Loads `glossary/zh-cn.json` automatically
2. Includes terms in translation prompts to Claude
3. Ensures consistent terminology across all translations

## Current Glossaries

### Simplified Chinese (`zh-cn.json`)

**Status**: ✅ Complete (357 terms)

**Contents**:
- ~160 economic terms (GDP, equilibrium, fiscal policy, etc.)
- ~100 mathematical terms (eigenvalue, matrix, derivative, etc.)
- ~35 statistical terms (distribution, regression, variance, etc.)
- ~45 economist names (Robert Solow, Kenneth Arrow, etc.)
- ~17 miscellaneous terms

**Maintained by**: QuantEcon team

**Last updated**: October 2025

### Persian/Farsi (`fa.json`)

**Status**: ✅ Complete (357 terms)

**Contents**:
- ~160 economic terms (تولید ناخالص داخلی, تعادل, سیاست مالی, etc.)
- ~100 mathematical terms (مقدار ویژه, ماتریس, مشتق, etc.)
- ~35 statistical terms (توزیع, رگرسیون, واریانس, etc.)
- ~45 economist names (رابرت سولو, کنت آرو, etc.)
- ~17 miscellaneous terms

**Maintained by**: QuantEcon team

**Last updated**: December 2025

### Hindi (`hi.json`)

**Status**: ✅ Complete (357 terms)

**Contents**:
- ~160 economic terms (सकल घरेलू उत्पाद, संतुलन, राजकोषीय नीति, etc.)
- ~100 mathematical terms (आइगनमान, मैट्रिक्स, अवकलज, etc.)
- ~35 statistical terms (वितरण, प्रतिगमन, प्रसरण, etc.)
- ~45 economist names (रॉबर्ट सोलो, केनेथ एरो, etc.)
- ~17 miscellaneous terms

**Special Features**:
- All entries include `hi-roman` field with romanized (Latin script) transliterations
- 91 entries have `certainty` ratings (74 "low", 17 "medium") for transliterations and loanwords

**Maintained by**: QuantEcon team

**Last updated**: December 2025

### Japanese (`ja.json`)

**Status**: 🚧 Planned

Will include translations for all terms in the existing glossaries.

### Spanish (`es.json`)

**Status**: 🚧 Planned

Will include translations for all terms in the existing glossaries.

## Glossary Format

Each glossary file follows this JSON structure:

```json
{
  "version": "1.0",
  "description": "Translation glossary for QuantEcon lectures (English to {language})",
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

For Hindi, additional fields are included:

```json
{
  "en": "Markov chain",
  "hi": "मार्कोव श्रृंखला",
  "hi-roman": "markov shrinkhla",
  "context": "stochastic processes",
  "certainty": "low"
}
```

### Required Fields

- `en` (string): English term
- `{language-code}` (string): Translation in target language
- `context` (string, optional): Usage context to help AI understand when to use this translation

### Optional Fields

- `{language-code}-roman` (string): Romanized transliteration (for non-Latin scripts like Hindi)
- `certainty` (string): Confidence level ("low", "medium", "high") - only included when not "high"

### Context Examples

- `"economics"` - General economics term
- `"macroeconomics"` - Macroeconomics specific
- `"mathematics"` - Mathematical term
- `"statistics"` - Statistical term
- `"economist name"` - Person's name
- `"institution"` - Organization or institution name
- `"technical term"` - General technical terminology

## Adding Terms

### To Existing Glossary

1. Open the appropriate `{language}.json` file
2. Add new term(s) to the `terms` array:
   ```json
   {
     "en": "new term",
     "zh-cn": "新术语",
     "context": "category"
   }
   ```
3. Maintain alphabetical order by English term (optional but recommended)
4. Run `npm run build` to verify JSON is valid
5. Submit PR with clear description of added terms

### New Language Glossary

1. Create `glossary/{language-code}.json`
2. Copy structure from `zh-cn.json`
3. Translate all terms to target language
4. Add description and version fields
5. Test with sample translation
6. Update this README to list the new language
7. Update `docs/BUILT-IN-GLOSSARY.md`
8. Submit PR

## Quality Guidelines

When adding or updating terms:

### ✅ Do

- Verify translations with native speakers
- Use standard/academic terminology
- Add context to disambiguate
- Keep translations concise
- Maintain consistency with existing terms
- Test with Claude to verify usage

### ❌ Don't

- Use colloquial or slang translations
- Translate proper names (unless culturally adapted)
- Add overly specific terms used in only one lecture
- Duplicate terms with different translations
- Use machine translations without verification

## Maintenance

### Version History

- **v1.0** (October 2025): Initial Chinese glossary (342 terms)
- **v1.1** (Future): Expanded Chinese glossary, added Japanese
- **v2.0** (Future): Multi-language support with 5+ languages

### Updating Glossaries

When releasing new versions:

1. Update `version` field in affected glossary files
2. Document changes in release notes
3. Notify users of significant term additions/changes
4. Consider backward compatibility for term modifications

### Review Process

Pull requests adding/modifying glossary terms should:

1. Include rationale for changes
2. Provide source/reference for translations
3. List affected lectures or contexts
4. Get review from native speaker (when possible)

## Usage in Action

The action automatically selects the glossary based on `target-language`:

```yaml
# Workflow configuration
with:
  target-language: 'zh-cn'  # Loads glossary/zh-cn.json
  # No glossary-path needed - automatic!
```

### Custom Override

Users can override with a custom glossary:

```yaml
with:
  target-language: 'zh-cn'
  glossary-path: '.github/custom-glossary.json'  # Optional override
```

## Contributing

We welcome contributions! To add or improve glossaries:

1. Fork the repository
2. Create a feature branch
3. Make your changes to the glossary
4. Test thoroughly
5. Submit a pull request

See [CONTRIBUTING.md](../CONTRIBUTING.md) for detailed guidelines.

## Support

- Questions: Open an issue
- Suggestions: Open an issue or discussion
- Bug reports: Open an issue with example
- Translation help: Tag with `translation` label

## License

These glossaries are part of the Translation Sync Action and inherit its license.

---

**Maintained by**: QuantEcon Team  
**Last updated**: December 5, 2025
