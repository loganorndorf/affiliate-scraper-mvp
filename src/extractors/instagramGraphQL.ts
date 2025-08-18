// Instagram GraphQL Pagination Client

import { InstagramPost } from './instagramMobileAPI';

interface GraphQLVariables {
  id: string;
  first: number;
  after?: string;
}

interface GraphQLResponse {
  data: {
    user: {
      edge_owner_to_timeline_media: {
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
    };
  };
  status: string;
}

export interface PaginationOptions {
  batchSize?: number; // Posts per request (default: 24)
  maxPosts?: number; // Total posts to retrieve (default: 30)
  onProgress?: (currentCount: number, targetCount: number) => void;
}

export interface PaginationResult {
  posts: InstagramPost[];
  totalRetrieved: number;
  hasMoreAvailable: boolean;
  nextCursor?: string;
  errors: string[];
}

export class InstagramGraphQLClient {
  private readonly graphqlUrl = 'https://www.instagram.com/graphql/query/';
  private readonly maxRetries = 3;
  private readonly baseDelay = 1000;
  
  // Configuration for query IDs (easily updatable when Instagram changes them)
  private config = {
    userPostsQueryId: '17888483320059182',
    fallbackQueryIds: [
      '17888483320059182', // Current working ID
      '17842794232208280', // Backup ID 1
      '17880160963012870'  // Backup ID 2
    ]
  };

  private userAgents = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15'
  ];

  async getMorePosts(
    userId: string,
    cursor: string,
    options: PaginationOptions = {}
  ): Promise<PaginationResult> {
    const {
      batchSize = 24,
      maxPosts = 30,
      onProgress
    } = options;

    const posts: InstagramPost[] = [];
    const errors: string[] = [];
    let currentCursor = cursor;
    let hasMorePages = true;
    let retrievedCount = 0;

    console.log(`📄 Starting GraphQL pagination for user ${userId} (target: ${maxPosts} posts)`);

    while (hasMorePages && retrievedCount < maxPosts) {
      const remainingNeeded = maxPosts - retrievedCount;
      const currentBatchSize = Math.min(batchSize, remainingNeeded);

      try {
        const batchResult = await this.fetchPostBatch(userId, currentCursor, currentBatchSize);
        
        if (batchResult.success && batchResult.posts) {
          // Deduplicate posts
          const newPosts = batchResult.posts.filter(newPost => 
            !posts.some(existingPost => existingPost.id === newPost.id)
          );
          
          posts.push(...newPosts);
          retrievedCount = posts.length;
          
          console.log(`📄 Retrieved batch of ${newPosts.length} posts (total: ${retrievedCount}/${maxPosts})`);
          
          if (onProgress) {
            onProgress(retrievedCount, maxPosts);
          }

          // Update pagination state
          hasMorePages = (batchResult.hasNextPage || false) && retrievedCount < maxPosts;
          currentCursor = batchResult.nextCursor || '';
          
        } else {
          errors.push(batchResult.error || 'Unknown GraphQL error');
          console.log(`⚠️ GraphQL batch failed: ${batchResult.error}`);
          break;
        }

        // Rate limiting delay
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errors.push(errorMsg);
        console.log(`❌ GraphQL pagination error: ${errorMsg}`);
        break;
      }
    }

    return {
      posts,
      totalRetrieved: posts.length,
      hasMoreAvailable: hasMorePages,
      nextCursor: currentCursor,
      errors
    };
  }

  private async fetchPostBatch(
    userId: string,
    cursor: string,
    count: number
  ): Promise<{
    success: boolean;
    posts?: InstagramPost[];
    hasNextPage?: boolean;
    nextCursor?: string;
    error?: string;
  }> {
    const variables: GraphQLVariables = {
      id: userId,
      first: count,
      after: cursor
    };

    // Try primary query ID first, then fallbacks
    for (const queryId of [this.config.userPostsQueryId, ...this.config.fallbackQueryIds]) {
      try {
        const result = await this.makeGraphQLRequest(queryId, variables);
        if (result.success) {
          return result;
        }
      } catch (error) {
        console.log(`⚠️ Query ID ${queryId} failed, trying next...`);
        continue;
      }
    }

    return {
      success: false,
      error: 'All GraphQL query IDs failed'
    };
  }

  private async makeGraphQLRequest(
    queryId: string,
    variables: GraphQLVariables
  ): Promise<{
    success: boolean;
    posts?: InstagramPost[];
    hasNextPage?: boolean;
    nextCursor?: string;
    error?: string;
  }> {
    const url = `${this.graphqlUrl}?query_id=${queryId}&variables=${encodeURIComponent(JSON.stringify(variables))}`;
    
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const userAgent = this.getRandomUserAgent();
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': userAgent,
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'X-Requested-With': 'XMLHttpRequest',
            'X-IG-App-ID': '936619743392459',
            'X-Instagram-AJAX': '1',
            'X-CSRFToken': 'missing', // Often not required for public data
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-origin',
            'Referer': 'https://www.instagram.com/'
          }
        });

        if (response.status === 429) {
          console.log(`⏰ GraphQL rate limited on attempt ${attempt}, waiting...`);
          await this.exponentialBackoff(attempt);
          continue;
        }

        if (response.status === 401 || response.status === 403) {
          return {
            success: false,
            error: `Authentication required (${response.status})`
          };
        }

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: GraphQLResponse = await response.json() as GraphQLResponse;
        
        if (!data.data?.user?.edge_owner_to_timeline_media) {
          throw new Error('Invalid GraphQL response structure');
        }

        const mediaData = data.data.user.edge_owner_to_timeline_media;
        const posts = this.parseGraphQLPosts(mediaData.edges);

        return {
          success: true,
          posts,
          hasNextPage: mediaData.page_info.has_next_page || false,
          nextCursor: mediaData.page_info.end_cursor || undefined
        };

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < this.maxRetries) {
          console.log(`❌ GraphQL attempt ${attempt} failed: ${lastError.message}, retrying...`);
          await this.exponentialBackoff(attempt);
        }
      }
    }

    return {
      success: false,
      error: `All ${this.maxRetries} GraphQL attempts failed. Last error: ${lastError?.message}`
    };
  }

  private parseGraphQLPosts(edges: any[]): InstagramPost[] {
    return edges.map(edge => {
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
    }).filter(post => post.id);
  }

  private getRandomUserAgent(): string {
    const randomIndex = Math.floor(Math.random() * this.userAgents.length);
    return this.userAgents[randomIndex];
  }

  private async exponentialBackoff(attempt: number): Promise<void> {
    const delay = this.baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  // Utility method to update query ID when Instagram changes it
  updateQueryId(newQueryId: string): void {
    console.log(`🔄 Updating GraphQL query ID from ${this.config.userPostsQueryId} to ${newQueryId}`);
    this.config.userPostsQueryId = newQueryId;
  }

  // Get current configuration for debugging
  getConfig() {
    return { ...this.config };
  }
}

// Test function
async function testGraphQLPagination() {
  console.log('🧪 Testing Instagram GraphQL Pagination\n');
  
  const graphqlClient = new InstagramGraphQLClient();
  
  // Test data (would normally come from mobile API response)
  const testCases = [
    {
      username: 'cristiano',
      userId: '173560420', // Cristiano's user ID
      cursor: 'QVFELUNfWnBOWk1pWURCTExLa0VGZGxOaVF3c1BVVjhCVGpWb2xoX1ZQWkJMT0toNmpvVW1SWjNjeEJqeXIzQXFWenJOVnZfSUt0RHMwY20wODBTRA%3D%3D'
    }
  ];
  
  for (const testCase of testCases) {
    console.log(`Testing pagination for @${testCase.username} (ID: ${testCase.userId})`);
    
    const result = await graphqlClient.getMorePosts(testCase.userId, testCase.cursor, {
      maxPosts: 18, // Get 18 more posts (total would be 30 with initial 12)
      batchSize: 12,
      onProgress: (current, target) => {
        console.log(`  📊 Progress: ${current}/${target} posts retrieved`);
      }
    });

    console.log(`\n📊 Results for @${testCase.username}:`);
    console.log(`  Posts Retrieved: ${result.totalRetrieved}`);
    console.log(`  Has More: ${result.hasMoreAvailable ? 'Yes' : 'No'}`);
    console.log(`  Errors: ${result.errors.length}`);
    
    if (result.errors.length > 0) {
      console.log(`  Error Details: ${result.errors.join(', ')}`);
    }
    
    if (result.posts.length > 0) {
      console.log(`  Sample Additional Posts:`);
      result.posts.slice(0, 3).forEach((post, i) => {
        const caption = post.caption.substring(0, 80).replace(/\n/g, ' ');
        console.log(`    ${i + 1}. "${caption}${post.caption.length > 80 ? '...' : ''}"`);
        console.log(`       Likes: ${post.likes.toLocaleString()} | Comments: ${post.comments.toLocaleString()}`);
      });
    }
    
    console.log('---\n');
  }
}

// Export test function only (class already exported above)
export { testGraphQLPagination };

// Run test if executed directly
if (require.main === module) {
  testGraphQLPagination().catch(console.error);
}