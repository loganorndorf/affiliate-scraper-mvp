// ScraperAPI Fallback Client for Instagram

import { InstagramProfile, InstagramPost, InstagramExtractionResult } from './instagramMobileAPI';
import { AffiliateDetector, AffiliateDetectionResult } from './affiliateDetector';

export interface ScraperAPIConfig {
  apiKey: string;
  maxRetries?: number;
  timeout?: number;
  renderJS?: boolean;
  premiumProxy?: boolean;
  geoCode?: string;
  deviceType?: 'desktop' | 'mobile';
}

export interface ScraperAPIUsage {
  requestsMade: number;
  successfulRequests: number;
  creditsUsed: number;
  costUSD: number;
  avgResponseTime: number;
  successRate: number;
}

export interface ScraperAPIResponse {
  html: string;
  status: number;
  url: string;
  credits_used: number;
  credits_remaining: number;
  response_time_ms: number;
}

export class ScraperAPIClient {
  private readonly baseUrl = 'https://api.scraperapi.com';
  private readonly costPerRequest = 0.00029; // $0.00029 per request
  private config: Required<ScraperAPIConfig>;
  private usage: ScraperAPIUsage;
  private affiliateDetector = new AffiliateDetector();

  constructor(config: ScraperAPIConfig) {
    if (!config.apiKey) {
      throw new Error('ScraperAPI key is required');
    }

    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries || 3,
      timeout: config.timeout || 30000,
      renderJS: config.renderJS || false,
      premiumProxy: config.premiumProxy || false,
      geoCode: config.geoCode || 'us',
      deviceType: config.deviceType || 'mobile'
    };

    this.usage = {
      requestsMade: 0,
      successfulRequests: 0,
      creditsUsed: 0,
      costUSD: 0,
      avgResponseTime: 0,
      successRate: 0
    };
  }

  async extractProfile(username: string, options: {
    detectAffiliates?: boolean;
    maxPosts?: number;
  } = {}): Promise<InstagramExtractionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🌐 Using ScraperAPI fallback for @${username}...`);
      
      const instagramUrl = `https://www.instagram.com/${username}/`;
      const html = await this.scrapeUrl(instagramUrl);
      
      const profile = this.parseInstagramHTML(html, username);
      
      // Detect affiliates if requested
      if (options.detectAffiliates) {
        console.log(`🔍 Analyzing affiliate links for @${username} (ScraperAPI)...`);
        
        for (const post of profile.posts) {
          post.affiliateLinks = await this.affiliateDetector.detectInPost({
            caption: post.caption,
            url: post.url
          });
        }
        
        profile.affiliateAnalysis = await this.affiliateDetector.analyzeProfile(
          profile.posts,
          profile.bio,
          profile.bioLink
        );
      }

      const responseTime = Date.now() - startTime;
      this.updateUsageStats(responseTime, true);

      return {
        success: true,
        method: 'scraper_api',
        profile,
        metrics: {
          responseTime,
          postsRetrieved: profile.posts.length,
          affiliatesFound: profile.affiliateAnalysis?.totalAffiliates || 0
        }
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateUsageStats(responseTime, false);

      return {
        success: false,
        method: 'scraper_api',
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          responseTime
        }
      };
    }
  }

  private async scrapeUrl(url: string): Promise<string> {
    const params = new URLSearchParams({
      api_key: this.config.apiKey,
      url: url,
      render: this.config.renderJS.toString(),
      premium: this.config.premiumProxy.toString(),
      country_code: this.config.geoCode,
      device_type: this.config.deviceType
    });

    const scraperUrl = `${this.baseUrl}?${params.toString()}`;
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`🌐 ScraperAPI attempt ${attempt}/${this.config.maxRetries} for ${url}`);
        
        const response = await fetch(scraperUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
          }
        });

        if (response.status === 401) {
          throw new Error('Invalid ScraperAPI key');
        }

        if (response.status === 402) {
          throw new Error('ScraperAPI credits exhausted');
        }

        if (response.status === 429) {
          console.log(`⏰ ScraperAPI rate limited on attempt ${attempt}, waiting...`);
          await this.exponentialBackoff(attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(`ScraperAPI HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        
        // Track credits from headers if available
        const creditsUsed = response.headers.get('X-Credits-Used');
        const creditsRemaining = response.headers.get('X-Credits-Remaining');
        
        if (creditsUsed) {
          console.log(`💰 Credits used: ${creditsUsed} | Remaining: ${creditsRemaining || 'Unknown'}`);
        }

        return html;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.config.maxRetries) {
          console.log(`❌ ScraperAPI attempt ${attempt} failed: ${lastError.message}, retrying...`);
          await this.exponentialBackoff(attempt);
        }
      }
    }

    throw new Error(`All ${this.config.maxRetries} ScraperAPI attempts failed. Last error: ${lastError?.message}`);
  }

  private parseInstagramHTML(html: string, username: string): InstagramProfile {
    // This is a simplified HTML parser - in production you'd want more robust parsing
    console.log(`📋 Parsing HTML response for @${username}...`);
    
    try {
      // Look for JSON data embedded in the HTML
      const jsonMatch = html.match(/window\._sharedData\s*=\s*({.*?});/);
      if (jsonMatch) {
        const sharedData = JSON.parse(jsonMatch[1]);
        const userData = sharedData.entry_data?.ProfilePage?.[0]?.graphql?.user;
        
        if (userData) {
          return this.parseFromSharedData(userData, username);
        }
      }

      // Fallback to HTML parsing
      return this.parseFromHTML(html, username);

    } catch (error) {
      console.log(`⚠️ HTML parsing failed: ${error instanceof Error ? error.message : String(error)}`);
      
      // Return minimal profile with error handling
      return {
        username,
        fullName: '',
        bio: '',
        followers: 0,
        following: 0,
        isVerified: false,
        profilePic: '',
        posts: [],
        hasMorePosts: false,
        userId: ''
      };
    }
  }

  private parseFromSharedData(userData: any, username: string): InstagramProfile {
    const posts = userData.edge_owner_to_timeline_media?.edges?.map((edge: any) => {
      const node = edge.node;
      const caption = node.edge_media_to_caption?.edges?.[0]?.node?.text || '';
      
      return {
        id: node.id,
        shortcode: node.shortcode,
        caption,
        imageUrl: node.display_url,
        isVideo: node.is_video || false,
        videoUrl: node.video_url,
        likes: node.edge_liked_by?.count || 0,
        comments: node.edge_media_to_comment?.count || 0,
        timestamp: new Date(node.taken_at_timestamp * 1000),
        url: `https://www.instagram.com/p/${node.shortcode}/`
      };
    }) || [];

    return {
      username: userData.username || username,
      fullName: userData.full_name || '',
      bio: userData.biography || '',
      bioLink: userData.external_url || undefined,
      followers: userData.edge_followed_by?.count || 0,
      following: userData.edge_follow?.count || 0,
      isVerified: userData.is_verified || false,
      profilePic: userData.profile_pic_url_hd || '',
      posts,
      hasMorePosts: userData.edge_owner_to_timeline_media?.page_info?.has_next_page || false,
      nextCursor: userData.edge_owner_to_timeline_media?.page_info?.end_cursor,
      userId: userData.id || ''
    };
  }

  private parseFromHTML(html: string, username: string): InstagramProfile {
    // Fallback HTML parsing when JSON data isn't available
    const bioMatch = html.match(/<meta property="og:description" content="([^"]+)"/);
    const titleMatch = html.match(/<meta property="og:title" content="([^"]+)"/);
    
    let bio = '';
    let followers = 0;
    let fullName = '';

    if (bioMatch && bioMatch[1]) {
      bio = bioMatch[1];
    }

    if (titleMatch && titleMatch[1]) {
      fullName = titleMatch[1].split('(')[0]?.trim() || '';
      
      // Try to extract follower count from title
      const followerMatch = titleMatch[1].match(/(\d+(?:\.\d+)?)\s*([KMB])\s*Followers/i);
      if (followerMatch) {
        const num = parseFloat(followerMatch[1]);
        const multiplier = followerMatch[2].toUpperCase();
        followers = multiplier === 'K' ? num * 1000 : 
                   multiplier === 'M' ? num * 1000000 : 
                   multiplier === 'B' ? num * 1000000000 : num;
      }
    }

    return {
      username,
      fullName,
      bio,
      followers: Math.round(followers),
      following: 0,
      isVerified: false,
      profilePic: '',
      posts: [], // HTML parsing for posts is complex, would need more work
      hasMorePosts: false,
      userId: ''
    };
  }

  private updateUsageStats(responseTime: number, success: boolean): void {
    this.usage.requestsMade++;
    if (success) this.usage.successfulRequests++;
    
    this.usage.creditsUsed++;
    this.usage.costUSD += this.costPerRequest;
    
    // Update average response time
    const totalTime = (this.usage.avgResponseTime * (this.usage.requestsMade - 1)) + responseTime;
    this.usage.avgResponseTime = totalTime / this.usage.requestsMade;
    
    this.usage.successRate = (this.usage.successfulRequests / this.usage.requestsMade) * 100;
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = 1000 * Math.pow(2, attempt - 1) + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  getUsageStats(): ScraperAPIUsage {
    return { ...this.usage };
  }

  getCostEstimate(monthlyProfiles: number): number {
    const requestsPerProfile = 1; // One request per profile
    const monthlyRequests = monthlyProfiles * requestsPerProfile;
    return monthlyRequests * this.costPerRequest;
  }

  // Test if API key is valid
  async validateApiKey(): Promise<{ valid: boolean; error?: string; creditsRemaining?: number }> {
    try {
      // Test with a simple request
      const testUrl = 'https://httpbin.org/json';
      const params = new URLSearchParams({
        api_key: this.config.apiKey,
        url: testUrl
      });

      const response = await fetch(`${this.baseUrl}?${params.toString()}`);
      
      if (response.status === 401) {
        return { valid: false, error: 'Invalid API key' };
      }
      
      if (response.status === 402) {
        return { valid: false, error: 'No credits remaining' };
      }

      if (response.ok) {
        const creditsRemaining = response.headers.get('X-Credits-Remaining');
        return { 
          valid: true, 
          creditsRemaining: creditsRemaining ? parseInt(creditsRemaining) : undefined 
        };
      }

      return { valid: false, error: `HTTP ${response.status}` };

    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  }
}

// Enhanced Instagram extractor with ScraperAPI fallback
export class InstagramExtractorWithFallback {
  private mobileAPIExtractor: any; // Would import InstagramMobileAPIExtractor
  private scraperAPIClient?: ScraperAPIClient;
  private fallbackEnabled: boolean = false;

  constructor(scraperAPIKey?: string) {
    if (scraperAPIKey) {
      this.scraperAPIClient = new ScraperAPIClient({
        apiKey: scraperAPIKey,
        deviceType: 'mobile',
        renderJS: false // Instagram data is in HTML, no JS needed
      });
      this.fallbackEnabled = true;
    }
  }

  async extract(username: string, options: {
    detectAffiliates?: boolean;
    maxPosts?: number;
    forceFallback?: boolean;
  } = {}): Promise<InstagramExtractionResult> {
    
    // Try mobile API first (unless forced to use fallback)
    if (!options.forceFallback && this.mobileAPIExtractor) {
      console.log(`📱 Attempting mobile API for @${username}...`);
      
      try {
        const result = await this.mobileAPIExtractor.extract(username, options);
        
        if (result.success) {
          console.log(`✅ Mobile API succeeded for @${username}`);
          return result;
        }
        
        console.log(`⚠️ Mobile API failed: ${result.error}`);
        
      } catch (error) {
        console.log(`❌ Mobile API exception: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Fallback to ScraperAPI
    if (this.fallbackEnabled && this.scraperAPIClient) {
      console.log(`🌐 Falling back to ScraperAPI for @${username}...`);
      
      return await this.scraperAPIClient.extractProfile(username, options);
    }

    return {
      success: false,
      method: 'none_available',
      error: 'All extraction methods failed or unavailable',
      metrics: {
        responseTime: 0
      }
    };
  }

  async validateSetup(): Promise<{
    mobileAPI: { available: boolean; error?: string };
    scraperAPI: { available: boolean; error?: string; creditsRemaining?: number };
  }> {
    const result: {
      mobileAPI: { available: boolean; error?: string };
      scraperAPI: { available: boolean; error?: string; creditsRemaining?: number };
    } = {
      mobileAPI: { available: false, error: 'Not implemented in this test' },
      scraperAPI: { available: false, error: 'Not configured' }
    };

    // Test ScraperAPI if configured
    if (this.scraperAPIClient) {
      const validation = await this.scraperAPIClient.validateApiKey();
      result.scraperAPI = {
        available: validation.valid,
        error: validation.error,
        creditsRemaining: validation.creditsRemaining
      };
    }

    return result;
  }

  getUsageReport(): {
    scraperAPI?: ScraperAPIUsage;
    recommendation: string;
  } {
    const report: any = {};

    if (this.scraperAPIClient) {
      report.scraperAPI = this.scraperAPIClient.getUsageStats();
    }

    // Generate recommendation
    let recommendation = 'Continue with free methods';
    
    if (report.scraperAPI && report.scraperAPI.successRate > 90) {
      recommendation = 'ScraperAPI providing excellent results';
    } else if (report.scraperAPI && report.scraperAPI.costUSD > 10) {
      recommendation = 'Monitor ScraperAPI costs - consider optimizing usage';
    }

    return { ...report, recommendation };
  }
}

// Test function
async function testScraperAPIFallback() {
  console.log('🧪 Testing ScraperAPI Fallback\n');
  
  // Check if API key is available
  const apiKey = process.env.SCRAPER_API_KEY;
  
  if (!apiKey) {
    console.log('❌ SCRAPER_API_KEY environment variable not set');
    console.log('💡 To test ScraperAPI fallback:');
    console.log('   1. Sign up at https://www.scraperapi.com/');
    console.log('   2. Get your API key');
    console.log('   3. Set environment variable: export SCRAPER_API_KEY=your_key');
    console.log('   4. Re-run this test');
    return;
  }

  try {
    const extractor = new InstagramExtractorWithFallback(apiKey);
    
    // Validate setup
    console.log('🔍 Validating ScraperAPI setup...');
    const validation = await extractor.validateSetup();
    
    console.log('Setup Status:');
    console.log(`  ScraperAPI: ${validation.scraperAPI.available ? '✅' : '❌'} ${validation.scraperAPI.error || ''}`);
    if (validation.scraperAPI.creditsRemaining) {
      console.log(`  Credits Remaining: ${validation.scraperAPI.creditsRemaining}`);
    }

    if (!validation.scraperAPI.available) {
      console.log('❌ ScraperAPI not available, cannot test fallback');
      return;
    }

    // Test extraction with forced fallback
    const testUsers = ['cristiano'];
    
    for (const username of testUsers) {
      console.log(`\n🧪 Testing ScraperAPI extraction for @${username}...`);
      
      const result = await extractor.extract(username, {
        forceFallback: true,
        detectAffiliates: true
      });

      if (result.success && result.profile) {
        const profile = result.profile;
        console.log(`✅ ScraperAPI Success for @${username}:`);
        console.log(`   Method: ${result.method}`);
        console.log(`   Full Name: ${profile.fullName}`);
        console.log(`   Bio: ${profile.bio.substring(0, 80)}...`);
        console.log(`   Followers: ${profile.followers.toLocaleString()}`);
        console.log(`   Posts: ${profile.posts.length}`);
        console.log(`   Response Time: ${result.metrics.responseTime}ms`);
        
        if (profile.affiliateAnalysis) {
          console.log(`   Affiliates: ${profile.affiliateAnalysis.totalAffiliates}`);
        }
        
      } else {
        console.log(`❌ ScraperAPI failed for @${username}: ${result.error}`);
      }
    }

    // Show usage report
    console.log('\n💰 Usage Report:');
    const report = extractor.getUsageReport();
    if (report.scraperAPI) {
      const usage = report.scraperAPI;
      console.log(`  Requests Made: ${usage.requestsMade}`);
      console.log(`  Success Rate: ${usage.successRate.toFixed(1)}%`);
      console.log(`  Credits Used: ${usage.creditsUsed}`);
      console.log(`  Cost: $${usage.costUSD.toFixed(4)}`);
      console.log(`  Avg Response Time: ${Math.round(usage.avgResponseTime)}ms`);
    }
    console.log(`  Recommendation: ${report.recommendation}`);

  } catch (error) {
    console.error('❌ Test failed:', error instanceof Error ? error.message : String(error));
  }
}

// Export classes and test function
export { testScraperAPIFallback };

// Run test if executed directly
if (require.main === module) {
  testScraperAPIFallback().catch(console.error);
}