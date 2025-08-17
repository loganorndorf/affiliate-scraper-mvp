# 2-Day MVP: Automated Athlete Onboarding Engine
## Version 0.1.0 - The 80/20 Automation Focus

## What We're Building

An automation engine that:
1. Takes an athlete's Instagram username
2. Extracts their bio links (Linktree, Beacons, etc.)
3. Expands and analyzes all affiliate links
4. Scrapes recent post captions for additional products/codes
5. Outputs structured JSON ready for database import
6. **Turns 3-hour manual onboarding into 30-second automation**

## What We're NOT Building

- ❌ User interface (they have one)
- ❌ Dashboard (they have one)
- ❌ Authentication system
- ❌ Database (just JSON output)
- ❌ Full post history (last 10-20 posts max)
- ❌ Image analysis (text only)
- ❌ Multiple platforms (Instagram first)
- ❌ Perfect scraping (80% accuracy is fine)

## The 80/20 Approach

### 80% of Value (Bio Links)
- **Linktree/Beacons extraction**: Near 100% success rate
- **Link expansion**: Follow redirects to final destination
- **Affiliate detection**: Identify platform (Amazon, Shopify, etc.)
- **Product metadata**: Extract names, prices where available

### 20% of Value (Posts)
- **Recent captions**: Last 10-20 posts only
- **Discount codes**: Extract codes from text
- **Brand mentions**: Identify @mentions and hashtags
- **Skip if blocked**: Don't fight Instagram's walls

## Success Criteria

- ✅ Extracts 80%+ of athlete's affiliate links
- ✅ Handles Linktree/Beacons/similar platforms
- ✅ Outputs clean JSON matching their schema
- ✅ Runs in under 30 seconds per athlete
- ✅ Works for 5 test athletes reliably
- ✅ Graceful degradation (partial data > no data)

## Tech Stack (Minimal)

- **Runtime**: Node.js + TypeScript
- **Scraping**: Puppeteer for bio links, light Instagram touch
- **No Database**: JSON file output
- **No UI**: CLI tool only
- **No Authentication**: Public data only

## Time Allocation

### Day 1: Core Extraction (8 hours)
- **4h**: Bio link extraction & expansion
  - Linktree scraper
  - Beacons scraper  
  - URL expansion & validation
- **2h**: Basic Instagram profile scraping
  - Username, bio, follower count
  - Bio link extraction
- **2h**: Post caption extraction (best effort)
  - Try for 10-20 recent posts
  - Graceful failure handling

### Day 2: Intelligence & Integration (8 hours)
- **3h**: Affiliate detection logic
  - Discount code patterns
  - Brand identification
  - Link classification
- **3h**: Data structuring
  - Clean JSON output
  - Deduplication
  - Confidence scoring
- **2h**: Testing with real athletes
  - Run 5 test accounts
  - Verify accuracy
  - Handle edge cases

## Test Athletes

1. **@cristiano** - Has Linktree with multiple brands
2. **@k.mbappe** - Mix of bio links and post mentions
3. **@therock** - Complex affiliate network
4. **@kingjames** - Multiple business ventures
5. **@patrickmahomes5** - Sports gear affiliates

## Output Format

```json
{
  "athlete": {
    "username": "cristiano",
    "platform": "instagram",
    "followerCount": 615000000,
    "bioLink": "https://linktr.ee/cristiano"
  },
  "affiliates": [
    {
      "name": "Nike Mercurial",
      "brand": "Nike",
      "url": "https://nike.com/...",
      "affiliateUrl": "https://nike.com/?ref=cr7",
      "source": "linktree",
      "discountCode": null,
      "confidence": 95
    },
    {
      "name": "CR7 Underwear",
      "brand": "CR7",
      "url": "https://cr7.com/...",
      "source": "bio",
      "discountCode": "RONALDO10",
      "confidence": 90
    }
  ],
  "summary": {
    "totalProducts": 15,
    "fromBioLinks": 12,
    "fromPosts": 3,
    "uniqueBrands": 6,
    "activeCodes": ["RONALDO10", "CR7POWER"]
  },
  "metadata": {
    "extractedAt": "2024-01-28T10:00:00Z",
    "version": "0.1.0",
    "warnings": []
  }
}
```

## Risk Mitigation

### Primary Risk: Instagram Blocking
- **Mitigation**: Focus on bio links first (always accessible)
- **Fallback**: Manual caption input option
- **Alternative**: Use Instagram Basic Display API

### Secondary Risk: No Linktree
- **Mitigation**: Check multiple link platforms
- **Fallback**: Extract any URLs from bio
- **Manual**: Allow manual link input

## Definition of Done

- [ ] Extracts Linktree/Beacons links successfully
- [ ] Expands shortened URLs to final destination
- [ ] Identifies affiliate parameters
- [ ] Extracts discount codes from captions
- [ ] Outputs clean JSON
- [ ] Handles failures gracefully
- [ ] Works for 5 test athletes
- [ ] Runs in <30 seconds

## The Casual Demo

**You**: "Hey, been playing with some automation stuff. Remember how you said onboarding athletes takes forever?"

**Friend**: "Yeah, like 3 hours per athlete."

**You**: "Watch this..." *[runs script]* "There's Ronaldo's entire affiliate portfolio in 20 seconds. JSON format, ready for your database."

**Friend**: "Wait, how did you get all those products?"

**You**: "Turns out 90% of athletes use Linktree. Super easy to extract. Want me to run a few more?"

**Result**: Natural conversation about integration, not a sales pitch.