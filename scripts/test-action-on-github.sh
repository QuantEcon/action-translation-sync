#!/bin/bash
#
# Test Action on GitHub
# 
# This script resets and sets up the test-translation-sync repositories for 
# comprehensive end-to-end testing of the translation action.
#
# Usage: ./scripts/test-action-on-github.sh [--dry-run]
#
# Options:
#   --dry-run    Show what would be done without making any changes
#
# Prerequisites:
# - GitHub CLI (gh) must be installed and authenticated
# - Repositories must already exist on GitHub:
#   - QuantEcon/test-translation-sync
#   - QuantEcon/test-translation-sync.zh-cn
# - ANTHROPIC_API_KEY secret must be configured in test-translation-sync
#
# What this script does:
# 1. Clones/updates both test repositories
# 2. Force pushes base state to main (clean slate)
# 3. Closes all open PRs on source repo
# 4. Creates 9 fresh test PRs with different scenarios
# 5. Adds 'test-translation' label to each PR
# 6. Prints summary of created PRs
#

set -e  # Exit on error

# Parse arguments
DRY_RUN=false
if [[ "$1" == "--dry-run" ]]; then
    DRY_RUN=true
fi

# Configuration
OWNER="QuantEcon"
SOURCE_REPO="test-translation-sync"
TARGET_REPO="test-translation-sync.zh-cn"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$SCRIPT_DIR/test-action-on-github-data"
WORK_DIR="."  # Clone to current directory
TEST_FILE="lecture.md"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}========================================${NC}"
    echo -e "${CYAN}DRY RUN MODE - No changes will be made${NC}"
    echo -e "${CYAN}========================================${NC}"
    echo ""
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Test Action on GitHub - Reset & Setup${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check prerequisites
if ! command -v gh &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI (gh) is not installed.${NC}"
    echo "Install it from: https://cli.github.com/"
    exit 1
fi

if ! gh auth status &> /dev/null; then
    echo -e "${RED}Error: GitHub CLI is not authenticated.${NC}"
    echo "Run: gh auth login"
    exit 1
fi

# Check if repos exist
if ! gh repo view "$OWNER/$SOURCE_REPO" &> /dev/null; then
    echo -e "${RED}Error: Repository $OWNER/$SOURCE_REPO does not exist.${NC}"
    echo "Please create it first on GitHub."
    exit 1
fi

if ! gh repo view "$OWNER/$TARGET_REPO" &> /dev/null; then
    echo -e "${RED}Error: Repository $OWNER/$TARGET_REPO does not exist.${NC}"
    echo "Please create it first on GitHub."
    exit 1
fi

echo -e "${GREEN}✓${NC} Prerequisites check passed"
echo ""

# Check if repos exist (skip validation in dry-run)
REPOS_EXIST=true
if ! gh repo view "$OWNER/$SOURCE_REPO" &> /dev/null; then
    if [ "$DRY_RUN" = false ]; then
        echo -e "${RED}Error: Repository $OWNER/$SOURCE_REPO does not exist.${NC}"
        echo "Please create it first on GitHub."
        exit 1
    else
        REPOS_EXIST=false
        echo -e "${YELLOW}Note: Repository $OWNER/$SOURCE_REPO does not exist yet.${NC}"
    fi
fi

if ! gh repo view "$OWNER/$TARGET_REPO" &> /dev/null; then
    if [ "$DRY_RUN" = false ]; then
        echo -e "${RED}Error: Repository $OWNER/$TARGET_REPO does not exist.${NC}"
        echo "Please create it first on GitHub."
        exit 1
    else
        REPOS_EXIST=false
        echo -e "${YELLOW}Note: Repository $OWNER/$TARGET_REPO does not exist yet.${NC}"
    fi
fi

if [ "$DRY_RUN" = true ] && [ "$REPOS_EXIST" = false ]; then
    echo -e "${CYAN}[DRY RUN] This shows what would happen if repos existed.${NC}"
fi

#
# STEP 1: Clone or update source repository
#
echo -e "${BLUE}Step 1: Preparing source repository...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would clone/update $OWNER/$SOURCE_REPO${NC}"
    echo -e "${CYAN}[DRY RUN] Would reset to base-minimal.md${NC}"
    echo -e "${CYAN}[DRY RUN] Would ensure workflow file exists${NC}"
    echo -e "${CYAN}[DRY RUN] Would force push to main${NC}"
else
    if [ -d "$SOURCE_REPO" ]; then
        echo "Repository already cloned, updating..."
        cd "$SOURCE_REPO"
        git fetch origin
        git checkout main
        git reset --hard origin/main
        cd ..
    else
        echo "Cloning source repository..."
        git clone "https://github.com/$OWNER/$SOURCE_REPO.git"
    fi

    cd "$SOURCE_REPO"

    # Reset to base state
    echo "Resetting to base state..."
    rm -f *.md
    cp "$DATA_DIR/base-minimal.md" "$TEST_FILE"

    # Ensure workflow exists
    mkdir -p .github/workflows
    cp "$DATA_DIR/workflow-template.yml" .github/workflows/translation-sync.yml

    # Force push to main
    git add -A
    git commit -m "Reset: base state for testing" || echo "No changes to commit"
    git push -f origin main

    echo -e "${GREEN}✓${NC} Source repo reset to base state"

    cd ..
fi

#
# STEP 2: Clone or update target repository
#
echo -e "${BLUE}Step 2: Preparing target repository...${NC}"

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would clone/update $OWNER/$TARGET_REPO${NC}"
    echo -e "${CYAN}[DRY RUN] Would reset to base-minimal-zh-cn.md${NC}"
    echo -e "${CYAN}[DRY RUN] Would force push to main${NC}"
else
    if [ -d "$TARGET_REPO" ]; then
        echo "Repository already cloned, updating..."
        cd "$TARGET_REPO"
        git fetch origin
        git checkout main
        git reset --hard origin/main
        cd ..
    else
        echo "Cloning target repository..."
        git clone "https://github.com/$OWNER/$TARGET_REPO.git"
    fi

    cd "$TARGET_REPO"

    # Reset to base state
    echo "Resetting to base state..."
    rm -f *.md
    cp "$DATA_DIR/base-minimal-zh-cn.md" "$TEST_FILE"

    # Force push to main
    git add -A
    git commit -m "Reset: base state for testing (Chinese)" || echo "No changes to commit"
    git push -f origin main

    echo -e "${GREEN}✓${NC} Target repo reset to base state"

    cd "../$SOURCE_REPO"
fi

echo ""

#
# STEP 3: Close all open PRs
#
echo -e "${BLUE}Step 3: Closing all open PRs...${NC}"

if [ "$DRY_RUN" = true ]; then
    OPEN_PRS=$(gh pr list --repo "$OWNER/$SOURCE_REPO" --state open --json number --jq '.[].number' 2>/dev/null || echo "")
    if [ -z "$OPEN_PRS" ]; then
        echo -e "${CYAN}[DRY RUN] No open PRs to close${NC}"
    else
        echo -e "${CYAN}[DRY RUN] Would close the following PRs:${NC}"
        for pr_number in $OPEN_PRS; do
            echo -e "${CYAN}  - PR #${pr_number}${NC}"
        done
    fi
else
    # Get list of open PRs
    OPEN_PRS=$(gh pr list --repo "$OWNER/$SOURCE_REPO" --state open --json number --jq '.[].number')

    if [ -z "$OPEN_PRS" ]; then
        echo "No open PRs to close"
    else
        for pr_number in $OPEN_PRS; do
            gh pr close "$pr_number" --repo "$OWNER/$SOURCE_REPO" --comment "Closing for test reset"
            echo -e "${GREEN}✓${NC} Closed PR #${pr_number}"
        done
    fi

    # Clean up local branches
    git checkout main
    git branch | grep -v "main" | xargs -r git branch -D 2>/dev/null || true
fi

echo ""

#
# STEP 4: Create test PRs
#
echo -e "${BLUE}Step 4: Creating test PRs...${NC}"

# Ensure the test-translation label exists
if [ "$DRY_RUN" = false ]; then
    if ! gh label list --repo "$OWNER/$SOURCE_REPO" | grep -q "test-translation"; then
        echo "Creating test-translation label..."
        gh label create "test-translation" --repo "$OWNER/$SOURCE_REPO" \
            --description "Trigger translation action in TEST mode" \
            --color "0E8A16" || echo "Label may already exist"
    fi
fi

echo ""

# Array of test scenarios
declare -a scenarios=(
    "01-intro-change-minimal:Intro text updated"
    "02-title-change-minimal:Title changed"
    "03-section-content-minimal:Section content updated"
    "04-section-reorder-minimal:Sections reordered"
    "05-add-section-minimal:New section added"
    "06-delete-section-minimal:Section removed"
    "07-subsection-change-minimal:Subsection content updated"
    "08-multi-element-minimal:Multiple elements changed"
)

# Special case for real-world (uses lecture base)
REAL_WORLD_SCENARIO="09-real-world-lecture:Real-world lecture update"

# Create PRs for minimal scenarios
for scenario in "${scenarios[@]}"; do
    IFS=':' read -r file_prefix description <<< "$scenario"
    branch_name="test/${file_prefix}"
    
    if [ "$DRY_RUN" = true ]; then
        echo -e "${CYAN}[DRY RUN] Would create PR: ${description}${NC}"
        echo -e "${CYAN}  Branch: ${branch_name}${NC}"
        echo -e "${CYAN}  File: ${file_prefix}.md${NC}"
        echo -e "${CYAN}  Label: test-translation${NC}"
        echo ""
    else
        echo -e "${YELLOW}Creating PR: ${description}${NC}"
        
        # Create branch
        git checkout -b "$branch_name" main
        
        # Copy test file
        cp "$DATA_DIR/${file_prefix}.md" "$TEST_FILE"
        
        # Commit changes
        git add "$TEST_FILE"
        git commit -m "Test: ${description}"
        
        # Push branch (force push to overwrite if exists)
        git push -f origin "$branch_name"
        
        # Create draft PR with label
        PR_URL=$(gh pr create \
            --title "TEST: ${description}" \
            --body "**Test Scenario**: ${description}

This is an automated test PR to validate the translation action.

**Changes**: See file diff for details.

**Testing**: The \`test-translation\` label will trigger the action." \
            --draft \
            --base main \
            --head "$branch_name")
        
        # Extract PR number from URL
        PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
        
        # Add label
        gh pr edit "$PR_NUMBER" --add-label "test-translation"
        
        echo -e "${GREEN}✓${NC} Created PR #${PR_NUMBER}: ${PR_URL}"
        echo ""
        
        # Return to main
        git checkout main
    fi
done

# Handle real-world scenario (needs lecture base)
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}[DRY RUN] Would switch main to lecture base${NC}"
    echo -e "${CYAN}[DRY RUN] Would update target repo to lecture base${NC}"
    echo -e "${CYAN}[DRY RUN] Would create PR: Real-world lecture update${NC}"
    echo -e "${CYAN}  Branch: test/09-real-world-lecture${NC}"
    echo -e "${CYAN}  File: 09-real-world-lecture.md${NC}"
    echo -e "${CYAN}  Label: test-translation${NC}"
else
    echo -e "${YELLOW}Setting up real-world scenario...${NC}"

    # First, update main to lecture base
    git checkout main
    cp "$DATA_DIR/base-lecture.md" "$TEST_FILE"
    git add "$TEST_FILE"
    git commit -m "Switch to lecture base for real-world test"
    git push origin main

    # Update target repo too
    cd "../$TARGET_REPO"
    cp "$DATA_DIR/base-lecture-zh-cn.md" "$TEST_FILE"
    git add "$TEST_FILE"
    git commit -m "Switch to lecture base for real-world test (Chinese)"
    git push origin main
    cd "../$SOURCE_REPO"

    # Now create the real-world PR
    IFS=':' read -r file_prefix description <<< "$REAL_WORLD_SCENARIO"
    branch_name="test/${file_prefix}"

    echo -e "${YELLOW}Creating PR: ${description}${NC}"

    git checkout -b "$branch_name" main
    cp "$DATA_DIR/${file_prefix}.md" "$TEST_FILE"
    git add "$TEST_FILE"
    git commit -m "Test: ${description}"
    git push -f origin "$branch_name"

    PR_URL=$(gh pr create \
        --title "TEST: ${description}" \
        --body "**Test Scenario**: ${description}

This is an automated test PR with realistic lecture content.

**Changes**: Multiple sections updated with real content.

**Testing**: The \`test-translation\` label will trigger the action." \
        --draft \
        --base main \
        --head "$branch_name")

    PR_NUMBER=$(echo "$PR_URL" | grep -o '[0-9]*$')
    gh pr edit "$PR_NUMBER" --add-label "test-translation"

    echo -e "${GREEN}✓${NC} Created PR #${PR_NUMBER}: ${PR_URL}"
    echo ""

    git checkout main
fi

#
# STEP 5: Summary
#
echo ""
echo -e "${BLUE}========================================${NC}"
if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}DRY RUN Complete - No changes made${NC}"
else
    echo -e "${BLUE}Setup Complete!${NC}"
fi
echo -e "${BLUE}========================================${NC}"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${CYAN}Summary of what would be done:${NC}"
    echo ""
    echo "1. Reset both repositories to base state"
    echo "2. Close all open PRs on source repo"
    echo "3. Create 9 new test PRs:"
    echo "   - 01: Intro text updated"
    echo "   - 02: Title changed"
    echo "   - 03: Section content updated"
    echo "   - 04: Sections reordered"
    echo "   - 05: New section added"
    echo "   - 06: Section removed"
    echo "   - 07: Subsection content updated"
    echo "   - 08: Multiple elements changed"
    echo "   - 09: Real-world lecture update"
    echo "4. Add 'test-translation' label to each PR"
    echo ""
    echo -e "${YELLOW}To actually run these changes, execute without --dry-run:${NC}"
    echo "  ./scripts/test-action-on-github.sh"
else
    echo -e "${GREEN}Created 9 test PRs in ${SOURCE_REPO}${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Each PR has the 'test-translation' label"
    echo "2. The GitHub Action should trigger automatically"
    echo "3. Check ${TARGET_REPO} for translation PRs"
    echo ""
    echo "View all PRs:"
    echo "  gh pr list --repo $OWNER/$SOURCE_REPO"
    echo ""
    echo "Monitor translation PRs:"
    echo "  gh pr list --repo $OWNER/$TARGET_REPO"
    echo ""
    echo -e "${YELLOW}Note: The first 8 tests use minimal base, test #9 uses lecture base${NC}"
    echo ""
    echo "To reset and run again, just execute this script again!"
fi
