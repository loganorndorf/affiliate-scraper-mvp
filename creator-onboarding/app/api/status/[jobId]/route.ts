import { NextRequest, NextResponse } from 'next/server';
import { jobs } from '../../discover/route';

interface StatusResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: 'processing' | 'complete' | 'failed';
    progress: number;
    platforms: Record<string, {
      status: 'pending' | 'checking' | 'complete' | 'failed';
      linksFound: number;
      error?: string;
    }>;
    totalLinks: number;
    timeElapsed: number;
    estimatedTimeRemaining?: number;
    results?: any;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ jobId: string }> }
): Promise<NextResponse> {
  try {
    const params = await context.params;
    const jobId = params.jobId;

    if (!jobId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_JOB_ID',
          message: 'Job ID is required'
        }
      } as StatusResponse, { status: 400 });
    }

    // Get job from storage
    const job = jobs.get(jobId);
    
    console.log(`🔍 Looking for job ${jobId}, found:`, !!job);
    console.log(`🗄️ Available jobs:`, Array.from(jobs.keys()));
    
    if (!job) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'JOB_NOT_FOUND',
          message: `Job ${jobId} not found or expired. Available jobs: ${Array.from(jobs.keys()).join(', ')}`
        }
      } as StatusResponse, { status: 404 });
    }

    // Calculate time elapsed
    const timeElapsed = Math.floor((Date.now() - job.startedAt) / 1000);
    
    // Estimate remaining time based on progress
    let estimatedTimeRemaining;
    if (job.status === 'processing' && job.progress > 0) {
      const totalEstimated = 30; // 30 seconds total
      const progressRatio = job.progress / 100;
      estimatedTimeRemaining = Math.max(0, totalEstimated - (timeElapsed));
    }

    const response: StatusResponse = {
      success: true,
      data: {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        platforms: job.platforms,
        totalLinks: job.totalLinks,
        timeElapsed,
        estimatedTimeRemaining,
        ...(job.status === 'complete' && job.results ? { 
          results: {
            allLinks: job.results.allLinks || [],
            dedupedLinks: job.results.dedupedLinks || [],
            totalLinks: job.results.totalLinks
          }
        } : {})
      }
    };
    
    if (job.status === 'complete') {
      console.log('Status API - Including results with allLinks count:', job.results?.allLinks?.length || 0);
    }

    try {
      const jsonResponse = NextResponse.json(response, {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Content-Type': 'application/json'
        }
      });
      return jsonResponse;
    } catch (jsonError) {
      console.error('JSON serialization failed:', jsonError);
      // Return response without results if serialization fails
      const fallbackResponse = {
        ...response,
        data: {
          ...response.data,
          results: undefined
        }
      };
      return NextResponse.json(fallbackResponse, {
        headers: {
          'Cache-Control': 'no-cache, no-store, max-age=0',
          'Content-Type': 'application/json'
        }
      });
    }

  } catch (error) {
    console.error('Status API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'SERVER_ERROR',
        message: error instanceof Error ? error.message : 'Failed to get job status'
      }
    } as StatusResponse, { status: 500 });
  }
}