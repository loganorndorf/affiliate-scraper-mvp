# Technical Implementation Specification
## 2-Day MVP - Exact Build Instructions

## Project Structure

```
affiliate-detector-mvp/
├── src/
│   ├── scraper/
│   │   ├── instagram.ts      # Instagram scraper class
│   │   └── types.ts          # TypeScript interfaces
│   ├── detector/
│   │   ├── detector.ts       # Affiliate detection logic
│   │   ├── brands.ts         # Brand dictionary
│   │   └── patterns.ts       # Regex patterns
│   ├── analyzer/
│   │   └── analyzer.ts       # Combine scraper + detector
│   ├── web/
│   │   ├── server.ts         # Express server
│   │   └── public/
│   │       ├── index.html    # Simple UI
│   │       └── style.css     # Minimal styling
│   └── cli.ts                # CLI interface for testing
├── data/
│   ├── cache/                # Cached scraping results
│   └── reports/              # Generated reports
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## Core TypeScript Interfaces

```typescript
// src/scraper/types.ts

export interface AthleteProfile {
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  followingCount: number;
  postCount: number;
  profilePicture: string;
  isVerified: boolean;
  externalUrl?: string;
  scrapedAt: Date;
}

export interface Post {
  id: string;
  caption: string;
  imageUrl: string;
  videoUrl?: string;
  likes: number;
  comments: number;
  timestamp: Date;
  hashtags: string[];
  mentions: string[];
  type: 'image' | 'video' | 'carousel';
  url: string;
}

export interface AffiliateDetection {
  postId: string;
  confidence: number; // 0-100
  type: 'discount_code' | 'affiliate_url' | 'brand_mention' | 'promo_text' | 'hashtag';
  value: string;
  brand?: string;
  product?: string;
  estimatedValue?: number;
  context?: string; // Text around the detection
}

export interface AnalysisReport {
  athlete: AthleteProfile;
  posts: Post[];
  detections: AffiliateDetection[];
  summary: {
    totalPosts: number;
    affiliatePosts: number;
    brandsFound: string[];
    productsFound: string[];
    discountCodes: string[];
    estimatedMonthlyRevenue: number;
    hiddenAffiliates: number;
    obviousAffiliates: number;
    confidence: number;
  };
  insights: string[];
  generatedAt: Date;
}

export interface CacheEntry {
  username: string;
  data: AnalysisReport;
  cachedAt: Date;
  expiresAt: Date;
}
```

## Instagram Scraper Implementation

```typescript
// src/scraper/instagram.ts

import puppeteer, { Browser, Page } from 'puppeteer';
import { AthleteProfile, Post } from './types';

export class InstagramScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    this.page = await this.browser.newPage();
    
    // Set mobile user agent (iPhone 12)
    await this.page.setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
    );
    
    // Set viewport to mobile
    await this.page.setViewport({
      width: 390,
      height: 844,
      isMobile: true,
      hasTouch: true
    });
  }
  
  async scrapeProfile(username: string): Promise<AthleteProfile> {
    if (!this.page) throw new Error('Scraper not initialized');
    
    const url = `https://www.instagram.com/${username}/`;
    await this.page.goto(url, { waitUntil: 'networkidle2' });
    
    // Wait for profile to load
    await this.page.waitForSelector('[role="main"]', { timeout: 10000 });
    
    // Extract profile data
    const profileData = await this.page.evaluate(() => {
      // Profile data extraction logic
      const getTextContent = (selector: string): string => {
        const element = document.querySelector(selector);
        return element?.textContent?.trim() || '';
      };
      
      // Parse follower count
      const parseCount = (text: string): number => {
        if (!text) return 0;
        text = text.toLowerCase();
        if (text.includes('m')) {
          return Math.round(parseFloat(text) * 1000000);
        } else if (text.includes('k')) {
          return Math.round(parseFloat(text) * 1000);
        }
        return parseInt(text.replace(/,/g, ''), 10);
      };
      
      return {
        fullName: getTextContent('h2'),
        bio: getTextContent('[role="main"] span'),
        // Additional extraction logic
      };
    });
    
    return {
      username,
      ...profileData,
      scrapedAt: new Date()
    };
  }
  
  async scrapePosts(username: string, limit: number = 30): Promise<Post[]> {
    if (!this.page) throw new Error('Scraper not initialized');
    
    const posts: Post[] = [];
    
    // Navigate to profile
    await this.page.goto(`https://www.instagram.com/${username}/`, { 
      waitUntil: 'networkidle2' 
    });
    
    // Click first post
    await this.page.click('[role="main"] article a');
    
    // Extract posts in a loop
    for (let i = 0; i < limit; i++) {
      // Extract post data
      const postData = await this.extractPostData();
      if (postData) posts.push(postData);
      
      // Navigate to next post
      const hasNext = await this.goToNextPost();
      if (!hasNext) break;
      
      // Small delay to avoid rate limiting
      await this.delay(500);
    }
    
    return posts;
  }
  
  private async extractPostData(): Promise<Post | null> {
    // Post extraction logic
    return null;
  }
  
  private async goToNextPost(): Promise<boolean> {
    // Navigation logic
    return false;
  }
  
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
    }
  }
}
```

## Detection Engine

```typescript
// src/detector/detector.ts

import { Post, AffiliateDetection } from '../scraper/types';
import { SPORTS_BRANDS, DISCOUNT_PATTERNS, AFFILIATE_URL_PATTERNS, PROMO_KEYWORDS } from './patterns';

export class AffiliateDetector {
  private brands: Set<string>;
  
  constructor() {
    this.brands = new Set(SPORTS_BRANDS.map(b => b.toLowerCase()));
  }
  
  detectAffiliates(post: Post): AffiliateDetection[] {
    const detections: AffiliateDetection[] = [];
    const text = post.caption.toLowerCase();
    
    // 1. Detect discount codes
    const discountCodes = this.detectDiscountCodes(post.caption);
    detections.push(...discountCodes);
    
    // 2. Detect brand mentions
    const brandMentions = this.detectBrandMentions(post.caption, post.mentions);
    detections.push(...brandMentions);
    
    // 3. Detect promo language
    const promoDetections = this.detectPromoLanguage(post.caption);
    detections.push(...promoDetections);
    
    // 4. Check hashtags
    const hashtagDetections = this.detectAffiliateHashtags(post.hashtags);
    detections.push(...hashtagDetections);
    
    // 5. Calculate confidence and estimate value
    return detections.map(d => this.enrichDetection(d, post));
  }
  
  private detectDiscountCodes(text: string): AffiliateDetection[] {
    const detections: AffiliateDetection[] = [];
    
    for (const pattern of DISCOUNT_PATTERNS) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1]) {
          detections.push({
            postId: '',
            type: 'discount_code',
            value: match[1].toUpperCase(),
            confidence: 90,
            context: match[0]
          });
        }
      }
    }
    
    return detections;
  }
  
  private detectBrandMentions(text: string, mentions: string[]): AffiliateDetection[] {
    const detections: AffiliateDetection[] = [];
    
    // Check caption for brands
    for (const brand of SPORTS_BRANDS) {
      if (text.toLowerCase().includes(brand.toLowerCase())) {
        detections.push({
          postId: '',
          type: 'brand_mention',
          value: brand,
          brand: brand,
          confidence: 70
        });
      }
    }
    
    // Check @mentions
    for (const mention of mentions) {
      if (this.brands.has(mention.toLowerCase().replace('@', ''))) {
        detections.push({
          postId: '',
          type: 'brand_mention',
          value: mention,
          brand: mention.replace('@', ''),
          confidence: 85
        });
      }
    }
    
    return detections;
  }
  
  private detectPromoLanguage(text: string): AffiliateDetection[] {
    const detections: AffiliateDetection[] = [];
    
    for (const keyword of PROMO_KEYWORDS) {
      if (text.toLowerCase().includes(keyword)) {
        detections.push({
          postId: '',
          type: 'promo_text',
          value: keyword,
          confidence: 60
        });
      }
    }
    
    return detections;
  }
  
  private detectAffiliateHashtags(hashtags: string[]): AffiliateDetection[] {
    const affiliateHashtags = ['ad', 'sponsored', 'partner', 'gifted', 'affiliate'];
    const detections: AffiliateDetection[] = [];
    
    for (const tag of hashtags) {
      if (affiliateHashtags.includes(tag.toLowerCase())) {
        detections.push({
          postId: '',
          type: 'hashtag',
          value: `#${tag}`,
          confidence: 95
        });
      }
    }
    
    return detections;
  }
  
  private enrichDetection(detection: AffiliateDetection, post: Post): AffiliateDetection {
    detection.postId = post.id;
    
    // Estimate value based on engagement
    const engagementRate = (post.likes + post.comments) / 1000000; // Simple estimation
    detection.estimatedValue = Math.round(engagementRate * 1000);
    
    return detection;
  }
  
  calculateOverallConfidence(detections: AffiliateDetection[]): number {
    if (detections.length === 0) return 0;
    
    const maxConfidence = Math.max(...detections.map(d => d.confidence));
    const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
    
    // Weight towards max with boost for multiple signals
    return Math.min(100, maxConfidence * 0.7 + avgConfidence * 0.3 + (detections.length - 1) * 5);
  }
}
```

## Package.json Configuration

```json
{
  "name": "affiliate-detector-mvp",
  "version": "0.1.0",
  "description": "2-Day MVP for Instagram Affiliate Detection",
  "main": "dist/cli.js",
  "scripts": {
    "dev": "nodemon --exec ts-node src/cli.ts",
    "web": "nodemon --exec ts-node src/web/server.ts",
    "build": "tsc",
    "start": "node dist/web/server.js",
    "test": "ts-node src/cli.ts test",
    "analyze": "ts-node src/cli.ts analyze"
  },
  "dependencies": {
    "puppeteer": "^21.0.0",
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.17",
    "@types/cors": "^2.8.13",
    "typescript": "^5.0.0",
    "nodemon": "^3.0.0",
    "ts-node": "^10.9.0"
  }
}