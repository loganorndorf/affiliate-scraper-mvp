# MVP Testing Checklist
## Extraction Engine Validation

## Core Functionality Tests

### Linktree Extraction (80% of value)
- [ ] Successfully scrapes https://linktr.ee/cristiano
- [ ] Extracts all visible links (should be 15-25)
- [ ] Gets link titles correctly
- [ ] Gets link URLs correctly
- [ ] Handles pro/free Linktree layouts
- [ ] Works for 5 different Linktree profiles
- [ ] Completes in <10 seconds per profile

### URL Expansion
- [ ] Expands bit.ly links correctly
- [ ] Expands amzn.to links to full Amazon URLs
- [ ] Follows multiple redirects (test with 3+ hops)
- [ ] Handles direct links (no expansion needed)
- [ ] Doesn't hang on broken links
- [ ] Processes 20 links in <5 seconds

### Affiliate Detection
- [ ] Identifies Amazon affiliate tags (tag=)
- [ ] Identifies Shopify referral parameters
- [ ] Detects ShareASale tracking
- [ ] Finds generic ref= parameters
- [ ] Correctly classifies 80%+ of links
- [ ] Extracts affiliate IDs when present

### Brand Detection
- [ ] Identifies Nike from nike.com
- [ ] Identifies brands from link titles
- [ ] Handles multi-brand retailers (Foot Locker, etc)
- [ ] Case-insensitive matching
- [ ] Detects at least 20 major sports brands

## Integration Tests

### Full Pipeline
- [ ] Input: Instagram username → Output: JSON file
- [ ] Handles athlete with Linktree
- [ ] Handles athlete with Beacons
- [ ] Handles athlete with direct link
- [ ] Generates summary statistics
- [ ] Saves to output directory

### Error Handling
- [ ] Continues if Instagram fails
- [ ] Continues if no bio link found
- [ ] Continues if Linktree is empty
- [ ] Returns partial data rather than failing
- [ ] Never crashes completely
- [ ] Provides helpful error messages

## Performance Requirements

### Speed Targets
- [ ] Linktree extraction: <10 seconds
- [ ] URL expansion (20 links): <5 seconds  
- [ ] Full athlete processing: <30 seconds
- [ ] Batch of 5 athletes: <2 minutes

### Success Rates
- [ ] Linktree extraction: 95%+ success
- [ ] URL expansion: 90%+ success
- [ ] Brand detection: 80%+ accuracy
- [ ] Overall pipeline: 75%+ complete data

## Output Validation

### JSON Structure
- [ ] Valid JSON (no syntax errors)
- [ ] Contains all required fields
- [ ] Handles special characters in titles
- [ ] Escapes URLs properly
- [ ] Includes metadata (timestamp, warnings)

### Data Quality
- [ ] No duplicate links
- [ ] Brands are normalized (Nike, not NIKE/nike)
- [ ] URLs are expanded (no shortened links)
- [ ] Affiliate IDs are extracted
- [ ] Summary counts are accurate

## Test Athletes

### Must Work For These
- [ ] **@cristiano** (Linktree with 20+ links)
- [ ] **@therock** (Complex business portfolio)
- [ ] **@kingjames** (Multiple brands)
- [ ] **@patrickmahomes5** (NFL athlete with gear sponsors)
- [ ] **@serena** (If still active, or similar athlete)

### Each Athlete Should Have
- [ ] Profile data extracted (if Instagram works)
- [ ] Bio link found
- [ ] 10+ affiliate links discovered
- [ ] 3+ brands identified
- [ ] Clean JSON output
- [ ] <30 second processing time

## Edge Cases

### Handle Gracefully
- [ ] Athlete with no Linktree
- [ ] Empty Linktree page
- [ ] Private Instagram account  
- [ ] Linktree with non-affiliate links
- [ ] Mixed affiliate/non-affiliate links
- [ ] Non-English link titles
- [ ] Special characters in titles
- [ ] Very long link titles

### Should Not Break On
- [ ] Network timeout
- [ ] Rate limiting
- [ ] Malformed URLs
- [ ] Circular redirects
- [ ] Dead links
- [ ] JavaScript-heavy pages

## Pre-Show Checklist

### Technical Validation
- [ ] Run `npm run extract cristiano` successfully
- [ ] Run `npm run extract therock` successfully  
- [ ] Check JSON outputs are clean
- [ ] Verify affiliate links are found
- [ ] Confirm brands are detected
- [ ] No console errors

### Results Quality
- [ ] Found 15+ links for test athletes
- [ ] Identified major brands correctly
- [ ] Expanded URLs properly
- [ ] Processing time under 30 seconds
- [ ] JSON ready for database import

### Backup Plan
- [ ] Have 3 pre-extracted JSON files ready
- [ ] Know which athletes work best
- [ ] Can explain Instagram limitations
- [ ] Can manually input Linktree URL if needed

## The Casual Demo

### What to Show
1. **Terminal**: `npm run extract cristiano`
2. **Wait**: ~20 seconds
3. **Open JSON**: Show the structured data
4. **Highlight**: 
   - "Found 23 affiliate links automatically"
   - "Identified 8 different brands"
   - "Ready for your database"
5. **Key Point**: "This usually takes 3 hours manually"

### What NOT to Worry About
- Perfect Instagram scraping (expected to fail)
- 100% accuracy (80% is impressive enough)
- Beautiful output (JSON is fine)
- Error messages (they show resilience)

### Success Metric
If it extracts 15+ affiliate links from a Linktree in under 30 seconds, you've won.

## Quick Validation Commands

```bash
# Test individual components
npx ts-node src/extractors/linktree.ts test
npx ts-node src/processors/linkExpander.ts test

# Test full extraction
npm run extract cristiano
npm run extract therock

# Check outputs
ls -la output/
cat output/cristiano*.json | jq '.summary'

# Count affiliate links found
cat output/cristiano*.json | jq '.affiliates | length'
```

## Final Confidence Check

**Can you answer YES to these?**
- [ ] Extracts Linktree links successfully?
- [ ] Expands URLs properly?
- [ ] Outputs valid JSON?
- [ ] Runs in under 30 seconds?
- [ ] Works for at least 3 athletes?

**If you have 4+ YES answers, you're ready to show your friend!**