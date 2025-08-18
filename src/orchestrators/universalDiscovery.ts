import { LinktreeExtractor } from '../extractors/linktree';
import { BeaconsExtractor } from '../extractors/beacons';
import { TikTokExtractor } from '../extractors/social/tiktok';
import { YouTubeExtractor } from '../extractors/social/youtube';
import { TwitterExtractor } from '../extractors/social/twitter';
import { InstagramMobileAPIExtractor } from '../extractors/instagramMobileAPI';
import { WebsiteDiscovery, WebsiteResult } from '../extractors/website';
import { AmazonStorefrontExtractor, AmazonStorefrontResult } from '../extractors/amazonStorefront';
import { LinkExpander } from '../processors/linkExpander';
import { LinkDeduplicator, DedupedLink } from '../intelligence/deduplicator';
import { CreatorIntelligenceAnalyzer, CreatorIntelligenceReport } from '../intelligence/creatorAnalyzer';
import { ExtractedLink, LinkType } from '../extractors/types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

export type Platform = 'linktree' | 'beacons' | 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'website' | 'amazon_storefront';

export interface PlatformData {
  platform: Platform;
  success: boolean;
  profile?: any;
  links: ExtractedLink[];
  metrics?: {
    followers?: number;
    engagement?: number;
  };
  websiteData?: WebsiteResult;
  amazonStorefrontData?: AmazonStorefrontResult;
  error?: string;
  processingTime: number;
  v2Metadata?: {
    version: 'v1' | 'v2';
    method?: string;
    postsRetrieved?: number;
    affiliatesFound?: number;
    userId?: string;
    nextCursor?: string;
    extractorVersion?: string;
  };
}

export interface ProcessedLink extends ExtractedLink {
  expandedUrl: string;
  isAffiliate: boolean;
  affiliateId?: string;
  brand?: string;
  duplicateOf?: string;
}

export interface UniversalCreatorProfile {
  searchQuery: string;
  platforms: { [platform: string]: PlatformData };
  allLinks: ProcessedLink[];
  dedupedLinks: DedupedLink[];
  intelligenceReport: CreatorIntelligenceReport;
  summary: {
    totalLinks: number;
    uniqueLinks: number;
    platformsFound: string[];
    totalReach: number;
    primaryPlatform: string;
    usingCompetitor: string | null;
  };
  recommendation: {
    priority: 'high' | 'medium' | 'low';
    reason: string;
    estimatedValue: number;
  };
  metadata: {
    searchedAt: Date;
    processingTime: number;
    warnings: string[];
    deduplicationReport?: any;
  };
}

export interface DiscoveryOptions {
  platforms?: Platform[];
  timeout?: number;
  handles?: { [platform: string]: string };
  youtubeApiKey?: string;
}

export class UniversalCreatorDiscovery {
  private linktreeExtractor = new LinktreeExtractor();
  private beaconsExtractor = new BeaconsExtractor();
  private tiktokExtractor = new TikTokExtractor();
  private twitterExtractor = new TwitterExtractor();
  private instagramExtractor = new InstagramMobileAPIExtractor();
  private websiteDiscovery = new WebsiteDiscovery();
  private amazonStorefrontExtractor = new AmazonStorefrontExtractor();
  private linkExpander = new LinkExpander();
  private linkDeduplicator = new LinkDeduplicator();
  private intelligenceAnalyzer = new CreatorIntelligenceAnalyzer();
  private youtubeExtractor?: YouTubeExtractor;
  
  constructor(youtubeApiKey?: string, scraperAPIKey?: string) {
    if (youtubeApiKey) {
      this.youtubeExtractor = new YouTubeExtractor(youtubeApiKey);
    }
    
    // Initialize Instagram V2 extractor with ScraperAPI fallback
    this.instagramExtractor = new InstagramMobileAPIExtractor(scraperAPIKey);
  }
  
  async discoverCreator(query: string, options: DiscoveryOptions = {}): Promise<UniversalCreatorProfile> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    console.log(`\n🚀 Universal Creator Discovery: ${query}`);
    console.log('='.repeat(60));
    
    try {
      // Step 1: Resolve identities across platforms
      const handles = this.resolveHandles(query, options.handles);
      console.log(`🔍 Resolved handles:`, handles);
      
      // Step 2: Run all extractors in parallel
      const platformResults = await this.runAllExtractors(handles, options);
      
      // Step 3: Process and expand all links
      const processedLinks = await this.processAllLinks(platformResults);
      
      // Step 4: Deduplicate links intelligently
      const dedupedLinks = this.linkDeduplicator.deduplicate(processedLinks);
      const deduplicationReport = this.linkDeduplicator.generateDeduplicationReport(processedLinks, dedupedLinks);
      
      // Convert deduped links back to ProcessedLink format for compatibility
      const uniqueLinks = this.convertDedupedToProcessed(dedupedLinks);
      
      // Step 5: Generate intelligence report
      const tempProfile: UniversalCreatorProfile = {
        searchQuery: query,
        platforms: this.formatPlatformResults(platformResults),
        allLinks: uniqueLinks,
        dedupedLinks,
        intelligenceReport: {} as any,
        summary: {} as any,
        recommendation: {} as any,
        metadata: {} as any
      };
      
      const intelligenceReport = this.intelligenceAnalyzer.analyze(tempProfile, dedupedLinks);
      
      // Step 6: Generate summary and recommendation
      const summary = this.generateSummary(platformResults, processedLinks, uniqueLinks);
      const recommendation = this.generateRecommendationFromIntelligence(intelligenceReport);
      
      console.log(`\n✅ Discovery complete in ${Date.now() - startTime}ms`);
      
      return {
        searchQuery: query,
        platforms: this.formatPlatformResults(platformResults),
        allLinks: uniqueLinks,
        dedupedLinks,
        intelligenceReport,
        summary,
        recommendation,
        metadata: {
          searchedAt: new Date(),
          processingTime: Date.now() - startTime,
          warnings,
          deduplicationReport
        }
      };
      
    } catch (error) {
      console.error('❌ Universal discovery failed:', error);
      throw error;
    }
  }
  
  private resolveHandles(query: string, manualHandles?: { [platform: string]: string }) {
    // Clean the query
    const cleanQuery = query.replace('@', '').toLowerCase();
    
    // Default: use same handle across platforms
    const handles = {
      linktree: cleanQuery,
      beacons: cleanQuery,
      instagram: cleanQuery,
      tiktok: cleanQuery,
      youtube: cleanQuery,
      twitter: cleanQuery,
      website: cleanQuery,
      amazon_storefront: cleanQuery
    };
    
    // Override with manual handles if provided
    if (manualHandles) {
      Object.assign(handles, manualHandles);
    }
    
    return handles;
  }
  
  private async runAllExtractors(handles: any, options: DiscoveryOptions): Promise<PlatformData[]> {
    console.log(`\n🎯 Checking all platforms in parallel...`);
    
    const timeout = options.timeout || 15000;
    const platformsToCheck = options.platforms || ['linktree', 'beacons', 'instagram', 'tiktok', 'youtube', 'twitter', 'website', 'amazon_storefront'];
    
    const extractorPromises = platformsToCheck.map(async (platform): Promise<PlatformData> => {
      const startTime = Date.now();
      
      try {
        console.log(`  🔄 Starting ${platform}...`);
        
        let result;
        switch (platform) {
          case 'linktree':
            const linktreeUrl = `https://linktr.ee/${handles.linktree}`;
            const linktreeLinks = await Promise.race([
              this.linktreeExtractor.extractLinks(linktreeUrl),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'linktree' as Platform,
              success: true,
              links: linktreeLinks,
              processingTime: Date.now() - startTime
            };
            break;
            
          case 'beacons':
            const beaconsUrl = `https://beacons.ai/${handles.beacons}`;
            const beaconsLinks = await Promise.race([
              this.beaconsExtractor.extractLinks(beaconsUrl),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'beacons' as Platform,
              success: true,
              links: beaconsLinks,
              processingTime: Date.now() - startTime
            };
            break;
            
          case 'instagram':
            const instagramResult = await Promise.race([
              this.instagramExtractor.extract(handles.instagram, {
                detectAffiliates: true,
                maxPosts: 18,
                useFallback: true
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            
            const profile = instagramResult.success ? instagramResult.profile : null;
            const bioLink = profile?.bioLink;
            const followerCount = profile?.followers || 0;
            
            result = {
              platform: 'instagram' as Platform,
              success: instagramResult.success,
              profile: profile,
              links: bioLink ? [{
                title: 'Instagram Bio Link',
                originalUrl: bioLink,
                expandedUrl: '',
                type: LinkType.UNKNOWN,
                source: 'bio' as const,
                confidence: 90
              }] : [],
              metrics: { 
                followers: followerCount,
                engagement: profile?.posts?.length || 0
              },
              processingTime: Date.now() - startTime,
              v2Metadata: {
                version: 'v2' as const,
                method: instagramResult.method || 'mobile_api',
                postsRetrieved: profile?.posts?.length || 0,
                affiliatesFound: profile?.affiliateAnalysis?.totalAffiliates || 0
              }
            };
            break;
            
          case 'tiktok':
            const tiktokResult = await Promise.race([
              this.tiktokExtractor.extract(handles.tiktok),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'tiktok' as Platform,
              success: tiktokResult.success,
              profile: tiktokResult.profile,
              links: tiktokResult.links || [],
              metrics: { followers: tiktokResult.profile?.followerCount || 0 },
              processingTime: Date.now() - startTime
            };
            break;
            
          case 'youtube':
            if (!this.youtubeExtractor) {
              throw new Error('YouTube API key not provided');
            }
            const youtubeResult = await Promise.race([
              this.youtubeExtractor.extract(handles.youtube),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'youtube' as Platform,
              success: youtubeResult.success,
              profile: youtubeResult.profile,
              links: youtubeResult.links || [],
              metrics: { 
                followers: youtubeResult.metrics?.subscribers || 0,
                engagement: youtubeResult.metrics?.totalViews || 0
              },
              processingTime: Date.now() - startTime
            };
            break;
            
          case 'twitter':
            const twitterResult = await Promise.race([
              this.twitterExtractor.extract(handles.twitter),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'twitter' as Platform,
              success: twitterResult.success,
              profile: twitterResult.profile,
              links: twitterResult.links || [],
              metrics: { followers: twitterResult.profile?.followerCount || 0 },
              processingTime: Date.now() - startTime
            };
            break;
            
          case 'website':
            const websiteResult = await Promise.race([
              this.websiteDiscovery.discoverWebsite(handles.website || handles.instagram || handles.linktree),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'website' as Platform,
              success: websiteResult.success,
              links: websiteResult.links || [],
              websiteData: websiteResult,
              processingTime: Date.now() - startTime
            };
            break;
            
          case 'amazon_storefront':
            const amazonResult = await Promise.race([
              this.amazonStorefrontExtractor.extractStorefront(handles.amazon_storefront || handles.instagram || handles.linktree),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]) as any;
            result = {
              platform: 'amazon_storefront' as Platform,
              success: amazonResult.success,
              links: amazonResult.links || [],
              amazonStorefrontData: amazonResult,
              processingTime: Date.now() - startTime
            };
            break;
            
          default:
            throw new Error(`Unknown platform: ${platform}`);
        }
        
        console.log(`  ✅ ${platform}: ${result.links.length} links (${result.processingTime}ms)`);
        return result;
        
      } catch (error) {
        console.log(`  ❌ ${platform}: ${error}`);
        return {
          platform: platform as Platform,
          success: false,
          links: [],
          error: String(error),
          processingTime: Date.now() - startTime
        };
      }
    });
    
    const results = await Promise.allSettled(extractorPromises);
    
    return results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);
  }
  
  private async processAllLinks(platformResults: PlatformData[]): Promise<ProcessedLink[]> {
    const allLinks = platformResults.flatMap(r => r.links);
    
    if (allLinks.length === 0) {
      return [];
    }
    
    console.log(`\n🔄 Processing ${allLinks.length} links...`);
    
    // Expand URLs in parallel
    const urls = allLinks.map(link => link.originalUrl);
    const expandedUrls = await this.linkExpander.expandMultipleUrls(urls);
    
    // Process each link with expanded data
    const processedLinks: ProcessedLink[] = allLinks.map(link => {
      const expandedUrl = expandedUrls[link.originalUrl] || link.originalUrl;
      const affiliateInfo = this.linkExpander.detectAffiliateParams(expandedUrl);
      const linkType = this.linkExpander.classifyLinkType(expandedUrl);
      const brand = this.linkExpander.extractBrandFromUrl(expandedUrl);
      
      return {
        ...link,
        expandedUrl,
        type: linkType,
        isAffiliate: affiliateInfo.isAffiliate,
        affiliateId: affiliateInfo.affiliateId,
        brand
      };
    });
    
    console.log(`✅ Processed ${processedLinks.length} links`);
    return processedLinks;
  }
  
  private convertDedupedToProcessed(dedupedLinks: DedupedLink[]): ProcessedLink[] {
    return dedupedLinks.map(link => ({
      title: link.title,
      originalUrl: link.originalUrls[0],
      expandedUrl: link.url,
      type: link.type as any,
      source: link.sources[0] as any,
      confidence: link.confidence,
      isAffiliate: link.isAffiliate,
      affiliateId: link.affiliateId,
      brand: link.brand
    }));
  }
  
  private normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Remove common tracking parameters
      const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
      trackingParams.forEach(param => parsed.searchParams.delete(param));
      
      // Normalize
      return parsed.toString().toLowerCase().replace(/\/$/, '');
    } catch {
      return url.toLowerCase().trim();
    }
  }
  
  private generateSummary(platformResults: PlatformData[], allLinks: ProcessedLink[], uniqueLinks: ProcessedLink[]) {
    const successfulPlatforms = platformResults.filter(r => r.success);
    const platformsFound = successfulPlatforms.map(r => r.platform);
    
    // Calculate total reach
    const totalReach = successfulPlatforms.reduce((sum, platform) => {
      return sum + (platform.metrics?.followers || 0);
    }, 0);
    
    // Find primary platform (most followers)
    const primaryPlatform = successfulPlatforms.reduce((max, platform) => {
      const followers = platform.metrics?.followers || 0;
      const maxFollowers = max.metrics?.followers || 0;
      return followers > maxFollowers ? platform : max;
    }, successfulPlatforms[0] || { platform: 'unknown', metrics: { followers: 0 } }).platform;
    
    // Detect competitor usage
    let usingCompetitor = null;
    if (platformResults.find(r => r.platform === 'linktree' && r.success && r.links.length > 0)) {
      usingCompetitor = 'Linktree';
    } else if (platformResults.find(r => r.platform === 'beacons' && r.success && r.links.length > 0)) {
      usingCompetitor = 'Beacons';
    }
    
    return {
      totalLinks: allLinks.length,
      uniqueLinks: uniqueLinks.length,
      platformsFound,
      totalReach,
      primaryPlatform,
      usingCompetitor
    };
  }
  
  private generateRecommendationFromIntelligence(intelligenceReport: CreatorIntelligenceReport) {
    return {
      priority: 'medium' as const, // Default priority since favesPriority removed
      reason: intelligenceReport.actionableInsights.personalizedPitch,
      estimatedValue: intelligenceReport.valueEstimation.totalValue
    };
  }
  
  private estimateValue(totalReach: number, linkCount: number): number {
    // Simple estimation: $0.10 per follower per year for affiliate revenue
    // Multiply by link count factor
    const baseValue = totalReach * 0.10;
    const linkMultiplier = Math.min(linkCount / 10, 2); // Cap at 2x
    return Math.round(baseValue * linkMultiplier);
  }
  
  private formatPlatformResults(results: PlatformData[]): { [platform: string]: PlatformData } {
    const formatted: { [platform: string]: PlatformData } = {};
    
    results.forEach(result => {
      formatted[result.platform] = result;
    });
    
    return formatted;
  }
  
  async cleanup(): Promise<void> {
    await Promise.all([
      this.linktreeExtractor.close(),
      this.beaconsExtractor.close(),
      this.tiktokExtractor.close(),
      this.twitterExtractor.close(),
      this.websiteDiscovery.close(),
      this.amazonStorefrontExtractor.close()
      // Instagram V2 extractor doesn't need cleanup (no browser)
    ]);
  }
}

// CLI Interface for Universal Discovery
async function main() {
  const query = process.argv[2];
  
  if (!query) {
    console.log('Usage: npm run discover <creator_name>');
    console.log('Examples:');
    console.log('  npm run discover MrBeast');
    console.log('  npm run discover "Emma Chamberlain"');
    console.log('  npm run discover therock  # Has Amazon Storefront!');
    console.log('  npm run discover daviddobrik  # Has website!');
    process.exit(1);
  }
  
  const youtubeApiKey = process.env.YOUTUBE_API_KEY;
  const scraperAPIKey = process.env.SCRAPER_API_KEY;
  const discovery = new UniversalCreatorDiscovery(youtubeApiKey, scraperAPIKey);
  
  try {
    const result = await discovery.discoverCreator(query);
    
    // Print beautiful summary
    console.log('\n📊 UNIVERSAL DISCOVERY RESULTS');
    console.log('═'.repeat(60));
    console.log(`Creator: ${result.searchQuery}`);
    console.log(`Total Links Found: ${result.summary.totalLinks}`);
    console.log(`Unique Links (after dedup): ${result.summary.uniqueLinks}`);
    console.log(`Platforms Found: ${result.summary.platformsFound.join(', ')}`);
    console.log(`Total Reach: ${result.summary.totalReach.toLocaleString()} followers`);
    console.log(`Primary Platform: ${result.summary.primaryPlatform}`);
    console.log(`Using Competitor: ${result.summary.usingCompetitor || 'None'}`);
    
    console.log('\n🎯 ANALYSIS SUMMARY');
    console.log('─'.repeat(30));
    console.log(`Priority: ${result.recommendation.priority.toUpperCase()}`);
    console.log(`Reason: ${result.recommendation.reason}`);
    console.log(`Estimated Annual Value: $${result.recommendation.estimatedValue.toLocaleString()}`);
    
    if (result.summary.uniqueLinks > 0) {
      console.log('\n🔗 TOP UNIQUE LINKS');
      console.log('─'.repeat(30));
      result.allLinks.slice(0, 10).forEach((link, i) => {
        const affiliateTag = link.isAffiliate ? ' 🎯' : '';
        const brandTag = link.brand ? ` (${link.brand})` : '';
        console.log(`${i + 1}. ${link.title}${brandTag}${affiliateTag}`);
        console.log(`   ${link.expandedUrl}`);
      });
      
      if (result.allLinks.length > 10) {
        console.log(`   ... and ${result.allLinks.length - 10} more links`);
      }
    }
    
    console.log(`\n⏱️ Processing completed in ${result.metadata.processingTime}ms`);
    
    if (result.metadata.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.metadata.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    // Save results
    const fs = require('fs').promises;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${query.replace(/\s+/g, '_')}_universal_${timestamp}.json`;
    const filepath = `./output/${filename}`;
    
    await fs.writeFile(filepath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Full results saved to: ${filepath}`);
    
  } catch (error) {
    console.error('❌ Discovery failed:', error);
    process.exit(1);
  } finally {
    await discovery.cleanup();
  }
}

if (require.main === module) {
  main();
}