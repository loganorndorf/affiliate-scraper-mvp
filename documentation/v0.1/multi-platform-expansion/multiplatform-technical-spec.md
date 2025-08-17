# Multi-Platform Technical Specification
## Universal Creator Discovery Implementation

## Architecture Enhancement

```
Current Architecture:
├── extractors/
│   ├── linktree.ts ✅
│   ├── beacons.ts ✅
│   └── instagram.ts ✅

Enhanced Architecture:
├── extractors/
│   ├── aggregators/
│   │   ├── linktree.ts ✅
│   │   ├── beacons.ts ✅
│   │   └── faves.ts (new)
│   ├── social/
│   │   ├── instagram.ts ✅
│   │   ├── tiktok.ts (new)
│   │   ├── youtube.ts (new)
│   │   └── twitter.ts (new)
│   └── discovery/
│       ├── website.ts (new)
│       └── amazon.ts (new)
├── orchestrators/
│   ├── multiPlatform.ts (new)
│   └── identityResolver.ts (new)
└── intelligence/
    ├── deduplicator.ts (new)
    └── analyzer.ts (new)
```

## Core Interfaces Enhancement

```typescript
// src/types/multiplatform.ts

export interface CreatorHandle {
  platform: Platform;
  handle: string;
  url?: string;
  confidence: number;  // How sure we are this is the right account
}

export interface PlatformResult {
  platform: Platform;
  success: boolean;
  data?: {
    profile?: any;
    links: ExtractedLink[];
    metrics?: {
      followers?: number;
      engagement?: number;
    };
  };
  error?: string;
  extractedAt: Date;
}

export interface LinkDeduplication {
  originalUrls: string[];
  normalizedUrl: string;
  sources: Platform[];
  firstSeen: Date;
  lastSeen: Date;
  occurrences: number;
}

export interface CreatorIntelligence {
  primaryPlatform: Platform;
  totalReach: number;
  linkAggregatorStatus: {
    using: boolean;
    platform?: 'linktree' | 'beacons' | 'faves' | 'other';
    url?: string;
  };
  recommendationForFaves: {
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedLinks: number;
    competitorRisk?: string;  // "Currently using Linktree"
  };
}
```

## Platform Extractors

### TikTok Extractor

```typescript
// src/extractors/social/tiktok.ts

import { chromium, Browser, Page } from 'playwright';

export class TikTokExtractor {
  private browser: Browser | null = null;

  async initialize() {
    this.browser = await chromium.launch({
      headless: true,
      args: ['--disable-blink-features=AutomationControlled']
    });
  }

  async extractProfile(username: string): Promise<PlatformResult> {
    const page = await this.browser!.newPage();
    
    // TikTok mobile view often has less anti-bot
    await page.setViewportSize({ width: 375, height: 812 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)...');
    
    try {
      await page.goto(`https://www.tiktok.com/@${username}`, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });

      // Wait for profile to load
      await page.waitForSelector('[data-e2e="user-bio"]', { timeout: 5000 })
        .catch(() => null);

      // Extract profile data
      const profileData = await page.evaluate(() => {
        const getBioLink = () => {
          // TikTok allows one link in bio
          const linkElement = document.querySelector('a[href*="link"]');
          return linkElement?.href;
        };

        const getFollowerCount = () => {
          const followerElement = document.querySelector('[data-e2e="followers-count"]');
          return followerElement?.textContent || '0';
        };

        const getBio = () => {
          const bioElement = document.querySelector('[data-e2e="user-bio"]');
          return bioElement?.textContent || '';
        };

        return {
          bio: getBio(),
          bioLink: getBioLink(),
          followers: getFollowerCount()
        };
      });

      // Extract recent video descriptions (often contain links)
      const videoLinks = await this.extractVideoLinks(page);

      return {
        platform: 'tiktok',
        success: true,
        data: {
          profile: profileData,
          links: [
            ...(profileData.bioLink ? [{
              title: 'TikTok Bio Link',
              originalUrl: profileData.bioLink,
              expandedUrl: '',
              source: 'tiktok_bio',
              type: LinkType.UNKNOWN,
              confidence: 95
            }] : []),
            ...videoLinks
          ],
          metrics: {
            followers: this.parseFollowerCount(profileData.followers)
          }
        },
        extractedAt: new Date()
      };
    } catch (error) {
      return {
        platform: 'tiktok',
        success: false,
        error: error.message,
        extractedAt: new Date()
      };
    } finally {
      await page.close();
    }
  }

  private async extractVideoLinks(page: Page): Promise<ExtractedLink[]> {
    // Get descriptions from recent videos
    const links: ExtractedLink[] = [];
    
    try {
      // Click on first video
      await page.click('[data-e2e="user-post-item"]:first-child');
      await page.waitForTimeout(1000);

      // Extract from first 3 videos
      for (let i = 0; i < 3; i++) {
        const description = await page.$eval(
          '[data-e2e="browse-video-desc"]',
          el => el.textContent
        ).catch(() => '');

        // Extract URLs from description
        const urlMatches = description.match(/https?:\/\/[^\s]+/g) || [];
        
        urlMatches.forEach(url => {
          links.push({
            title: `TikTok Video Link ${i + 1}`,
            originalUrl: url,
            expandedUrl: '',
            source: 'tiktok_video',
            type: LinkType.UNKNOWN,
            confidence: 80
          });
        });

        // Go to next video
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(500);
      }
    } catch (error) {
      console.log('Could not extract video links:', error.message);
    }

    return links;
  }

  private parseFollowerCount(text: string): number {
    // Handle K, M, B suffixes
    const num = parseFloat(text);
    if (text.includes('K')) return num * 1000;
    if (text.includes('M')) return num * 1000000;
    if (text.includes('B')) return num * 1000000000;
    return num;
  }
}
```

### YouTube Extractor (API-based)

```typescript
// src/extractors/social/youtube.ts

import { google } from 'googleapis';

export class YouTubeExtractor {
  private youtube;

  constructor(apiKey: string) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }

  async extractChannel(handle: string): Promise<PlatformResult> {
    try {
      // Search for channel
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: handle,
        type: ['channel'],
        maxResults: 1
      });

      if (!searchResponse.data.items?.length) {
        throw new Error('Channel not found');
      }

      const channelId = searchResponse.data.items[0].snippet.channelId;

      // Get channel details
      const channelResponse = await this.youtube.channels.list({
        part: ['snippet', 'statistics', 'brandingSettings'],
        id: [channelId]
      });

      const channel = channelResponse.data.items[0];
      
      // Extract links from channel description
      const description = channel.snippet.description || '';
      const links = this.extractLinksFromText(description);

      // Get recent video descriptions
      const videoLinks = await this.extractVideoDescriptionLinks(channelId);

      return {
        platform: 'youtube',
        success: true,
        data: {
          profile: {
            name: channel.snippet.title,
            description: description,
            customUrl: channel.snippet.customUrl
          },
          links: [...links, ...videoLinks],
          metrics: {
            followers: parseInt(channel.statistics.subscriberCount),
            engagement: parseInt(channel.statistics.viewCount)
          }
        },
        extractedAt: new Date()
      };
    } catch (error) {
      return {
        platform: 'youtube',
        success: false,
        error: error.message,
        extractedAt: new Date()
      };
    }
  }

  private async extractVideoDescriptionLinks(channelId: string): Promise<ExtractedLink[]> {
    // Get recent videos
    const videosResponse = await this.youtube.search.list({
      part: ['id'],
      channelId: channelId,
      order: 'date',
      maxResults: 5,
      type: ['video']
    });

    const links: ExtractedLink[] = [];
    
    // Get descriptions for each video
    for (const video of videosResponse.data.items || []) {
      const videoDetails = await this.youtube.videos.list({
        part: ['snippet'],
        id: [video.id.videoId]
      });

      const description = videoDetails.data.items[0]?.snippet?.description || '';
      const videoLinks = this.extractLinksFromText(description);
      
      videoLinks.forEach(link => {
        link.source = 'youtube_video';
        link.confidence = 85;
      });
      
      links.push(...videoLinks);
    }

    return links;
  }

  private extractLinksFromText(text: string): ExtractedLink[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlRegex) || [];
    
    return matches.map((url, index) => ({
      title: `YouTube Link ${index + 1}`,
      originalUrl: url.trim(),
      expandedUrl: '',
      source: 'youtube_channel',
      type: LinkType.UNKNOWN,
      confidence: 90
    }));
  }
}
```

### Twitter/X Extractor

```typescript
// src/extractors/social/twitter.ts

export class TwitterExtractor {
  async extractProfile(username: string): Promise<PlatformResult> {
    // Twitter is harder without API
    // Use nitter.net (Twitter mirror) as fallback
    
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    try {
      // Try nitter (Twitter mirror that's easier to scrape)
      await page.goto(`https://nitter.net/${username}`, {
        waitUntil: 'networkidle'
      });

      const profileData = await page.evaluate(() => {
        const getBio = () => {
          return document.querySelector('.profile-bio')?.textContent || '';
        };

        const getBioLinks = () => {
          const links = [];
          const linkElements = document.querySelectorAll('.profile-bio a');
          linkElements.forEach(el => {
            links.push(el.href);
          });
          return links;
        };

        const getFollowers = () => {
          const followerText = document.querySelector('.profile-stat-num')?.textContent || '0';
          return followerText;
        };

        return {
          bio: getBio(),
          links: getBioLinks(),
          followers: getFollowers()
        };
      });

      // Extract pinned tweet links
      const pinnedLinks = await this.extractPinnedTweetLinks(page);

      return {
        platform: 'twitter',
        success: true,
        data: {
          profile: profileData,
          links: [
            ...profileData.links.map(url => ({
              title: 'Twitter Bio Link',
              originalUrl: url,
              expandedUrl: '',
              source: 'twitter_bio',
              type: LinkType.UNKNOWN,
              confidence: 85
            })),
            ...pinnedLinks
          ]
        },
        extractedAt: new Date()
      };
    } catch (error) {
      return {
        platform: 'twitter',
        success: false,
        error: error.message,
        extractedAt: new Date()
      };
    } finally {
      await browser.close();
    }
  }

  private async extractPinnedTweetLinks(page: Page): Promise<ExtractedLink[]> {
    // Extract links from pinned tweet if exists
    const links: ExtractedLink[] = [];
    
    try {
      const pinnedLinks = await page.$$eval('.timeline-item:first-child a[href*="http"]', 
        elements => elements.map(el => el.href)
      );
      
      pinnedLinks.forEach(url => {
        links.push({
          title: 'Twitter Pinned Tweet Link',
          originalUrl: url,
          expandedUrl: '',
          source: 'twitter_pinned',
          type: LinkType.UNKNOWN,
          confidence: 80
        });
      });
    } catch (error) {
      // No pinned tweet or couldn't extract
    }
    
    return links;
  }
}
```

## Multi-Platform Orchestrator

```typescript
// src/orchestrators/multiPlatform.ts

export class MultiPlatformOrchestrator {
  private extractors: Map<Platform, any>;
  private linkExpander: LinkExpander;
  private deduplicator: LinkDeduplicator;

  constructor() {
    this.initializeExtractors();
    this.linkExpander = new LinkExpander();
    this.deduplicator = new LinkDeduplicator();
  }

  async discoverCreator(query: string): Promise<UniversalCreatorProfile> {
    const startTime = Date.now();
    
    console.log(`🔍 Searching for creator: ${query}`);
    
    // Step 1: Resolve identity across platforms
    const identities = await this.resolveIdentities(query);
    
    // Step 2: Check all platforms in parallel
    const platformResults = await this.checkAllPlatforms(identities);
    
    // Step 3: Process and expand all links
    const processedLinks = await this.processAllLinks(platformResults);
    
    // Step 4: Deduplicate and analyze
    const analysis = this.analyzeResults(processedLinks, platformResults);
    
    // Step 5: Generate intelligence
    const intelligence = this.generateIntelligence(analysis);
    
    return {
      searchQuery: query,
      platforms: this.structurePlatformData(platformResults),
      allLinks: processedLinks,
      summary: analysis,
      intelligence: intelligence,
      metadata: {
        searchedAt: new Date(),
        processingTime: Date.now() - startTime,
        confidence: this.calculateConfidence(platformResults)
      }
    };
  }

  private async checkAllPlatforms(identities: CreatorIdentities): Promise<PlatformResult[]> {
    const checks = [
      // Tier 1: Link aggregators (check first)
      this.checkLinktree(identities.instagram || identities.primary),
      this.checkBeacons(identities.instagram || identities.primary),
      
      // Tier 2: Social platforms
      this.checkInstagram(identities.instagram || identities.primary),
      this.checkTikTok(identities.tiktok || identities.primary),
      this.checkYouTube(identities.youtube || identities.primary),
      this.checkTwitter(identities.twitter || identities.primary),
      
      // Tier 3: Other sources
      this.checkWebsite(identities.primary),
      this.checkAmazon(identities.primary)
    ];

    const results = await Promise.allSettled(checks);
    
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value)
      .filter(r => r !== null);
  }

  private async processAllLinks(results: PlatformResult[]): Promise<ProcessedLink[]> {
    const allLinks = results.flatMap(r => r.data?.links || []);
    
    // Expand all URLs in parallel
    const expansionPromises = allLinks.map(async link => {
      const expanded = await this.linkExpander.expandUrl(link.originalUrl);
      return {
        ...link,
        expandedUrl: expanded,
        type: this.linkExpander.classifyLink(expanded),
        brand: this.detectBrand(expanded, link.title)
      };
    });
    
    return Promise.all(expansionPromises);
  }

  private generateIntelligence(analysis: AnalysisResult): CreatorIntelligence {
    return {
      primaryPlatform: this.detectPrimaryPlatform(analysis),
      totalReach: this.calculateTotalReach(analysis),
      linkAggregatorStatus: this.detectLinkAggregator(analysis),
      recommendationForFaves: this.generateFavesRecommendation(analysis),
      competitorAnalysis: this.analyzeCompetitorUsage(analysis),
      growthPotential: this.estimateGrowthPotential(analysis)
    };
  }
}
```

## Deduplication Engine

```typescript
// src/intelligence/deduplicator.ts

export class LinkDeduplicator {
  deduplicate(links: ExtractedLink[]): DedupedLink[] {
    const linkMap = new Map<string, DedupedLink>();
    
    links.forEach(link => {
      const normalized = this.normalizeUrl(link.expandedUrl || link.originalUrl);
      
      if (linkMap.has(normalized)) {
        // Update existing entry
        const existing = linkMap.get(normalized)!;
        existing.sources.push(link.source);
        existing.occurrences++;
        existing.confidence = Math.max(existing.confidence, link.confidence);
      } else {
        // Create new entry
        linkMap.set(normalized, {
          url: normalized,
          originalUrls: [link.originalUrl],
          sources: [link.source],
          title: link.title,
          type: link.type,
          brand: link.brand,
          occurrences: 1,
          confidence: link.confidence,
          firstSeen: new Date()
        });
      }
    });
    
    return Array.from(linkMap.values());
  }

  private normalizeUrl(url: string): string {
    // Remove tracking parameters
    // Normalize protocol
    // Remove trailing slashes
    // Sort query parameters
    
    try {
      const parsed = new URL(url);
      
      // Remove common tracking params
      ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'fbclid'].forEach(param => {
        parsed.searchParams.delete(param);
      });
      
      // Normalize
      return parsed.toString().toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  }
}