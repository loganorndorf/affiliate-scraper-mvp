# AI Code Generation Prompts
## Focused on 80/20 Extraction Engine

## Prompt 1: Linktree Scraper (Priority #1)

```
Create a TypeScript class that extracts all affiliate links from Linktree pages using Puppeteer. Requirements:

1. The class should scrape Linktree without authentication (it's public)
2. Extract all link buttons with their titles and URLs
3. Handle different Linktree layouts (some have sections, some don't)
4. Return structured data for each link

Implementation needs:
- Use Puppeteer in headless mode
- Wait for dynamic content to load
- Extract using data-testid="LinkButton" selector (Linktree's standard)
- Also try backup selectors in case they change
- Handle both free and pro Linktree layouts

Return this structure:
interface ExtractedLink {
  title: string;
  originalUrl: string;
  source: 'linktree';
  position: number; // Order on page
}

Include error handling for:
- Page not found
- No links on page
- Timeout issues
- Rate limiting

Make it resilient - if Linktree changes their HTML slightly, it should still work.

Example usage:
const extractor = new LinktreeExtractor();
const links = await extractor.extractLinks('https://linktr.ee/cristiano');
// Should return array of all links from Ronaldo's Linktree
```

## Prompt 2: Beacons.ai Scraper

```
Create a TypeScript class that extracts links from Beacons.ai pages (similar to Linktree but different structure). Requirements:

1. Scrape Beacons.ai profile pages without authentication
2. Handle their specific layout (cards/blocks instead of simple links)
3. Extract links from various block types:
   - Link blocks
   - Store blocks  
   - Social media blocks
   - Video blocks with links

Key differences from Linktree:
- More complex layout with nested elements
- Links might be in different formats
- Some links are embedded in iframes

Use Puppeteer to:
- Navigate to beacons.ai/[username]
- Wait for React app to load
- Extract all clickable links
- Get link titles and URLs

Return the same ExtractedLink interface as Linktree for consistency.

Include fallback selectors since Beacons updates frequently.
```

## Prompt 3: Instagram Bio Link Extractor

```
Create a minimal Instagram scraper that ONLY extracts the bio link from a profile. Requirements:

1. DO NOT try to scrape posts (Instagram blocks this quickly)
2. DO NOT require login
3. Focus only on getting:
   - Username
   - Bio text
   - Bio link (if exists)
   - Follower count (from meta tags or page title)

Strategy to avoid blocks:
- Use mobile user agent
- Only visit the profile page once
- Extract data from meta tags when possible
- Don't scroll or interact with the page
- Add random delay before requests

Extract from these sources (in order of preference):
1. Meta tags (og:description, og:url)
2. JSON-LD structured data
3. HTML elements (as last resort)

If Instagram shows a login wall, return partial data with a warning.

Example:
const profile = await extractor.getProfile('cristiano');
// Returns: { username: 'cristiano', bioLink: 'https://linktr.ee/cristiano', followerCount: 600000000 }

This should work for 3-5 profiles before Instagram blocks. That's fine for our use case.
```

## Prompt 4: URL Expander & Affiliate Detector

```
Create a TypeScript class that expands shortened URLs and detects affiliate parameters. Requirements:

1. Expand shortened URLs by following redirects:
   - Handle bit.ly, amzn.to, tinyurl, etc.
   - Follow up to 5 redirects
   - Use axios with proper headers to avoid blocks
   - Return the final destination URL

2. Detect affiliate/tracking parameters:
   - Amazon: tag=, ref=
   - ShareASale: afftrack=, saref=
   - CJ Affiliate: cjdata=, cjevent=
   - Generic: utm_source=, ref=, affiliate=, partner=
   - Shopify: ref=, source=

3. Classify the link type:
   - Amazon product
   - Shopify store
   - Affiliate network
   - Direct brand site
   - Social media
   - Unknown

4. Extract metadata where possible:
   - Amazon ASIN from URL
   - Shopify product ID
   - Brand name from domain

Implementation:
class LinkExpander {
  async expandUrl(shortUrl: string): Promise<string>;
  detectAffiliateParams(url: string): { isAffiliate: boolean, platform?: string, affiliateId?: string };
  classifyLinkType(url: string): LinkType;
  extractProductId(url: string, type: LinkType): string | undefined;
}

Make it fast - process 50+ links in under 10 seconds using Promise.all for parallel processing.
```

## Prompt 5: Main Orchestrator

```
Create the main orchestrator class that coordinates all extractors to automate athlete onboarding. Requirements:

1. Process flow:
   - Get Instagram profile (try, but don't fail if blocked)
   - Extract bio link
   - Identify link platform (Linktree, Beacons, etc)
   - Scrape all links from that platform
   - Expand and classify each link
   - Generate summary report

2. Graceful degradation:
   - If Instagram fails, ask for Linktree URL directly
   - If Linktree fails, try Beacons
   - Always return SOME data, even if partial

3. Parallel processing where possible:
   - Expand multiple URLs simultaneously
   - But scrape sequentially to avoid rate limits

4. Output format:
{
  athlete: {
    username: string,
    platform: 'instagram',
    followerCount: number,
    bioLink: string
  },
  affiliates: Array<{
    title: string,
    originalUrl: string,
    expandedUrl: string,
    type: 'amazon' | 'shopify' | 'brand' | 'unknown',
    isAffiliate: boolean,
    affiliateId?: string,
    brand?: string
  }>,
  summary: {
    totalLinks: number,
    affiliateLinks: number,
    platforms: string[],
    brands: string[]
  },
  metadata: {
    processingTime: number,
    warnings: string[]
  }
}

5. Save results to JSON file in ./output directory

Make it bulletproof - should never crash, always return useful data.
```

## Prompt 6: Brand & Pattern Detection

```
Create a comprehensive brand detection system for sports/fitness affiliates. Requirements:

1. Brand dictionary with variations:
const BRANDS = {
  'Nike': ['nike', 'jordan', 'converse'],
  'Adidas': ['adidas', 'yeezy', 'reebok'],
  'Under Armour': ['underarmour', 'under armour', 'ua'],
  // ... 50+ major sports brands
};

2. Detect brands from:
   - Domain names (nike.com)
   - Link titles ("Nike Air Max")
   - URL paths (/nike-shoes/)
   - Redirect destinations

3. Handle edge cases:
   - Retailer sites selling multiple brands
   - Amazon products (extract brand from title)
   - Misspellings and variations

4. Confidence scoring:
   - Direct brand domain: 95% confidence
   - Brand in title: 85% confidence  
   - Brand in URL path: 75% confidence
   - Fuzzy match: 60% confidence

5. Product category detection:
   - Apparel, Footwear, Equipment, Nutrition, Accessories
   - Based on keywords in title/URL

Return structured brand info with confidence scores.
```

## Prompt 7: CLI Tool

```
Create a simple CLI tool for running the extraction. Requirements:

1. Commands:
   npm run extract <username> - Full extraction
   npm run extract:quick <username> - Just Linktree, skip Instagram
   npm run batch <file.json> - Process multiple athletes

2. Output:
   - Show progress in real-time
   - Use colors (green = success, yellow = warning, red = error)
   - Display summary stats at the end
   - Save JSON to ./output directory

3. Format:
🚀 Processing @cristiano...
  ✓ Profile extracted
  ✓ Found Linktree
  ✓ Extracted 23 links
  ✓ Expanded URLs
  ✓ Detected 18 affiliate links

📊 Summary:
  Total Links: 23
  Affiliate Links: 18 (78%)
  Brands: Nike, CR7, Clear, Binance
  Processing Time: 18.3s

💾 Saved to ./output/cristiano_2024-01-15.json

4. Handle arguments:
   --no-cache: Force fresh extraction
   --timeout=30: Set timeout in seconds
   --output=./custom: Custom output directory

Make it user-friendly for non-technical users.
```

## Prompt 8: Test Data Generator

```
Create a test utility that validates extraction accuracy. Requirements:

1. Test data structure:
{
  "athletes": [
    {
      "username": "cristiano",
      "linktreeUrl": "https://linktr.ee/cristiano",
      "expectedLinks": 20,
      "expectedBrands": ["Nike", "CR7"],
      "mustFindLinks": [
        "https://nike.com/cristiano",
        "https://cr7.com"
      ]
    }
  ]
}

2. Test runner that:
   - Processes each athlete
   - Compares against expected results
   - Reports accuracy metrics
   - Identifies missing links

3. Output test report:
=== Extraction Accuracy Report ===
Athlete: cristiano
  Links Found: 22/20 ✓
  Brands Found: 7/2 ✓
  Must-Find Links: 2/2 ✓
  Accuracy: 95%

Overall Accuracy: 93%
Missing Critical Links: 0

4. Performance metrics:
   - Average extraction time
   - Success rate
   - Error frequency

Use this to validate the system works before showing to users.
```

## How to Use These Prompts

### Best Practices:

1. **Start with Prompt 1** (Linktree) - This is 80% of the value
2. **Test immediately** - Don't wait until everything is built
3. **Use real data** - Test with actual athlete profiles
4. **Handle failures gracefully** - The system should never crash

### Testing Order:
1. Get Linktree working first
2. Add URL expansion
3. Add brand detection  
4. Then try Instagram (expect it to fail often)
5. Put it all together

### When talking to AI:
- Be specific about error handling
- Ask for resilient selectors (multiple fallbacks)
- Request parallel processing where appropriate
- Emphasize graceful degradation

### Quick Test Commands:
```bash
# After generating each component
npx ts-node src/extractors/linktree.ts
npx ts-node src/test-extraction.ts
npm run extract cristiano
```

Remember: The goal is working extraction in 2 days, not perfect code. Focus on what provides value to your friend.