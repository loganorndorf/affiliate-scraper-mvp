# Step-by-Step Implementation Guide
## The 80/20 Extraction Engine Build

## Hour 1-2: Project Setup & First Success

### Initial Setup (30 minutes)
```bash
# Create project
mkdir athlete-onboarding-automation
cd athlete-onboarding-automation

# Initialize npm and install dependencies
npm init -y
npm install puppeteer axios
npm install -D typescript @types/node ts-node nodemon

# Initialize TypeScript
npx tsc --init

# Create folder structure
mkdir -p src/{extractors,processors,utils} output cache
```

### Configure TypeScript (10 minutes)
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Create Core Interfaces (20 minutes)
Create `src/extractors/types.ts` with all the interfaces from the Technical Spec.

### Quick Win: Linktree Extractor (60 minutes)
Create `src/extractors/linktree.ts`:

```typescript
// Quick test to see if Puppeteer works
import puppeteer from 'puppeteer';

async function testLinktree() {
  const browser = await puppeteer.launch({ headless: false }); // Watch it work!
  const page = await browser.newPage();
  
  // Test with a known Linktree
  await page.goto('https://linktr.ee/cristiano');
  
  // Extract links
  const links = await page.evaluate(() => {
    const elements = document.querySelectorAll('a[data-testid="LinkButton"]');
    return Array.from(elements).map(el => ({
      title: el.textContent,
      url: el.href
    }));
  });
  
  console.log('Found links:', links);
  await browser.close();
}

testLinktree();
```

**Success Checkpoint**: You should see Ronaldo's links printed to console!

## Hour 3-4: Core Extraction Logic

### Build the Linktree Extractor Class (60 minutes)
Expand the test into a proper class:

```typescript
// src/extractors/linktree.ts
export class LinktreeExtractor {
  async extractLinks(linktreeUrl: string): Promise<ExtractedLink[]> {
    // Implementation from Technical Spec
    // Focus on:
    // 1. Launch browser
    // 2. Go to URL
    // 3. Wait for links
    // 4. Extract all link data
    // 5. Return structured data
  }
}
```

### Test with Multiple Athletes (30 minutes)
```typescript
// src/test-extraction.ts
import { LinktreeExtractor } from './extractors/linktree';

async function test() {
  const extractor = new LinktreeExtractor();
  
  const testUrls = [
    'https://linktr.ee/cristiano',
    'https://linktr.ee/therock',
    // Add more athlete Linktrees
  ];
  
  for (const url of testUrls) {
    console.log(`Testing ${url}...`);
    const links = await extractor.extractLinks(url);
    console.log(`Found ${links.length} links`);
  }
}

test();
```

### Add Beacons.ai Support (30 minutes)
```typescript
// src/extractors/beacons.ts
export class BeaconsExtractor {
  // Similar to Linktree but different selectors
  // Beacons uses different HTML structure
}
```

## Hour 5-6: Link Intelligence

### Build Link Expander (60 minutes)
Create `src/processors/linkExpander.ts`:

```typescript
import axios from 'axios';

export class LinkExpander {
  async expandUrl(shortUrl: string): Promise<string> {
    try {
      // Follow redirects
      const response = await axios.get(shortUrl, {
        maxRedirects: 5,
        validateStatus: () => true,
        headers: {
          'User-Agent': 'Mozilla/5.0...' // Add real user agent
        }
      });
      
      // Get final URL
      return response.request.res.responseUrl || shortUrl;
    } catch {
      return shortUrl; // Return original if expansion fails
    }
  }
  
  detectAffiliate(url: string): AffiliateInfo {
    // Check for affiliate parameters
    // - Amazon: tag=
    // - ShareASale: afftrack=
    // - Generic: ref=, utm_source=
    
    return {
      isAffiliate: true,
      platform: 'amazon',
      affiliateId: 'extracted-id'
    };
  }
}
```

### Test Link Expansion (30 minutes)
```typescript
// Test with real athlete links
const expander = new LinkExpander();

const testLinks = [
  'https://amzn.to/xyz123',  // Amazon short link
  'https://bit.ly/abc456',   // Bitly link
  // Add more
];

for (const link of testLinks) {
  const expanded = await expander.expandUrl(link);
  console.log(`${link} -> ${expanded}`);
  
  const affiliateInfo = expander.detectAffiliate(expanded);
  console.log('Affiliate?', affiliateInfo);
}
```

### Add Brand Detection (30 minutes)
```typescript
// src/utils/brands.ts
export const SPORTS_BRANDS = [
  'Nike', 'Adidas', 'Under Armour', 'Puma',
  'Gymshark', 'Lululemon', 'Fabletics',
  // Add more brands
];

export function detectBrand(url: string, title: string): string | undefined {
  const urlLower = url.toLowerCase();
  const titleLower = title.toLowerCase();
  
  for (const brand of SPORTS_BRANDS) {
    if (urlLower.includes(brand.toLowerCase()) || 
        titleLower.includes(brand.toLowerCase())) {
      return brand;
    }
  }
  
  return undefined;
}
```

## Hour 7-8: Instagram Integration

### Try Instagram Bio Extraction (60 minutes)
```typescript
// src/extractors/instagram.ts
export class InstagramExtractor {
  async getProfile(username: string): Promise<AthleteProfile | null> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      await page.goto(`https://instagram.com/${username}`);
      
      // Try to extract bio link
      const bioLink = await page.evaluate(() => {
        // Look for link in bio
        const link = document.querySelector('a[href*="link"]');
        return link?.href;
      });
      
      return {
        username,
        bioLink,
        // Other fields
      };
    } catch (error) {
      console.log('Instagram extraction failed, continuing...');
      return null;
    } finally {
      await browser.close();
    }
  }
}
```

### Graceful Degradation (30 minutes)
If Instagram blocks you, don't fail the whole process:

```typescript
async function extractWithFallback(username: string) {
  // Try Instagram first
  const profile = await tryInstagram(username);
  
  if (!profile?.bioLink) {
    // Fallback: Ask user for Linktree URL
    console.log(`Could not get Instagram bio for ${username}`);
    console.log('Please provide their Linktree URL manually:');
    // In real implementation, could read from config file
  }
  
  // Continue with whatever data we have
}
```

### Test Full Pipeline (30 minutes)
```typescript
// src/test-full-pipeline.ts
async function testPipeline(username: string) {
  console.log(`\n🏃 Processing ${username}...`);
  
  // 1. Try to get Instagram profile
  const profile = await instagramExtractor.getProfile(username);
  
  // 2. Extract Linktree links
  let links = [];
  if (profile?.bioLink?.includes('linktr.ee')) {
    links = await linktreeExtractor.extractLinks(profile.bioLink);
  }
  
  // 3. Expand and classify links
  for (const link of links) {
    link.expandedUrl = await linkExpander.expandUrl(link.originalUrl);
    link.brand = detectBrand(link.expandedUrl, link.title);
  }
  
  console.log(`✅ Found ${links.length} affiliate links`);
  console.log(`🏷️ Brands: ${[...new Set(links.map(l => l.brand))].filter(Boolean)}`);
}

// Test with real athletes
testPipeline('cristiano');
testPipeline('therock');
```

## Day 2, Hour 1-2: Main Orchestrator

### Build the Main Class (90 minutes)
Create `src/index.ts` with the full orchestrator from the Technical Spec.

Focus on:
1. Coordinating all extractors
2. Handling failures gracefully
3. Generating clean output

### Add CLI Interface (30 minutes)
```typescript
// Make it easy to run
if (require.main === module) {
  const username = process.argv[2];
  
  if (!username) {
    console.log('Usage: npm run extract <username>');
    process.exit(1);
  }
  
  const automation = new AthleteOnboardingAutomation();
  automation.processAthlete(username)
    .then(result => {
      console.log('Success!', result.summary);
      // Save to file
    })
    .catch(console.error);
}
```

## Hour 3-4: Output Formatting

### Create Clean JSON Output (60 minutes)
```typescript
function formatForDatabase(result: OnboardingResult) {
  return {
    athlete_username: result.athlete.username,
    athlete_followers: result.athlete.followerCount,
    products: result.affiliates.map(link => ({
      name: link.title,
      url: link.expandedUrl,
      brand: link.metadata?.brand,
      type: link.type,
      affiliate_id: link.metadata?.affiliateId
    })),
    import_ready: true
  };
}
```

### Add Summary Statistics (30 minutes)
```typescript
function printSummary(result: OnboardingResult) {
  console.log('\n📊 EXTRACTION SUMMARY');
  console.log('═══════════════════════');
  console.log(`Athlete: @${result.athlete.username}`);
  console.log(`Followers: ${result.athlete.followerCount.toLocaleString()}`);
  console.log(`Total Links: ${result.summary.totalLinks}`);
  console.log(`Unique Brands: ${result.summary.uniqueBrands.join(', ')}`);
  console.log(`Processing Time: ${result.metadata.processingTime}ms`);
  
  if (result.metadata.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    result.metadata.warnings.forEach(w => console.log(`  - ${w}`));
  }
}
```

### Save Output Files (30 minutes)
```typescript
async function saveResults(username: string, result: OnboardingResult) {
  const fs = require('fs').promises;
  
  // Save full result
  const timestamp = new Date().toISOString().replace(/:/g, '-');
  const filename = `./output/${username}_${timestamp}.json`;
  
  await fs.writeFile(
    filename,
    JSON.stringify(result, null, 2)
  );
  
  // Also save database-ready format
  const dbFormat = formatForDatabase(result);
  await fs.writeFile(
    `./output/${username}_import.json`,
    JSON.stringify(dbFormat, null, 2)
  );
  
  console.log(`\n💾 Saved to ${filename}`);
}
```

## Hour 5-6: Testing & Polish

### Test with 5 Real Athletes (90 minutes)

Create `test-athletes.json`:
```json
{
  "athletes": [
    {
      "username": "cristiano",
      "expectedBrands": ["Nike", "CR7"],
      "hasLinktree": true
    },
    {
      "username": "therock",
      "expectedBrands": ["Under Armour", "Teremana"],
      "hasLinktree": true
    }
    // Add 3 more
  ]
}
```

Run tests:
```typescript
// src/test-suite.ts
const athletes = require('./test-athletes.json').athletes;

for (const athlete of athletes) {
  console.log(`\nTesting ${athlete.username}...`);
  
  const result = await automation.processAthlete(athlete.username);
  
  // Verify expectations
  if (athlete.hasLinktree && result.affiliates.length === 0) {
    console.error('❌ Expected to find Linktree links!');
  }
  
  // Check for expected brands
  const foundBrands = result.summary.uniqueBrands;
  for (const expected of athlete.expectedBrands) {
    if (!foundBrands.includes(expected)) {
      console.warn(`⚠️ Did not find expected brand: ${expected}`);
    }
  }
  
  console.log('✅ Test complete');
}
```

### Handle Edge Cases (30 minutes)
Add error handling for:
- No Linktree/Beacons
- Private Instagram accounts
- Empty bio links
- Malformed URLs
- Network timeouts

## Hour 7-8: Demo Preparation

### Create Demo Script (30 minutes)
```bash
#!/bin/bash
# demo.sh

echo "🚀 Athlete Onboarding Automation Demo"
echo "======================================"
echo ""
echo "Let's onboard Cristiano Ronaldo..."
echo ""

npm run extract cristiano

echo ""
echo "✨ Onboarding complete in < 30 seconds!"
echo "Compare this to 3 hours of manual work."
```

### Prepare Backup Data (30 minutes)
Pre-run extraction for demo athletes and save results:
```bash
npm run extract cristiano
npm run extract therock
npm run extract kingjames
# Save these outputs as backups
```

### Test Everything One More Time (60 minutes)
1. Clear all cache
2. Run fresh extraction
3. Verify JSON output is clean
4. Check for any console errors
5. Time the full process
6. Make sure it's under 30 seconds

## Success Checklist

Before showing your friend:
- [ ] Extracts Linktree successfully (90% of value)
- [ ] Expands shortened URLs properly
- [ ] Identifies affiliate parameters
- [ ] Outputs clean JSON
- [ ] Handles failures gracefully
- [ ] Runs in <30 seconds
- [ ] Works for at least 3 test athletes

## The Casual Demo

When you show your friend:

1. **Open terminal** (already in project directory)
2. **Run**: `npm run extract cristiano`
3. **Wait** for it to complete (~20 seconds)
4. **Show** the JSON output
5. **Say**: "This drops right into your database. 3 hours → 30 seconds."
6. **Ask**: "Want to see another athlete?"

That's it. No slides, no pitch. Just working code that solves their problem.