# Multi-Platform Testing Checklist
## Validation for Universal Discovery Engine

## Platform-Specific Tests

### TikTok Extraction
- [ ] Successfully loads TikTok profile page
- [ ] Extracts bio text
- [ ] Finds bio link (if exists)
- [ ] Parses follower count correctly
  - [ ] Handles "10.5M" → 10,500,000
  - [ ] Handles "500K" → 500,000
- [ ] Attempts video description extraction
- [ ] Completes in <10 seconds
- [ ] Handles accounts with no bio link gracefully
- [ ] Works for 3/5 test accounts

**Test Accounts**:
- [ ] @therock (has bio link)
- [ ] @mrbeast (should have link)
- [ ] @charlidamelio (brand deals)
- [ ] @khaby.lame (might not have links)
- [ ] @gordonramsay (business links)

### YouTube API
- [ ] API key configured correctly
- [ ] Finds channel from handle
- [ ] Extracts channel description
- [ ] Gets recent video descriptions
- [ ] Finds affiliate links in descriptions
- [ ] Handles API quota limits
- [ ] Completes in <5 seconds
- [ ] Works for channels without affiliate links

**Test Channels**:
- [ ] MrBeast (lots of affiliates)
- [ ] MKBHD (tech affiliates)
- [ ] Emma Chamberlain (brand deals)
- [ ] Gordon Ramsay (product links)
- [ ] Cristiano (might have some)

### Twitter/X Extraction
- [ ] Nitter loads successfully (or fallback)
- [ ] Extracts bio text
- [ ] Finds bio link
- [ ] Gets pinned tweet (if exists)
- [ ] Handles accounts without links
- [ ] Completes in <10 seconds
- [ ] Graceful failure if Nitter is down

**Test Accounts**:
- [ ] @MrBeast (bio link)
- [ ] @therock (bio link)
- [ ] @GordonRamsay (business)
- [ ] @Cristiano (might have)
- [ ] @EmmaChamberlain (likely has)

## Multi-Platform Integration

### Identity Resolution
- [ ] Handles variations of names
  - [ ] "MrBeast" → finds all platforms
  - [ ] "@mrbeast" → strips @ correctly
  - [ ] "mr beast" → handles spaces
- [ ] Tries common platform patterns
- [ ] Allows manual handle override

### Parallel Execution
- [ ] All platforms checked simultaneously
- [ ] No platform blocks others
- [ ] Timeout after 15 seconds per platform
- [ ] Returns partial results if some fail
- [ ] Total time <30 seconds for all platforms

### Link Processing
- [ ] All links expanded correctly
- [ ] Affiliate parameters detected
- [ ] Brands identified
- [ ] Link types classified
- [ ] Duplicates marked for deduplication

## Deduplication Tests

### URL Normalization
- [ ] Removes tracking parameters
  - [ ] utm_source, utm_medium removed
  - [ ] ref= parameters removed
  - [ ] fbclid removed
- [ ] Handles protocol differences (http/https)
- [ ] Removes trailing slashes
- [ ] Case normalization works

### Deduplication Logic
- [ ] Same Amazon product, different tags → 1 link
- [ ] Same destination, different shorteners → 1 link
- [ ] Counts occurrences across platforms
- [ ] Tracks all source platforms
- [ ] Preserves highest confidence version

### Test Cases
- [ ] 50 links → ~20-30 unique (typical)
- [ ] Amazon links dedupe correctly
- [ ] Shopify stores dedupe correctly
- [ ] Direct brand links dedupe correctly

## Intelligence Generation

### Platform Analysis
- [ ] Calculates total reach correctly
- [ ] Identifies primary platform
- [ ] Detects link aggregator usage
- [ ] Flags competitor usage (Linktree/Beacons)

### Faves Recommendations
- [ ] HIGH priority for Linktree users
- [ ] HIGH priority for 10+ scattered links
- [ ] MEDIUM priority for some links
- [ ] LOW priority for few links
- [ ] Reasoning makes sense

### Value Estimation
- [ ] Estimates based on follower count
- [ ] Factors in number of links
- [ ] Provides realistic numbers
- [ ] Includes explanation

## End-to-End Tests

### Test Creator 1: Cristiano (Has Linktree)
- [ ] Finds Linktree ✓
- [ ] Extracts all Linktree links
- [ ] Finds Instagram bio link
- [ ] Maybe finds TikTok
- [ ] Deduplicates correctly
- [ ] Flags as "using competitor"
- [ ] HIGH priority for Faves

### Test Creator 2: MrBeast (No Linktree)
- [ ] No Linktree found ✓
- [ ] Finds YouTube links (many)
- [ ] Finds TikTok bio link
- [ ] Finds Twitter bio link
- [ ] Deduplicates to ~30 unique
- [ ] Flags as "needs aggregator"
- [ ] HIGH priority for Faves

### Test Creator 3: Small Creator
- [ ] Handles limited presence
- [ ] Finds what links exist
- [ ] Doesn't crash on missing data
- [ ] Appropriate priority (LOW/MEDIUM)

## Performance Metrics

### Speed Requirements
- [ ] Single platform: <10 seconds
- [ ] All platforms: <30 seconds
- [ ] Deduplication: <2 seconds
- [ ] Full pipeline: <45 seconds

### Success Rates
- [ ] Linktree: 95%+ (it's public)
- [ ] TikTok: 70%+ (some work)
- [ ] YouTube: 90%+ (API reliable)
- [ ] Twitter: 50%+ (often blocked)
- [ ] Overall: Some data for 90%+ of creators

### Data Quality
- [ ] Links are real and accessible
- [ ] Expansions work correctly
- [ ] Brands identified accurately
- [ ] No false positives

## Output Validation

### JSON Structure
- [ ] Valid JSON syntax
- [ ] All required fields present
- [ ] No null/undefined in critical fields
- [ ] Arrays properly formatted
- [ ] Timestamps correct

### Summary Accuracy
- [ ] Total links count correct
- [ ] Unique links count correct
- [ ] Platform list accurate
- [ ] Reach calculation correct
- [ ] Recommendations logical

## The "Wow" Test

### Can you demonstrate:
- [ ] "Give me any creator name" → Full analysis
- [ ] Creator with no Linktree → Still finds links
- [ ] Creator with Linktree → Shows competitor usage
- [ ] Total discovery in <30 seconds
- [ ] Clean, actionable intelligence

### Key Talking Points Ready:
- [ ] "Finds links from ANY platform"
- [ ] "No Linktree? No problem"
- [ ] "See who's using competitors"
- [ ] "Import everything to Faves instantly"
- [ ] "X million total reach across platforms"

## Pre-Demo Validation

### Technical Check
- [ ] All API keys configured
- [ ] No console errors
- [ ] JSON saves correctly
- [ ] Network stable
- [ ] Fallbacks tested

### Demo Creators Tested
- [ ] Cristiano (Linktree user)
- [ ] MrBeast (No Linktree, many links)
- [ ] Emma Chamberlain (Multi-platform)
- [ ] Gordon Ramsay (Business focused)
- [ ] One surprise creator ready

### Success Metrics
- [ ] Finds links from 3+ platforms minimum
- [ ] Deduplication reduces by ~40%
- [ ] Generates smart recommendations
- [ ] Completes in reasonable time
- [ ] Output ready for Faves import

## Quick Validation Commands

```bash
# Test individual platforms
npm run test:platform tiktok therock
npm run test:platform youtube mrbeast

# Test full discovery
npm run discover cristiano --verbose
npm run discover mrbeast --verbose

# Test batch
npm run test:batch test-creators.json

# Verify output
cat output/mrbeast*.json | jq '.summary'
cat output/cristiano*.json | jq '.recommendation'

# Check performance
time npm run discover mrbeast
```

## Final Confidence Check

**Core Functionality** (Must Work):
- [ ] Linktree extraction still works ✓
- [ ] At least 2 additional platforms work
- [ ] Deduplication functions correctly
- [ ] Outputs valid JSON

**Enhanced Value** (Should Work):
- [ ] TikTok extraction succeeds
- [ ] YouTube finds many links
- [ ] Intelligence is insightful
- [ ] Faves recommendations make sense

**Wow Factor** (Nice to Have):
- [ ] 5+ platforms checked
- [ ] Website discovery works
- [ ] <20 second full analysis
- [ ] Beautiful formatted output

## The Bottom Line

If you can type `npm run discover mrbeast` and get a comprehensive analysis showing links from YouTube, TikTok, and Twitter with smart Faves recommendations in under 30 seconds, you've succeeded.

The multi-platform approach transforms this from "Linktree scraper" to "Universal Creator Intelligence Platform" - a much more valuable tool for Faves.