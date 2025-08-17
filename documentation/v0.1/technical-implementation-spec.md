# Technical Implementation Specification
## 2-Day MVP - Automated Onboarding Engine

## Project Structure (Simplified)

```
athlete-onboarding-automation/
├── src/
│   ├── extractors/
│   │   ├── linktree.ts       # Linktree scraper
│   │   ├── beacons.ts        # Beacons scraper
│   │   ├── instagram.ts      # Instagram bio/posts
│   │   └── types.ts          # Shared interfaces
│   ├── processors/
│   │   ├── linkExpander.ts   # URL expansion/redirect following
│   │   ├── affiliateDetector.ts # Identify affiliate links
│   │   └── productExtractor.ts  # Extract product metadata
│   ├── utils/
│   │   ├── patterns.ts       # Regex patterns
│   │   └── brands.ts         # Brand dictionary
│   └── index.ts              # Main orchestrator
├── output/                   # JSON output files
├── cache/                    # Temporary cache
├── package.json
├── tsconfig.json
└── README.md
```

## Core TypeScript Interfaces

```typescript
// src/extractors/types.ts

export interface AthleteProfile {
  username: string;
  platform: 'instagram' | 'tiktok';
  fullName?: string;
  bio?: string;
  followerCount: number;
  followingCount?: number;
  isVerified: boolean;
  profilePicture?: string;
  bioLink?: string;          // The main link in bio
  extractedAt: Date;
}

export interface ExtractedLink {
  title: string;              // Link title from Linktree/Beacons
  originalUrl: string;        // Short/redirect URL
  expandedUrl: string;        // Final destination
  type: LinkType;
  metadata?: LinkMetadata;
  source: 'bio' | 'linktree' | 'beacons' | 'post' | 'story';
  confidence: number;
}

export enum LinkType {
  AMAZON = 'amazon',
  SHOPIFY = 'shopify',
  AFFILIATE_NETWORK = 'affiliate_network',
  BRAND_DIRECT = 'brand_direct',
  SOCIAL_MEDIA = 'social_media',
  UNKNOWN = 'unknown'
}

export interface LinkMetadata {
  productName?: string;
  brand?: string;
  price?: number;
  currency?: string;
  discountCode?: string;
  affiliateId?: string;
  imageUrl?: string;
  asin?: string;              // Amazon product ID
  shopifyProductId?: string;
}

export interface PostData {
  id: string;
  caption: string;
  timestamp: Date;
  mentions: string[];
  hashtags: string[];
  urls: string[];
}

export interface OnboardingResult {
  athlete: AthleteProfile;
  affiliates: ExtractedLink[];
  discountCodes: DiscountCode[];
  summary: Summary;
  metadata: Metadata;
}

export interface DiscountCode {
  code: string;
  brand?: string;
  description?: string;
  source: string;              // Where we found it
  confidence: number;
}

export interface Summary {
  totalLinks: number;
  fromBioLinks: number;
  fromPosts: number;
  uniqueBrands: string[];
  linkPlatforms: Record<LinkType, number>;
  activeCodes: string[];
}

export interface Metadata {
  extractedAt: Date;
  version: string;
  processingTime: number;      // milliseconds
  warnings: string[];
  errors?: string[];
}
```

## Core Implementation Components

### 1. Linktree Extractor

```typescript
// src/extractors/linktree.ts

import puppeteer, { Browser, Page } from 'puppeteer';
import { ExtractedLink } from './types';

export class LinktreeExtractor {
  private browser: Browser | null = null;
  
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  
  async extractLinks(linktreeUrl: string): Promise<ExtractedLink[]> {
    if (!this.browser) await this.initialize();
    
    const page = await this.browser.newPage();
    const links: ExtractedLink[] = [];
    
    try {
      // Linktree doesn't require authentication
      await page.goto(linktreeUrl, { waitUntil: 'networkidle2' });
      
      // Wait for links to load
      await page.waitForSelector('[data-testid="LinkButton"]', { 
        timeout: 5000 
      }).catch(() => null);
      
      // Extract all links
      const rawLinks = await page.evaluate(() => {
        const linkElements = document.querySelectorAll('a[data-testid="LinkButton"]');
        return Array.from(linkElements).map(el => ({
          title: el.textContent?.trim() || '',
          url: el.href
        }));
      });
      
      // Process each link
      for (const link of rawLinks) {
        links.push({
          title: link.title,
          originalUrl: link.url,
          expandedUrl: '', // Will be expanded later
          type: LinkType.UNKNOWN,
          source: 'linktree',
          confidence: 95
        });
      }
      
    } catch (error) {
      console.error('Linktree extraction failed:', error);
    } finally {
      await page.close();
    }
    
    return links;
  }
  
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

### 2. Instagram Bio Extractor

```typescript
// src/extractors/instagram.ts

export class InstagramExtractor {
  async extractProfile(username: string): Promise<AthleteProfile | null> {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Try to get basic profile without auth
      await page.goto(`https://www.instagram.com/${username}/`, {
        waitUntil: 'networkidle2'
      });
      
      // Extract what we can from the page
      const profileData = await page.evaluate(() => {
        // Try multiple selectors for resilience
        const getMetaContent = (property: string) => {
          const meta = document.querySelector(`meta[property="${property}"]`);
          return meta?.getAttribute('content');
        };
        
        return {
          fullName: getMetaContent('og:title'),
          bio: getMetaContent('og:description'),
          profilePicture: getMetaContent('og:image')
        };
      });
      
      // Look for bio link
      const bioLink = await this.extractBioLink(page);
      
      // Parse follower count from bio or title
      const followerCount = this.parseFollowerCount(profileData.bio || '');
      
      return {
        username,
        platform: 'instagram',
        ...profileData,
        followerCount,
        isVerified: false, // Would need more parsing
        bioLink,
        extractedAt: new Date()
      };
      
    } catch (error) {
      console.error('Instagram extraction failed:', error);
      return null;
    } finally {
      await browser.close();
    }
  }
  
  private async extractBioLink(page: Page): Promise<string | undefined> {
    // Look for external link in bio
    return page.evaluate(() => {
      const linkElement = document.querySelector('a[href*="linktr.ee"], a[href*="beacons.ai"], a[href^="http"]');
      return linkElement?.getAttribute('href') || undefined;
    });
  }
  
  private parseFollowerCount(text: string): number {
    const match = text.match(/(\d+(?:\.\d+)?)\s*([KMB]?)\s*followers/i);
    if (!match) return 0;
    
    const num = parseFloat(match[1]);
    const multiplier = match[2];
    
    switch(multiplier?.toUpperCase()) {
      case 'K': return Math.round(num * 1000);
      case 'M': return Math.round(num * 1000000);
      case 'B': return Math.round(num * 1000000000);
      default: return Math.round(num);
    }
  }
}
```

### 3. Link Expander & Classifier

```typescript
// src/processors/linkExpander.ts

import axios from 'axios';

export class LinkExpander {
  async expandUrl(shortUrl: string): Promise<string> {
    try {
      const response = await axios.get(shortUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });
      
      return response.request.res.responseUrl || shortUrl;
    } catch (error) {
      // If expansion fails, return original
      return shortUrl;
    }
  }
  
  classifyLink(url: string): LinkType {
    const urlLower = url.toLowerCase();
    
    if (urlLower.includes('amazon.com') || urlLower.includes('amzn.to')) {
      return LinkType.AMAZON;
    }
    if (urlLower.includes('shopify.com') || urlLower.includes('myshopify.com')) {
      return LinkType.SHOPIFY;
    }
    if (urlLower.includes('linksynergy') || urlLower.includes('shareasale')) {
      return LinkType.AFFILIATE_NETWORK;
    }
    if (this.isBrandDirect(urlLower)) {
      return LinkType.BRAND_DIRECT;
    }
    
    return LinkType.UNKNOWN;
  }
  
  private isBrandDirect(url: string): boolean {
    const brandDomains = [
      'nike.com', 'adidas.com', 'underarmour.com',
      'gymshark.com', 'lululemon.com'
    ];
    
    return brandDomains.some(domain => url.includes(domain));
  }
  
  extractAffiliateId(url: string): string | undefined {
    // Amazon
    const amazonTag = url.match(/[?&]tag=([^&]+)/);
    if (amazonTag) return amazonTag[1];
    
    // Generic ref parameter
    const refParam = url.match(/[?&]ref=([^&]+)/);
    if (refParam) return refParam[1];
    
    // Affiliate ID in path
    const pathAffiliate = url.match(/\/ref\/([^\/\?]+)/);
    if (pathAffiliate) return pathAffiliate[1];
    
    return undefined;
  }
}
```

### 4. Main Orchestrator

```typescript
// src/index.ts

import { LinktreeExtractor } from './extractors/linktree';
import { InstagramExtractor } from './extractors/instagram';
import { LinkExpander } from './processors/linkExpander';
import { OnboardingResult } from './extractors/types';

export class AthleteOnboardingAutomation {
  private linktreeExtractor = new LinktreeExtractor();
  private instagramExtractor = new InstagramExtractor();
  private linkExpander = new LinkExpander();
  
  async processAthlete(username: string): Promise<OnboardingResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    console.log(`Processing @${username}...`);
    
    // Step 1: Get Instagram profile
    const profile = await this.instagramExtractor.extractProfile(username);
    
    if (!profile) {
      throw new Error(`Could not extract profile for ${username}`);
    }
    
    // Step 2: Extract links from bio link platforms
    let affiliates: ExtractedLink[] = [];
    
    if (profile.bioLink) {
      console.log(`Found bio link: ${profile.bioLink}`);
      
      if (profile.bioLink.includes('linktr.ee')) {
        const links = await this.linktreeExtractor.extractLinks(profile.bioLink);
        affiliates.push(...links);
      }
      // Add other platforms (Beacons, etc) here
    } else {
      warnings.push('No bio link found');
    }
    
    // Step 3: Expand and classify all links
    for (const link of affiliates) {
      link.expandedUrl = await this.linkExpander.expandUrl(link.originalUrl);
      link.type = this.linkExpander.classifyLink(link.expandedUrl);
      
      const affiliateId = this.linkExpander.extractAffiliateId(link.expandedUrl);
      if (affiliateId) {
        link.metadata = { ...link.metadata, affiliateId };
      }
    }
    
    // Step 4: Generate summary
    const summary = this.generateSummary(affiliates);
    
    // Step 5: Create result
    const result: OnboardingResult = {
      athlete: profile,
      affiliates,
      discountCodes: [], // Would extract from posts
      summary,
      metadata: {
        extractedAt: new Date(),
        version: '0.1.0',
        processingTime: Date.now() - startTime,
        warnings
      }
    };
    
    await this.cleanup();
    
    return result;
  }
  
  private generateSummary(affiliates: ExtractedLink[]): Summary {
    const linkPlatforms: Record<LinkType, number> = {} as any;
    const brands = new Set<string>();
    
    for (const link of affiliates) {
      linkPlatforms[link.type] = (linkPlatforms[link.type] || 0) + 1;
      if (link.metadata?.brand) {
        brands.add(link.metadata.brand);
      }
    }
    
    return {
      totalLinks: affiliates.length,
      fromBioLinks: affiliates.filter(l => l.source === 'linktree').length,
      fromPosts: 0, // Would be populated if we scraped posts
      uniqueBrands: Array.from(brands),
      linkPlatforms,
      activeCodes: []
    };
  }
  
  private async cleanup(): Promise<void> {
    await this.linktreeExtractor.close();
  }
}

// CLI Usage
async function main() {
  const username = process.argv[2];
  if (!username) {
    console.error('Usage: npm run extract <username>');
    process.exit(1);
  }
  
  const automation = new AthleteOnboardingAutomation();
  
  try {
    const result = await automation.processAthlete(username);
    
    // Save to JSON
    const fs = require('fs').promises;
    const outputPath = `./output/${username}_${Date.now()}.json`;
    await fs.writeFile(outputPath, JSON.stringify(result, null, 2));
    
    console.log(`✅ Extraction complete!`);
    console.log(`📊 Found ${result.affiliates.length} affiliate links`);
    console.log(`💾 Saved to ${outputPath}`);
    
  } catch (error) {
    console.error('❌ Extraction failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
```

## Package.json

```json
{
  "name": "athlete-onboarding-automation",
  "version": "0.1.0",
  "description": "Automated affiliate extraction for athlete onboarding",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "extract": "ts-node src/index.ts",
    "test": "ts-node src/index.ts cristiano",
    "dev": "nodemon --exec ts-node src/index.ts"
  },
  "dependencies": {
    "puppeteer": "^21.0.0",
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "typescript": "^5.0.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0"
  }
}