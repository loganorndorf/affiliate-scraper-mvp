import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

export async function GET(request: NextRequest) {
  try {
    // Load the most recent Instagram metrics
    const metricsResponse = await fetch(`${request.nextUrl.origin}/api/instagram-metrics`);
    const metricsData = await metricsResponse.json();
    
    // Load additional test result files for comprehensive export
    const resultsDir = path.join(process.cwd(), '../tests/results');
    const exportData: any = {
      exportedAt: new Date().toISOString(),
      currentMetrics: metricsData,
      historicalData: {},
      testResults: {}
    };

    if (fs.existsSync(resultsDir)) {
      const files = fs.readdirSync(resultsDir);
      
      // Load reliability history
      const historyFile = path.join(resultsDir, 'reliability-history.json');
      if (fs.existsSync(historyFile)) {
        exportData.historicalData.reliability = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
      }
      
      // Load latest comprehensive test
      const comprehensiveFiles = files.filter(f => f.startsWith('instagram-v2-comprehensive-'));
      if (comprehensiveFiles.length > 0) {
        const latest = comprehensiveFiles.sort().pop();
        const filePath = path.join(resultsDir, latest!);
        exportData.testResults.comprehensive = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      
      // Load latest comparison
      const comparisonFiles = files.filter(f => f.startsWith('v1-vs-v2-comparison-'));
      if (comparisonFiles.length > 0) {
        const latest = comparisonFiles.sort().pop();
        const filePath = path.join(resultsDir, latest!);
        exportData.testResults.comparison = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
      
      // Load affiliate accuracy results
      const affiliateFiles = files.filter(f => f.startsWith('affiliate-accuracy-'));
      if (affiliateFiles.length > 0) {
        const latest = affiliateFiles.sort().pop();
        const filePath = path.join(resultsDir, latest!);
        exportData.testResults.affiliateAccuracy = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      }
    }

    // Create comprehensive report
    const report = {
      ...exportData,
      summary: {
        generatedAt: new Date().toISOString(),
        systemStatus: metricsData.status,
        currentMethod: metricsData.currentMethod,
        keyMetrics: {
          successRate: metricsData.successRate,
          bioAccuracy: metricsData.bioExtractionRate,
          responseTime: metricsData.avgResponseTime,
          postsRetrieved: metricsData.avgPostsRetrieved,
          affiliatesFound: metricsData.affiliatesDetected
        },
        costAnalysis: metricsData.costs,
        recommendation: metricsData.recommendation.action
      }
    };

    // Return as downloadable JSON
    const response = new NextResponse(JSON.stringify(report, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="instagram-metrics-${new Date().toISOString().split('T')[0]}.json"`
      }
    });

    return response;
    
  } catch (error) {
    console.error('Error exporting Instagram metrics:', error);
    
    return NextResponse.json({
      error: 'Export failed',
      message: 'Could not generate metrics export',
      details: String(error)
    }, { status: 500 });
  }
}