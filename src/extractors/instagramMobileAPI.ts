// Using Node.js built-in fetch (Node 18+)
import { AffiliateDetector, AffiliateInfo, AffiliateDetectionResult } from './affiliateDetector';
import { InstagramGraphQLClient, PaginationOptions } from './instagramGraphQL';
import { ScraperAPIClient } from './scraperAPIClient';

export interface InstagramPost {
  id: string;
  shortcode: string;
  caption: string;
  imageUrl: string;
  isVideo: boolean;
  videoUrl?: string;
  likes: number;
  comments: number;
  timestamp: Date;
  url: string;
  affiliateLinks?: AffiliateInfo[];
}

export interface InstagramProfile {
  username: string;
  fullName: string;
  bio: string;
  bioLink?: string;
  followers: number;
  following: number;
  isVerified: boolean;
  profilePic: string;
  posts: InstagramPost[];
  hasMorePosts: boolean;
  nextCursor?: string;
  userId: string;
  affiliateAnalysis?: AffiliateDetectionResult;
}

export interface InstagramExtractionResult {
  success: boolean;
  method: string;
  profile?: InstagramProfile;
  error?: string;
  metrics: {
    responseTime: number;
    postsRetrieved?: number;
    affiliatesFound?: number;
  };
}

interface InstagramMobileResponse {
  data: {
    user: {
      id: string;
      username: string;
      full_name: string;
      biography: string;
      bio_links?: Array<{
        title: string;
        url: string;
        link_type: string;
      }>;
      external_url?: string;
      follower_count?: number;
      following_count?: number;
      edge_followed_by?: { count: number };
      edge_follow?: { count: number };
      is_verified: boolean;
      profile_pic_url_hd: string;
      edge_owner_to_timeline_media: {
        count: number;
        edges: Array<{
          node: {
            id: string;
            shortcode: string;
            display_url: string;
            is_video: boolean;
            video_url?: string;
            taken_at_timestamp: number;
            edge_liked_by: { count: number };
            edge_media_to_comment: { count: number };
            edge_media_to_caption: {
              edges: Array<{
                node: {
                  text: string;
                };
              }>;
            };
          };
        }>;
        page_info: {
          has_next_page: boolean;
          end_cursor: string;
        };
      };
      [key: string]: any; // Allow for unknown fields
    };
  };
}

export class InstagramMobileAPIExtractor {
  private readonly baseUrl = 'https://i.instagram.com/api/v1';
  private readonly appId = '936619743392459';
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;
  private affiliateDetector = new AffiliateDetector();
  private graphqlClient = new InstagramGraphQLClient();
  private scraperAPIClient?: ScraperAPIClient;

  private mobileUserAgents = [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Android 12; Mobile; rv:108.0) Gecko/108.0 Firefox/108.0',
    'Mozilla/5.0 (Android 13; Mobile; LG-M255; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/108.0.5359.128 Mobile Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.1 Mobile/15E148 Safari/604.1'
  ];

  constructor(scraperAPIKey?: string) {
    if (scraperAPIKey) {
      this.scraperAPIClient = new ScraperAPIClient({
        apiKey: scraperAPIKey,
        deviceType: 'mobile',
        renderJS: false
      });
    }
  }

  async extract(username: string, options: { 
    detectAffiliates?: boolean; 
    maxPosts?: number;
    onProgress?: (current: number, target: number) => void;
    useFallback?: boolean;
  } = {}): Promise<InstagramExtractionResult> {
    const startTime = Date.now();
    
    try {
      const profile = await this.extractProfile(username);
      
      // Optionally get more posts via GraphQL pagination
      if (options.maxPosts && options.maxPosts > 12 && profile.hasMorePosts && profile.nextCursor) {
        console.log(`📄 Fetching additional posts (target: ${options.maxPosts} total)...`);
        
        const additionalPostsNeeded = options.maxPosts - profile.posts.length;
        const paginationResult = await this.graphqlClient.getMorePosts(
          profile.userId,
          profile.nextCursor,
          {
            maxPosts: additionalPostsNeeded,
            onProgress: options.onProgress
          }
        );
        
        if (paginationResult.posts.length > 0) {
          profile.posts.push(...paginationResult.posts);
          profile.hasMorePosts = paginationResult.hasMoreAvailable;
          profile.nextCursor = paginationResult.nextCursor;
          console.log(`📄 Successfully retrieved ${paginationResult.totalRetrieved} additional posts`);
        } else if (paginationResult.errors.length > 0) {
          console.log(`⚠️ GraphQL pagination failed: ${paginationResult.errors[0]}`);
        }
      }
      
      // Optionally detect affiliates
      if (options.detectAffiliates) {
        console.log(`🔍 Analyzing affiliate links for @${username}...`);
        
        // Detect affiliates in each post
        for (const post of profile.posts) {
          post.affiliateLinks = await this.affiliateDetector.detectInPost({
            caption: post.caption,
            url: post.url
          });
        }
        
        // Analyze overall profile
        profile.affiliateAnalysis = await this.affiliateDetector.analyzeProfile(
          profile.posts,
          profile.bio,
          profile.bioLink
        );
      }
      
      const affiliatesFound = profile.affiliateAnalysis?.totalAffiliates || 0;
      
      return {
        success: true,
        method: 'mobile_api',
        profile,
        metrics: {
          responseTime: Date.now() - startTime,
          postsRetrieved: profile.posts.length,
          affiliatesFound
        }
      };
      
    } catch (error) {
      // Try ScraperAPI fallback if configured and useFallback is enabled
      if (this.scraperAPIClient && options.useFallback) {
        console.log(`🌐 Mobile API failed, trying ScraperAPI fallback...`);
        
        try {
          return await this.scraperAPIClient.extractProfile(username, {
            detectAffiliates: options.detectAffiliates
          });
        } catch (fallbackError) {
          return {
            success: false,
            method: 'all_failed',
            error: `Mobile API: ${error instanceof Error ? error.message : String(error)}. ScraperAPI: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`,
            metrics: {
              responseTime: Date.now() - startTime
            }
          };
        }
      }
      
      return {
        success: false,
        method: 'mobile_api',
        error: error instanceof Error ? error.message : String(error),
        metrics: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  private async extractProfile(username: string): Promise<InstagramProfile> {
    const url = `${this.baseUrl}/users/web_profile_info/?username=${username}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const userAgent = this.getRandomUserAgent();
        console.log(`📱 Attempting Instagram mobile API extraction for @${username} (attempt ${attempt}/${this.maxRetries})`);
        
        const response = await fetch(url, {
          headers: {
            'x-ig-app-id': this.appId,
            'User-Agent': userAgent,
            'Accept': 'application/json',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site'
          }
        });

        if (response.status === 429) {
          console.log(`⏰ Rate limited on attempt ${attempt}, waiting...`);
          await this.exponentialBackoff(attempt);
          continue;
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: InstagramMobileResponse = await response.json() as InstagramMobileResponse;
        
        if (!data.data?.user) {
          throw new Error('Invalid response structure - missing user data');
        }

        // Success - got valid response

        return this.parseProfileData(data, username);
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.log(`❌ Attempt ${attempt} failed: ${lastError.message}, retrying...`);
          await this.exponentialBackoff(attempt);
        }
      }
    }
    
    throw new Error(`All ${this.maxRetries} attempts failed. Last error: ${lastError?.message}`);
  }

  private parseProfileData(data: InstagramMobileResponse, username: string): InstagramProfile {
    const user = data.data.user;
    
    // Extract bio link from bio_links array or external_url
    let bioLink: string | undefined;
    if (user.bio_links && user.bio_links.length > 0) {
      bioLink = user.bio_links[0].url;
    } else if (user.external_url) {
      bioLink = user.external_url;
    }
    
    // Try multiple fields for follower count
    let followers = 0;
    if (user.follower_count !== undefined) {
      followers = user.follower_count;
    } else if (user.edge_followed_by?.count !== undefined) {
      followers = user.edge_followed_by.count;
    }
    
    // Try multiple fields for following count
    let following = 0;
    if (user.following_count !== undefined) {
      following = user.following_count;
    } else if (user.edge_follow?.count !== undefined) {
      following = user.edge_follow.count;
    }
    
    return {
      username: user.username,
      fullName: user.full_name || '',
      bio: user.biography || '',
      bioLink,
      followers,
      following,
      isVerified: user.is_verified || false,
      profilePic: user.profile_pic_url_hd || '',
      posts: this.parseFirstPosts(user.edge_owner_to_timeline_media),
      hasMorePosts: user.edge_owner_to_timeline_media?.page_info?.has_next_page || false,
      nextCursor: user.edge_owner_to_timeline_media?.page_info?.end_cursor,
      userId: user.id
    };
  }

  private parseFirstPosts(media: any): InstagramPost[] {
    if (!media?.edges) return [];
    
    return media.edges.map((edge: any) => {
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
    }).filter((post: InstagramPost) => post.id); // Filter out any malformed posts
  }

  private getRandomUserAgent(): string {
    const randomIndex = Math.floor(Math.random() * this.mobileUserAgents.length);
    return this.mobileUserAgents[randomIndex];
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }
}

// Test function
async function testInstagramMobileAPI() {
  const scraperAPIKey = process.env.SCRAPER_API_KEY;
  const extractor = new InstagramMobileAPIExtractor(scraperAPIKey);
  
  const testUsernames = ['cristiano', 'therock', 'kyliejenner'];
  
  console.log('🧪 Testing Instagram Mobile API Extractor\n');
  
  for (const username of testUsernames) {
    console.log(`Testing @${username}...`);
    
    const result = await extractor.extract(username, { 
      detectAffiliates: true,
      maxPosts: 24, // Test pagination
      useFallback: true, // Enable ScraperAPI fallback
      onProgress: (current, target) => console.log(`    📊 Posts: ${current}/${target}`)
    });
    
    if (result.success && result.profile) {
      const profile = result.profile;
      console.log(`✅ Success for @${username}:`);
      console.log(`   Full Name: ${profile.fullName}`);
      console.log(`   Bio: ${profile.bio.substring(0, 100)}${profile.bio.length > 100 ? '...' : ''}`);
      console.log(`   Bio Link: ${profile.bioLink || 'None'}`);
      console.log(`   Followers: ${profile.followers.toLocaleString()}`);
      console.log(`   Verified: ${profile.isVerified ? '✅' : '❌'}`);
      console.log(`   Posts Retrieved: ${profile.posts.length}`);
      console.log(`   Response Time: ${result.metrics.responseTime}ms`);
      
      // Validate bio is not page title
      const forbiddenWords = ['Followers', 'Following', 'Posts', 'See Instagram'];
      const hasPageTitle = forbiddenWords.some(word => profile.bio.includes(word));
      console.log(`   Bio Quality: ${hasPageTitle ? '❌ Looks like page title' : '✅ Actual bio text'}`);
      
      // Show affiliate analysis if available
      if (profile.affiliateAnalysis) {
        const analysis = profile.affiliateAnalysis;
        console.log(`   Affiliates Found: ${analysis.totalAffiliates}`);
        console.log(`   Avg Confidence: ${(analysis.averageConfidence * 100).toFixed(1)}%`);
        console.log(`   Types: ${Object.keys(analysis.typeBreakdown).join(', ')}`);
        if (analysis.mostMentionedBrands.length > 0) {
          console.log(`   Top Brands: ${analysis.mostMentionedBrands.map(b => b.brand).slice(0, 3).join(', ')}`);
        }
        
        // Debug: Show sample captions to understand content
        console.log(`   Sample Captions:`);
        profile.posts.slice(0, 3).forEach((post, i) => {
          const caption = post.caption.substring(0, 100).replace(/\n/g, ' ');
          console.log(`     ${i + 1}. "${caption}${post.caption.length > 100 ? '...' : ''}"`);
        });
      }
      
    } else {
      console.log(`❌ Failed for @${username}: ${result.error}`);
    }
    
    console.log('---');
    
    // Delay between tests to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

// Export test function for external use
export { testInstagramMobileAPI };

// Run test if executed directly
if (require.main === module) {
  testInstagramMobileAPI().catch(console.error);
}