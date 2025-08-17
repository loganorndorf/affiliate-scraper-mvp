import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (in production use Redis)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

interface ValidationRequest {
  username: string;
  platform?: string;
}

interface ValidationResponse {
  success: boolean;
  data?: {
    exists: boolean;
    platform?: string;
    profileUrl?: string;
  };
  error?: {
    code: string;
    message: string;
    retryAfter?: number;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as ValidationRequest;
    const { username, platform } = body;

    if (!username) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_USERNAME',
          message: 'Username is required'
        }
      } as ValidationResponse, { status: 400 });
    }

    // Rate limiting check
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minute window
    const maxRequests = 5; // 5 requests per minute
    
    const current = rateLimitMap.get(clientIp);
    if (current && current.resetTime > now) {
      if (current.count >= maxRequests) {
        const retryAfter = Math.ceil((current.resetTime - now) / 1000);
        return NextResponse.json({
          success: false,
          error: {
            code: 'RATE_LIMITED',
            message: 'Too many validation attempts',
            retryAfter
          }
        } as ValidationResponse, { status: 429 });
      }
      rateLimitMap.set(clientIp, { count: current.count + 1, resetTime: current.resetTime });
    } else {
      rateLimitMap.set(clientIp, { count: 1, resetTime: now + windowMs });
    }

    // For demo purposes, simulate username validation
    // In production, this would check actual platform APIs
    
    // Simulate some usernames that "don't exist"
    const nonExistentUsernames = [
      'thissurelynotexist123',
      'fakeusernamexyz',
      'notreal999',
      'doesnotexist',
      'fakeaccount123'
    ];

    if (nonExistentUsernames.includes(username.toLowerCase())) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'USERNAME_NOT_FOUND',
          message: platform 
            ? `This username doesn't exist on ${platform}. Try checking other platforms or verify the spelling.`
            : 'This username was not found on any of the major platforms. Double-check the spelling or try a different username.'
        }
      } as ValidationResponse, { status: 404 });
    }

    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock successful validation
    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        platform: platform || 'instagram',
        profileUrl: platform 
          ? `https://${platform}.com/${username}`
          : `https://instagram.com/${username}`
      }
    } as ValidationResponse);

  } catch (error) {
    console.error('Username validation error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Failed to validate username'
      }
    } as ValidationResponse, { status: 500 });
  }
}