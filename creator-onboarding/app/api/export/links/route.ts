import { NextRequest, NextResponse } from 'next/server';

interface ExportRequest {
  links: Array<{
    url: string;
    title?: string;
    platform: string;
    isPrimary?: boolean;
    affiliateDetected?: boolean;
    estimatedValue?: number;
  }>;
  creatorInfo: {
    username: string;
    email?: string;
    platforms: Record<string, unknown>;
  };
  format: 'csv' | 'json';
}

interface ExportResponse {
  success: boolean;
  data?: {
    downloadUrl: string;
    filename: string;
    format: string;
    exportedCount: number;
    message: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as ExportRequest;
    const { links, creatorInfo, format } = body;

    // Validate request
    if (!links || links.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'NO_LINKS_PROVIDED',
          message: 'No links provided for export'
        }
      } as ExportResponse, { status: 400 });
    }

    if (!creatorInfo?.username) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MISSING_CREATOR_INFO',
          message: 'Creator information is required'
        }
      } as ExportResponse, { status: 400 });
    }

    if (!format || !['csv', 'json'].includes(format)) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_FORMAT',
          message: 'Format must be either "csv" or "json"'
        }
      } as ExportResponse, { status: 400 });
    }

    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${creatorInfo.username}_links_${timestamp}.${format}`;
    
    let exportData: string;
    let mimeType: string;

    if (format === 'csv') {
      // Generate CSV
      const headers = ['url', 'title', 'platform', 'is_primary', 'affiliate_detected', 'estimated_value'];
      const csvRows = [
        headers.join(','),
        ...links.map(link => [
          `"${link.url}"`,
          `"${link.title || extractTitleFromUrl(link.url)}"`,
          `"${link.platform}"`,
          link.isPrimary ? 'true' : 'false',
          link.affiliateDetected ? 'true' : 'false',
          link.estimatedValue || 0
        ].join(','))
      ];
      exportData = csvRows.join('\n');
      mimeType = 'text/csv';
    } else {
      // Generate JSON
      const jsonData = {
        metadata: {
          exportedAt: new Date().toISOString(),
          creator: {
            username: creatorInfo.username,
            email: creatorInfo.email,
            platforms: Object.keys(creatorInfo.platforms)
          },
          totalLinks: links.length
        },
        links: links.map(link => ({
          url: link.url,
          title: link.title || extractTitleFromUrl(link.url),
          platform: link.platform,
          isPrimary: link.isPrimary || false,
          affiliateDetected: link.affiliateDetected || false,
          estimatedValue: link.estimatedValue || 0,
          discoveredAt: new Date().toISOString()
        }))
      };
      exportData = JSON.stringify(jsonData, null, 2);
      mimeType = 'application/json';
    }

    // Create blob URL for download
    const blob = new Blob([exportData], { type: mimeType });
    const downloadUrl = URL.createObjectURL(blob);

    console.log(`✅ Generated ${format.toUpperCase()} export for ${creatorInfo.username}: ${links.length} links`);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl,
        filename,
        format,
        exportedCount: links.length,
        message: `Successfully exported ${links.length} links as ${format.toUpperCase()}`
      }
    } as ExportResponse);

  } catch (error) {
    console.error('Export API error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export links'
      }
    } as ExportResponse, { status: 500 });
  }
}

function extractTitleFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.replace('www.', '');
    const path = urlObj.pathname.replace(/^\//, '').replace(/\/$/, '');
    
    if (path) {
      return `${domain}/${path}`;
    }
    
    return domain;
  } catch {
    return url;
  }
}