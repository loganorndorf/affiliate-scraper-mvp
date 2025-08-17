# Multi-Platform Code Generation Prompts
## AI Prompts for Universal Discovery Components

## Prompt 1: TikTok Extractor with Playwright

```
Create a TikTok profile and link extractor using Playwright (not Puppeteer). Requirements:

1. Extract from TikTok profiles WITHOUT authentication
2. Use Playwright with these specific settings:
   - Chromium browser
   - Mobile viewport (375x812)
   - iPhone user agent
   - Headless mode

3. Extract:
   - Bio text
   - Bio link (TikTok allows one)
   - Follower count (handle K/M/B notation)
   - First 3 video descriptions (they often contain affiliate links)

4. URL structure: https://www.tiktok.com/@{username}

5. Selectors to try (TikTok changes these):
   - Bio: [data-e2e="user-bio"], .share-desc, div[class*="InfoContainer"]
   - Link: a[href*="link"], a[target="_blank"] within bio
   - Followers: [data-e2e="followers-count"], span[class*="follower"]
   - Videos: [data-e2e="user-post-item"]

6. Handle common issues:
   - Page might redirect to login (return partial data)
   - Videos might not load (bio is priority)
   - Rate limiting (add random delays)

7. For video descriptions:
   - Click first video
   - Extract description text
   - Look for URLs in description
   - Use arrow key to go to next video
   - Maximum 3 videos (don't trigger rate limit)

Return structure matching your existing ExtractedLink interface.

Example:
const extractor = new TikTokExtractor();
const result = await extractor.extract('therock');
// Should return bio link + any video links found

Make it resilient - TikTok updates their HTML frequently.
```

## Prompt 2: YouTube Data API Extractor

```
Create a YouTube channel link extractor using the official YouTube Data API v3. Requirements:

1. Use googleapis npm package
2. Accept API key as constructor parameter
3. Handle both @handles and channel names

4. Extract links from:
   - Channel description (main source)
   - Recent video descriptions (last 5 videos)
   - Channel banner links (if available)
   - Community posts (if accessible)

5. API calls to make:
   - search.list to find channel ID from handle
   - channels.list for channel details
   - search.list for recent videos
   - videos.list for video descriptions

6. Parse links from text:
   - Find all URLs (https?://...)
   - Clean up YouTube's text formatting
   - Remove YouTube internal links
   - Focus on external affiliate links

7. Handle API quotas:
   - Batch requests when possible
   - Cache channel IDs
   - Minimal fields in 'part' parameter

8. Process descriptions:
   - YouTube creators put affiliate links in descriptions
   - Usually in first few lines
   - Often formatted as "LINKS:" or "Products mentioned:"
   - Extract product names if mentioned

Return:
{
  platform: 'youtube',
  links: ExtractedLink[],
  metrics: {
    subscribers: number,
    totalViews: number
  }
}

Example usage:
const youtube = new YouTubeExtractor(API_KEY);
const result = await youtube.extract('MrBeast');
// Should find dozens of affiliate links from video descriptions
```

## Prompt 3: Twitter/X Bio Extractor (Using Nitter)

```
Create a Twitter/X link extractor that uses Nitter (Twitter mirror) to avoid authentication. Requirements:

1. Use Playwright to scrape Nitter.net (not twitter.com)
2. Nitter URL format: https://nitter.net/{username}

3. Extract:
   - Bio text and links
   - Pinned tweet (if exists)
   - Website field
   - Follower count

4. Nitter selectors:
   - Bio: .profile-bio
   - Bio links: .profile-bio a
   - Website: .profile-website
   - Pinned tweet: .timeline-item:first-child (check for pin icon)
   - Followers: .profile-stat-num

5. Handle multiple Nitter instances:
   - Primary: nitter.net
   - Fallbacks: nitter.it, nitter.42l.fr
   - If one is down, try another

6. Extract links from:
   - Bio text
   - Website field
   - Pinned tweet
   - Recent tweets (if accessible)

7. Clean extracted URLs:
   - Remove Nitter's URL wrapping
   - Get original URLs
   - Expand t.co links if needed

8. Handle failures gracefully:
   - Nitter might be down
   - Account might not exist
   - Return partial data

Return same structure as other extractors for consistency.

Note: Nitter is legal and doesn't violate ToS since it's a mirror service.
```

## Prompt 4: Multi-Platform Orchestrator

```
Create a UniversalCreatorDiscovery class that coordinates all platform extractors. Requirements:

1. Manage multiple extractors:
   - LinktreeExtractor (existing)
   - BeaconsExtractor (existing)
   - TikTokExtractor
   - YouTubeExtractor  
   - TwitterExtractor
   - InstagramExtractor (existing)

2. Parallel execution strategy:
   - Run all extractors simultaneously using Promise.allSettled
   - Don't fail if one platform fails
   - Timeout each platform after 15 seconds
   - Return partial results

3. Identity resolution:
   - Start with a creator name/handle
   - Try variations (@handle, handle, "Real Name")
   - Common patterns: same handle across platforms
   - Allow manual override of handles per platform

4. Main method signature:
   async discoverCreator(query: string, options?: {
     platforms?: Platform[];
     timeout?: number;
     handles?: { [platform: string]: string };
   }): Promise<UniversalCreatorProfile>

5. Process flow:
   - Resolve identities
   - Check link aggregators first (Linktree, Beacons)
   - Check social platforms in parallel
   - Expand all URLs
   - Deduplicate links
   - Generate intelligence

6. Intelligence generation:
   - Identify primary platform (most followers)
   - Detect if using competitor (Linktree/Beacons)
   - Calculate total reach
   - Recommend Faves priority (high/medium/low)
   - Estimate potential value

7. Result structure:
   {
     searchQuery: string,
     platforms: { [platform]: PlatformData },
     allLinks: ProcessedLink[],
     summary: {
       totalLinks: number,
       uniqueLinks: number,
       platformsFound: string[],
       totalReach: number,
       primaryPlatform: string,
       usingCompetitor: string | null
     },
     recommendation: {
       favesPriority: 'high' | 'medium' | 'low',
       reason: string,
       estimatedValue: number
     }
   }

Make it fast - entire discovery should complete in <30 seconds.
```

## Prompt 5: Link Deduplicator

```
Create a LinkDeduplicator class that intelligently deduplicates links found across platforms. Requirements:

1. Normalize URLs for comparison:
   - Remove tracking parameters (utm_*, ref, fbclid, etc.)
   - Normalize protocol (http/https)
   - Remove trailing slashes
   - Lowercase domains
   - Sort query parameters

2. Handle URL variations:
   - Short links that expand to same destination
   - Different tracking params for same product
   - Mobile vs desktop URLs
   - With/without www

3. Deduplication logic:
   - Group URLs that resolve to same destination
   - Track which platforms each link appeared on
   - Count occurrences
   - Keep highest confidence version

4. Method signatures:
   deduplicate(links: ExtractedLink[]): DedupedLink[]
   normalizeUrl(url: string): string
   areUrlsEquivalent(url1: string, url2: string): boolean

5. Track link sources:
   - If link appears on multiple platforms, track all sources
   - Higher occurrence = higher confidence
   - Prioritize certain sources (YouTube descriptions > TikTok bio)

6. Smart matching:
   - Amazon products with different tracking tags = same link
   - Shopify stores with different entry points = group together
   - Brand sites with different campaigns = dedupe

7. Return enriched data:
   {
     url: string (normalized),
     originalUrls: string[] (all variations),
     sources: Platform[] (where found),
     occurrences: number,
     confidence: number,
     firstSeen: Date,
     brand?: string
   }

Example:
const deduper = new LinkDeduplicator();
const uniqueLinks = deduper.deduplicate(allPlatformLinks);
// 50 links -> 20 unique destinations
```

## Prompt 6: Creator Intelligence Analyzer

```
Create a CreatorIntelligenceAnalyzer that generates insights from multi-platform data. Requirements:

1. Analyze creator's platform presence:
   - Calculate total reach (sum of followers)
   - Identify primary platform (most followers/engagement)
   - Detect platform focus (single vs multi-platform)
   - Growth trajectory (if historical data available)

2. Link aggregator detection:
   - Check if using Linktree, Beacons, or other
   - Identify which competitor
   - Flag if no aggregator but needs one (>10 scattered links)

3. Recommendation engine for Faves:
   generateFavesRecommendation(profile): {
     priority: 'high' | 'medium' | 'low',
     reason: string,
     strategy: 'compete' | 'convert' | 'capture',
     estimatedValue: number,
     talkingPoints: string[]
   }

4. Priority logic:
   HIGH if:
   - Using competitor (Linktree/Beacons)
   - 10+ links but no aggregator
   - 1M+ total followers
   - Growing rapidly

   MEDIUM if:
   - Some links scattered
   - 100K-1M followers
   - Stable growth

   LOW if:
   - Few links
   - Already using Faves
   - <100K followers

5. Value estimation:
   - Estimate based on follower count
   - Factor in engagement rates
   - Consider number of affiliate links
   - Industry benchmarks (fashion vs gaming vs fitness)

6. Competitive intelligence:
   - If using Linktree: "Import all their links to Faves"
   - If using Beacons: "Upgrade to Faves' better analytics"
   - If no aggregator: "Perfect timing to start with Faves"

7. Generate actionable insights:
   - "Missing potential $X monthly revenue"
   - "Links scattered across Y platforms"
   - "Z% of followers can't find their links"

Return comprehensive intelligence report that helps Faves prioritize outreach.
```

## Prompt 7: Website Discovery Scanner

```
Create a WebsiteDiscovery class that finds affiliate links from creator websites. Requirements:

1. Common URL patterns to check:
   - {domain}.com/links
   - {domain}.com/shop
   - {domain}.com/recommendations
   - {domain}.com/favorites
   - {domain}.com/affiliate
   - {domain}.com/partners

2. Discovery strategy:
   - Start with common variations of creator name
   - Check .com, .co, .tv, .me domains
   - Look for "link in bio" style pages

3. Extract from:
   - Links pages
   - Shop/store sections
   - Blog posts with products
   - Affiliate disclosure pages

4. Use Playwright to:
   - Navigate to potential URLs
   - Look for product links
   - Identify affiliate patterns
   - Extract structured data if available

5. Identify website platforms:
   - WordPress (look for wp-content)
   - Shopify (myshopify.com)
   - Squarespace (specific templates)
   - Custom sites

6. Smart detection:
   - Look for "affiliate disclosure" (legally required)
   - Find Amazon Associate links
   - Detect ShareASale, CJ, Impact Radius
   - Identify discount codes on page

7. Return website-specific data:
   {
     domain: string,
     platform: 'wordpress' | 'shopify' | 'custom',
     hasAffiliateDisclosure: boolean,
     links: ExtractedLink[],
     shopProducts: Product[],
     estimatedRevenue?: number
   }

Handle gracefully - many creators don't have websites.
```

## Prompt 8: Batch Testing Utility

```
Create a BatchTestRunner for validating multi-platform discovery. Requirements:

1. Test configuration file format:
{
  "creators": [
    {
      "name": "MrBeast",
      "handles": {
        "youtube": "MrBeast",
        "tiktok": "mrbeast",
        "twitter": "MrBeastYT"
      },
      "expected": {
        "minLinks": 20,
        "platforms": ["youtube", "tiktok", "twitter"],
        "hasLinktree": false,
        "primaryPlatform": "youtube"
      }
    }
  ]
}

2. Test execution:
   - Run discovery for each creator
   - Compare against expected results
   - Generate accuracy report
   - Identify missing platforms
   - Flag unexpected findings

3. Metrics to track:
   - Success rate per platform
   - Average links found
   - Processing time per creator
   - Deduplication effectiveness
   - Error frequency

4. Generate report:
=== Multi-Platform Discovery Test Report ===
Tested: 10 creators
Success Rate: 85%

Platform Performance:
- Linktree: 95% success
- TikTok: 80% success
- YouTube: 90% success
- Twitter: 60% success

Average Metrics:
- Links per creator: 24
- Unique after dedup: 18
- Processing time: 22s
- Platforms found: 3.5

Failed Assertions:
- MrBeast: Expected YouTube, found null
- EmmaChamberlain: Expected 15+ links, found 8

5. Output formats:
   - Console (colored, formatted)
   - JSON (for CI/CD)
   - Markdown (for documentation)

6. Performance benchmarks:
   - Flag if any creator takes >60s
   - Alert if success rate <70%
   - Warn if dedup removes >50% of links

Use this to ensure reliability before showing to anyone.
```

## Usage Instructions

### For Best Results with These Prompts:

1. **Start with TikTok** - It's easier than Instagram and has valuable data
2. **Test immediately** - Don't wait for perfect code
3. **Use real creators** - Test with actual profiles, not made-up names
4. **Handle failures gracefully** - Not every platform will work every time

### Implementation Order:
1. TikTok Extractor (quick win)
2. YouTube API (most reliable)
3. Multi-Platform Orchestrator (brings it together)
4. Deduplicator (essential for multi-platform)
5. Intelligence Analyzer (the "wow" factor)

### Testing Commands:
```bash
# Test individual platforms
npm run test:tiktok therock
npm run test:youtube mrbeast

# Test full discovery
npm run discover cristiano

# Run batch tests
npm run test:batch creators.json
```

### Remember:
- **Partial data is valuable** - 3 platforms is better than 0
- **Speed matters** - Keep it under 30 seconds
- **Deduplication is critical** - Same link appears many places
- **Intelligence wins deals** - "You're using Linktree, switch to Faves"