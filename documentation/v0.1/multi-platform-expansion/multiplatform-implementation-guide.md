# Multi-Platform Implementation Guide
## Hours 3-8: Building Universal Discovery

## Current Status
✅ LinktreeExtractor
✅ BeaconsExtractor  
✅ LinkExpander
✅ Instagram scraper
✅ Main orchestrator

**Time Remaining**: ~6 hours
**Goal**: Transform into multi-platform discovery engine

---

## Hour 3: TikTok Extractor (Priority #1)

### Why TikTok First?
- Easier than Instagram (less anti-bot)
- Most creators have TikTok
- Bio links are easily accessible
- Video descriptions often have affiliate links

### Implementation Steps

```bash
# Install Playwright (better for TikTok than Puppeteer)
npm install playwright
npx playwright install chromium
```

Create `src/extractors/social/tiktok.ts`:

```typescript
// Quick test first
import { chromium } from 'playwright';

async function quickTest() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Mobile view works better
  await page.setViewportSize({ width: 375, height: 812 });
  
  await page.goto('https://www.tiktok.com/@therock');
  
  // Bio link is usually in a <a> tag
  const bioLink = await page.$eval('a[href*="://"]', el => el.href)
    .catch(() => null);
    
  console.log('Found bio link:', bioLink);
  
  await browser.close();
}

quickTest();
```

### Full Implementation
1. Create TikTokExtractor class
2. Extract bio link
3. Get follower count
4. Try to get video descriptions (bonus)
5. Handle common errors

### Test Accounts
- @therock (has Linktree alternative)
- @mrbeast (YouTube links)
- @charlidamelio (brand deals)

**Success Metric**: Extract bio link from 3/5 TikTok profiles

---

## Hour 4: YouTube API Integration

### Setup (10 minutes)
```bash
npm install googleapis
```

Get API key:
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API key)
5. Save to `.env` file

### Implementation (50 minutes)

Create `src/extractors/social/youtube.ts`:

```typescript
// Quick test
import { google } from 'googleapis';

const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY
});

async function testYouTube() {
  // Search for channel
  const response = await youtube.search.list({
    part: ['snippet'],
    q: 'MrBeast',
    type: ['channel'],
    maxResults: 1
  });
  
  console.log('Found channel:', response.data.items[0]);
}
```

### What to Extract
1. Channel description (often has all links)
2. Recent video descriptions (goldmine of affiliates)
3. Community posts (if available)
4. About page links

**Success Metric**: Extract 10+ links from MrBeast's channel

---

## Hour 5: Multi-Platform Orchestrator

### Create the Brain

Create `src/orchestrators/multiPlatform.ts`:

```typescript
export class UniversalDiscovery {
  async discover(creatorName: string) {
    console.log(`\n🚀 Universal Discovery for: ${creatorName}`);
    
    // Try everything in parallel
    const results = await Promise.allSettled([
      this.tryLinktree(creatorName),
      this.tryTikTok(creatorName),
      this.tryYouTube(creatorName),
      this.tryTwitter(creatorName),
      this.tryInstagram(creatorName)  // You already have this
    ]);
    
    // Combine results
    const allLinks = this.combineResults(results);
    
    // Deduplicate
    const uniqueLinks = this.deduplicate(allLinks);
    
    // Generate report
    return this.generateReport(creatorName, uniqueLinks);
  }
}
```

### Key Features
1. Parallel execution (fast!)
2. Graceful failure handling
3. Result combination
4. Deduplication
5. Unified output format

### Test Flow
```typescript
const discovery = new UniversalDiscovery();
const result = await discovery.discover('MrBeast');

console.log(`
Found ${result.totalLinks} links across ${result.platformsFound} platforms:
- Linktree: ${result.platforms.linktree ? '✓' : '✗'}
- TikTok: ${result.platforms.tiktok ? '✓' : '✗'}
- YouTube: ${result.platforms.youtube ? '✓' : '✗'}
`);
```

---

## Hour 6: Twitter/X Extractor (Optional but Valuable)

### The Challenge
Twitter/X is getting harder to scrape, but we have options:

#### Option 1: Nitter (Twitter Mirror)
```typescript
// Nitter doesn't require auth
await page.goto(`https://nitter.net/${username}`);
// Extract bio and pinned tweet
```

#### Option 2: Basic Twitter Scrape
```typescript
// Get what we can without login
await page.goto(`https://twitter.com/${username}`);
// Often can get bio before login wall
```

### What to Extract
1. Bio link (one allowed)
2. Pinned tweet links
3. Recent tweets with links (if accessible)

**Success Metric**: Extract bio link from 2/5 Twitter profiles

---

## Hour 7: Intelligence Layer

### Deduplication Engine

Create `src/intelligence/deduplicator.ts`:

```typescript
export class LinkDeduplicator {
  deduplicate(links: ExtractedLink[]): UniqueLinkSet {
    const seen = new Map();
    
    links.forEach(link => {
      // Normalize URL (remove tracking params)
      const normalized = this.normalize(link.url);
      
      if (!seen.has(normalized)) {
        seen.set(normalized, {
          url: normalized,
          sources: [link.source],
          firstSeen: link.source,
          occurrences: 1
        });
      } else {
        // Update existing
        const existing = seen.get(normalized);
        existing.sources.push(link.source);
        existing.occurrences++;
      }
    });
    
    return Array.from(seen.values());
  }
}
```

### Creator Intelligence

```typescript
export class CreatorAnalyzer {
  analyze(results: MultiPlatformResults): CreatorIntelligence {
    return {
      totalReach: this.calculateReach(results),
      primaryPlatform: this.findPrimary(results),
      linkAggregator: this.detectAggregator(results),
      favesRecommendation: this.recommend(results)
    };
  }
  
  private recommend(results): Recommendation {
    if (results.hasLinktree) {
      return {
        priority: 'HIGH',
        reason: 'Currently using competitor (Linktree)',
        action: 'Import and upgrade to Faves'
      };
    }
    
    if (results.totalLinks > 10 && !results.hasAggregator) {
      return {
        priority: 'HIGH',
        reason: 'Many links but no aggregator',
        action: 'Perfect Faves candidate'
      };
    }
    
    // More logic...
  }
}
```

---

## Hour 8: Testing & Polish

### Test Suite

Create `test-creators.json`:
```json
{
  "creators": [
    {
      "name": "MrBeast",
      "expected": {
        "hasLinktree": false,
        "hasTikTok": true,
        "hasYouTube": true,
        "minLinks": 20
      }
    },
    {
      "name": "EmmaChamberlain",
      "expected": {
        "hasLinktree": true,
        "hasInstagram": true,
        "minLinks": 15
      }
    }
  ]
}
```

### Run Comprehensive Tests

```typescript
// test-multi-platform.ts
async function testAll() {
  const creators = [
    'cristiano',      // Has Linktree
    'MrBeast',        // No Linktree, lots of YouTube
    'charlidamelio',  // TikTok focused
    'EmmaChamberlain', // Multi-platform
    'GordonRamsay'    // Business/brand focused
  ];
  
  for (const creator of creators) {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`Testing: ${creator}`);
    console.log('='.repeat(50));
    
    const result = await discovery.discover(creator);
    
    console.log(`✓ Platforms found: ${result.platformsFound.join(', ')}`);
    console.log(`✓ Total links: ${result.totalLinks}`);
    console.log(`✓ Unique links: ${result.uniqueLinks}`);
    console.log(`✓ Primary platform: ${result.primaryPlatform}`);
    console.log(`✓ Using competitor: ${result.usingCompetitor || 'No'}`);
    console.log(`✓ Faves priority: ${result.favesPriority}`);
  }
}
```

### Final Polish
1. Add progress indicators
2. Clean up console output
3. Format JSON nicely
4. Add timer/performance metrics
5. Handle all edge cases gracefully

---

## Deliverables Checklist

By end of Hour 8, you should have:

- [ ] TikTok extractor working
- [ ] YouTube API integrated
- [ ] Multi-platform orchestrator
- [ ] Deduplication working
- [ ] At least 3 platforms per creator
- [ ] Clean JSON output
- [ ] 5 creators fully tested
- [ ] Less than 60 seconds per creator

---

## The Enhanced Demo

### Demo Script
```bash
npm run discover MrBeast
```

### Expected Output
```
🚀 Universal Creator Discovery: MrBeast
================================================

✓ Checking Linktree... Not found
✓ Checking TikTok... Found bio link + 3 video links
✓ Checking YouTube... Found 47 links in descriptions
✓ Checking Twitter... Found bio link
✓ Checking Instagram... Found bio link

📊 DISCOVERY COMPLETE
────────────────────
Total Links Found: 52
Unique Links (deduped): 31
Platforms with Links: TikTok, YouTube, Twitter, Instagram
Primary Platform: YouTube (240M subscribers)
Total Reach: 350M+ followers

🔍 LINK AGGREGATOR ANALYSIS
────────────────────
Currently Using: None
Competitor Risk: None
Faves Opportunity: HIGH
Reason: 31 links scattered across platforms

💡 RECOMMENDATION FOR FAVES
────────────────────
Priority: HIGH
Action: "Perfect candidate - no current aggregator"
Estimated Value: $2M+ monthly affiliate revenue
Import Strategy: Auto-import all 31 discovered links

💾 Saved to: output/mrbeast_universal_20240128.json
⏱️ Processing Time: 18.3 seconds
```

### The Pitch Enhancement

**You**: "So remember the Linktree scraper? I expanded it..."
**Friend**: "Oh yeah? What does it do now?"
**You**: "Give me any creator name. Any platform."
**Friend**: "Try MrBeast"
**You**: *runs script* "No Linktree, but found 47 affiliate links across YouTube, TikTok, and Twitter. He's leaving money on the table without an aggregator."
**Friend**: "Wait, you can find links from ANY platform?"
**You**: "Yep. And look—it tells you who's using your competitors and who needs Faves."

---

## Quick Commands for Testing

```bash
# Test individual platforms
npm run test:tiktok therock
npm run test:youtube mrbeast
npm run test:twitter elonmusk

# Test full discovery
npm run discover cristiano
npm run discover mrbeast

# Batch test
npm run batch:test test-creators.json

# Generate report
npm run report:creator mrbeast > reports/mrbeast.md
```

---

## If You're Running Out of Time

### Minimum Viable Multi-Platform (1 hour)
Just add TikTok + orchestrator. That's enough to show the concept.

### Focus on the Story
"Started with Linktree, realized creators have links everywhere, built universal discovery."

### The Key Insight
"Faves can onboard ANY creator, not just those already using link aggregators."

Remember: Working code for 3 platforms is better than broken code for 6 platforms!