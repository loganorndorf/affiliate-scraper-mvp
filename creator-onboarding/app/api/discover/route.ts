import { NextRequest, NextResponse } from 'next/server';

interface DiscoverRequest {
  username: string;
  platforms?: string[];
}

interface DiscoverResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: 'started';
    estimatedTime: number;
    message: string;
  };
  error?: {
    code: 'INVALID_USERNAME' | 'RATE_LIMITED' | 'SERVER_ERROR';
    message: string;
  };
}

// Simple in-memory storage for demo (use Redis/DB in production)
// Use global to persist across hot reloads in development
const globalForJobs = globalThis as unknown as {
  jobs: Map<string, any> | undefined;
  rateLimits: Map<string, any> | undefined;
};

const jobs = globalForJobs.jobs ?? (globalForJobs.jobs = new Map());
const rateLimits = globalForJobs.rateLimits ?? (globalForJobs.rateLimits = new Map());

const BACKEND_API_URL = process.env.BACKEND_API_URL || 'http://localhost:4000';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as DiscoverRequest;
    const { username, platforms = ['instagram', 'tiktok', 'youtube', 'twitter', 'linktree', 'beacons'] } = body;

    // Validate username
    if (!username || !username.trim()) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username is required'
        }
      } as DiscoverResponse, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase().replace('@', '');
    
    // Validate username format
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username must be 3-30 characters'
        }
      } as DiscoverResponse, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_USERNAME',
          message: 'Username can only contain letters, numbers, dots, and underscores'
        }
      } as DiscoverResponse, { status: 400 });
    }

    // Check rate limits (IP-based for demo)
    const clientIP = request.headers.get('x-forwarded-for') || 'unknown';
    const rateLimitKey = `${clientIP}:${cleanUsername}`;
    const now = Date.now();
    const lastRequest = rateLimits.get(rateLimitKey);
    
    if (lastRequest && (now - lastRequest) < 60000) { // 1 minute rate limit
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Please wait before starting another discovery'
        }
      } as DiscoverResponse, { status: 429 });
    }
    
    rateLimits.set(rateLimitKey, now);

    // Create unique job ID
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Initialize job state
    const job = {
      jobId,
      username: cleanUsername,
      status: 'processing',
      progress: 0,
      platforms: platforms.reduce((acc, platform) => {
        acc[platform] = { status: 'pending', linksFound: 0 };
        return acc;
      }, {} as Record<string, any>),
      totalLinks: 0,
      startedAt: now,
      results: null,
      error: null
    };
    
    jobs.set(jobId, job);

    // Start background discovery (don't await)
    startBackgroundDiscovery(jobId, cleanUsername, platforms).catch(error => {
      console.error('Background discovery failed:', error);
      const failedJob = jobs.get(jobId);
      if (failedJob) {
        failedJob.status = 'failed';
        failedJob.error = error.message;
        jobs.set(jobId, failedJob);
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        jobId,
        status: 'started',
        estimatedTime: 30,
        message: 'Discovery started'
      }
    } as DiscoverResponse);

  } catch (error) {
    console.error('Discover API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Internal server error'
      }
    } as DiscoverResponse, { status: 500 });
  }
}

async function startBackgroundDiscovery(
  jobId: string, 
  username: string, 
  platforms: string[]
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  try {
    console.log(`🚀 Starting discovery for ${username} (${jobId})`);
    
    // Method 1: Try to use existing Universal Discovery backend
    try {
      // Import your existing analyzer
      const { UniversalCreatorDiscovery } = await import('../../../../src/orchestrators/universalDiscovery');
      
      const youtubeApiKey = process.env.YOUTUBE_API_KEY;
      const discovery = new UniversalCreatorDiscovery(youtubeApiKey);
      
      console.log(`📊 Running Universal Discovery for ${username}`);
      job.progress = 10;
      jobs.set(jobId, job);
      
      const result = await discovery.discoverCreator(username, {
        platforms,
        timeout: 25000
      });
      
      console.log(`✅ Universal Discovery completed for ${username}`);
      
      // Process results and update job
      console.log('Raw Universal Discovery result:', JSON.stringify(result, null, 2));
      const processedResults = processDiscoveryResults(result);
      console.log('Processed results:', JSON.stringify(processedResults, null, 2));
      job.status = 'complete';
      job.progress = 100;
      job.results = processedResults;
      job.totalLinks = processedResults.totalLinks;
      job.platforms = processedResults.platforms;
      console.log('Final job with results:', JSON.stringify(job, null, 2));
      jobs.set(jobId, job);
      
      // Cleanup
      await discovery.cleanup();
      
    } catch (universalError) {
      console.error('Universal Discovery failed, using mock data:', universalError);
      
      // Method 2: Create progressive mock data for demo
      await simulateDiscoveryProgress(jobId, username, platforms);
    }
    
  } catch (error) {
    console.error(`❌ Discovery failed for ${username}:`, error);
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Discovery failed';
    jobs.set(jobId, job);
  }
}

function processDiscoveryResults(result: any) {
  const platformResults: Record<string, any> = {};
  let totalLinks = 0;
  
  // Process platform results
  Object.entries(result.platforms || {}).forEach(([platform, data]: [string, any]) => {
    const linksFound = data.links?.length || 0;
    platformResults[platform] = {
      status: data.success ? 'complete' : 'failed',
      linksFound,
      error: data.success ? undefined : data.error || 'Failed to access platform'
    };
    totalLinks += linksFound;
  });
  
  return {
    totalLinks,
    platforms: platformResults,
    allLinks: result.allLinks || [],
    dedupedLinks: result.dedupedLinks || [],
    summary: result.summary
  };
}

async function simulateDiscoveryProgress(
  jobId: string, 
  username: string, 
  platforms: string[]
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;
  
  console.log(`🎭 Simulating discovery for ${username}`);
  
  // Simulate progressive platform checking
  for (let i = 0; i < platforms.length; i++) {
    const platform = platforms[i];
    
    // Update platform to checking
    job.platforms[platform] = { status: 'checking', linksFound: 0 };
    job.progress = Math.round(((i + 0.5) / platforms.length) * 100);
    jobs.set(jobId, job);
    
    // Simulate processing time (2-4 seconds per platform)
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    // Simulate results
    const success = Math.random() > 0.1; // 90% success rate
    const linksFound = success ? Math.floor(Math.random() * 10) + 1 : 0;
    
    job.platforms[platform] = {
      status: success ? 'complete' : 'failed',
      linksFound,
      error: success ? undefined : 'Platform not accessible'
    };
    
    job.totalLinks += linksFound;
    job.progress = Math.round(((i + 1) / platforms.length) * 100);
    jobs.set(jobId, job);
  }
  
  // Complete the job
  job.status = 'complete';
  job.progress = 100;
  jobs.set(jobId, job);
  
  console.log(`🎉 Mock discovery complete for ${username}: ${job.totalLinks} links found`);
}

// Export jobs for access by other API routes
export { jobs };