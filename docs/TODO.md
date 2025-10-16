# Translation Sync Action - TODO

## Project Status

**Current Version**: v0.1.x (Development Phase)  
**Target Version**: v1.0 (Production Ready)  
**Focus**: Simplicity and ease of maintenance

**Note**: We are NOT maintaining backward compatibility during v0.1.x development. Breaking changes are acceptable and expected as we iterate toward the best design.

## Completed ✅

### Step 1: Project Setup
- [x] Initialize npm package
- [x] Configure TypeScript
- [x] Set up ESLint and Prettier
- [x] Configure Jest for testing
- [x] Create action.yml metadata
- [x] Create .gitignore

### Step 2: MyST Parser Implementation
- [x] Create type definitions (types.ts)
- [x] Implement MyST parser using remark
- [x] Support for headings, paragraphs, code blocks
- [x] Support for MyST directives
- [x] Support for math equations
- [x] Block-based document structure
- [x] Heading ID generation
- [x] Context extraction for blocks

### Step 3: Diff Detection Engine
- [x] Implement change detection (added/modified/deleted)
- [x] Structural block matching
- [x] Fuzzy content similarity matching
- [x] Block mapping to target document
- [x] Confidence scoring for matches

## In Progress 🚧

### Step 4: Translation Service
- [x] Claude API integration
- [x] Diff mode prompt building
- [x] Full mode prompt building
- [x] Glossary formatting
- [ ] Error handling and retries
- [ ] Rate limiting

### Step 5: File Processing
- [x] Orchestrate diff-based translation
- [x] Orchestrate full file translation
- [x] Apply translations to target document
- [x] MyST validation
- [ ] TOC file parsing and updating

## Remaining Work 📝

### Step 6: GitHub Integration
- [ ] Clone target repository
- [ ] Create branch in target repo
- [ ] Commit translated files
- [ ] Create pull request
- [ ] Add PR description with source PR link
- [ ] Apply labels and reviewers
- [ ] Comment on source PR with target PR link

### Step 7: Testing
- [ ] Unit tests for parser
- [ ] Unit tests for diff detector
- [ ] Unit tests for translator (mocked)
- [ ] Unit tests for file processor
- [ ] Integration tests
- [ ] E2E test with sample repos

### Step 8: Documentation
- [x] README with usage instructions
- [x] Example workflow configurations
- [x] Glossary format documentation
- [ ] API documentation
- [ ] Troubleshooting guide
- [ ] Contributing guidelines

### Step 9: CI/CD
- [ ] GitHub Actions workflow for testing
- [ ] GitHub Actions workflow for building
- [ ] Version tagging and releases
- [ ] Dependabot configuration

### Step 10: Enhancements
- [ ] Support for multiple files in single PR
- [ ] Batch translation optimization
- [ ] Translation memory/caching
- [ ] Dry-run mode
- [ ] Custom prompt templates
- [ ] Translation quality metrics
- [ ] Issue creation on failure
- [ ] Notification system

## Known Issues 🐛

None at the moment

## Notes 📔

- Using Claude Sonnet 4.5 (model: claude-sonnet-4-20250514)
- MyST parsing uses unified/remark ecosystem
- Type errors resolved by using `any` for visit callback (remark types are complex)
- Build successful with ncc bundling
