#!/usr/bin/env ts-node

/**
 * Instagram V2 Visual Test Dashboard
 * 
 * Creates a comprehensive visual dashboard for Instagram V2 test results
 * with charts, metrics, and real-time monitoring capabilities.
 */

import { runInstagramV2Tests } from './instagram-v2-comprehensive';
import { runSingleReliabilityCheck } from './instagram-v2-reliability';
import { runAffiliateAccuracyTests } from './instagram-v2-affiliate-accuracy';
import { runV1V2Comparison } from './instagram-v1-vs-v2-comparison';
import * as fs from 'fs';
import * as path from 'path';

interface DashboardData {
  timestamp: Date;
  overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
  components: {
    mobileAPI: { status: string; score: number; details: string };
    graphQL: { status: string; score: number; details: string };
    affiliateDetection: { status: string; score: number; details: string };
    scraperAPIFallback: { status: string; score: number; details: string };
  };
  metrics: {
    successRate: number;
    bioAccuracy: number;
    avgResponseTime: number;
    postsRetrieved: number;
    affiliatesFound: number;
  };
  trends: {
    successTrend: 'improving' | 'stable' | 'declining';
    performanceTrend: 'improving' | 'stable' | 'declining';
    recommendation: string;
  };
  alerts: string[];
}

export class InstagramV2Dashboard {
  private readonly resultsDir: string;

  constructor() {
    this.resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async generateDashboard(): Promise<DashboardData> {
    console.log('📊 Generating Instagram V2 Test Dashboard\n');

    // Run all test suites
    console.log('🏃 Running comprehensive tests...');
    const comprehensiveResults = await runInstagramV2Tests();
    
    console.log('\n🔍 Running reliability check...');
    const reliabilityResults = await runSingleReliabilityCheck();
    
    console.log('\n🎯 Running affiliate accuracy tests...');
    const affiliateResults = await runAffiliateAccuracyTests();
    
    console.log('\n⚡ Running V1 vs V2 comparison...');
    const comparisonResults = await runV1V2Comparison();

    // Compile dashboard data
    const dashboardData = this.compileDashboardData(
      comprehensiveResults,
      reliabilityResults,
      affiliateResults,
      comparisonResults
    );

    // Generate visual dashboard
    this.displayVisualDashboard(dashboardData);
    
    // Save dashboard data
    await this.saveDashboardData(dashboardData);

    return dashboardData;
  }

  private compileDashboardData(
    comprehensive: any,
    reliability: any,
    affiliate: any,
    comparison: any
  ): DashboardData {
    // Determine overall health
    const avgScore = (comprehensive.results.successRate + reliability.successRate + affiliate.overall.f1Score) / 3;
    let overallHealth: 'excellent' | 'good' | 'fair' | 'poor';
    
    if (avgScore >= 80) overallHealth = 'excellent';
    else if (avgScore >= 60) overallHealth = 'good';
    else if (avgScore >= 40) overallHealth = 'fair';
    else overallHealth = 'poor';

    // Component statuses
    const components = {
      mobileAPI: {
        status: comprehensive.results.successRate > 60 ? 'healthy' : comprehensive.results.successRate > 30 ? 'degraded' : 'critical',
        score: comprehensive.results.successRate,
        details: `${comprehensive.results.successRate}% success rate, ${comprehensive.results.averageResponseTime}ms avg response`
      },
      graphQL: {
        status: comprehensive.results.postsRetrieved > 12 ? 'healthy' : comprehensive.results.postsRetrieved > 0 ? 'partial' : 'failing',
        score: comprehensive.results.postsRetrieved > 12 ? 100 : comprehensive.results.postsRetrieved > 0 ? 50 : 0,
        details: `${comprehensive.results.postsRetrieved} avg posts retrieved`
      },
      affiliateDetection: {
        status: affiliate.overall.f1Score > 70 ? 'excellent' : affiliate.overall.f1Score > 50 ? 'good' : 'needs_work',
        score: affiliate.overall.f1Score,
        details: `${affiliate.overall.accuracy}% accuracy, ${affiliate.overall.precision}% precision`
      },
      scraperAPIFallback: {
        status: comparison.summary.v2Stats.methodBreakdown['scraper_api'] > 0 ? 'active' : 'standby',
        score: comparison.summary.v2Stats.methodBreakdown['scraper_api'] > 0 ? 100 : 75,
        details: `${comparison.summary.v2Stats.methodBreakdown['scraper_api'] || 0} fallback uses`
      }
    };

    // Generate alerts
    const alerts: string[] = [];
    if (comprehensive.results.successRate < 40) alerts.push('🚨 Low success rate detected');
    if (comprehensive.results.averageResponseTime > 10000) alerts.push('⏰ High response times detected');
    if (affiliate.overall.f1Score < 50) alerts.push('🎯 Affiliate detection needs improvement');
    if (reliability.successRate < 30) alerts.push('📉 Reliability trending down');

    return {
      timestamp: new Date(),
      overallHealth,
      components,
      metrics: {
        successRate: comprehensive.results.successRate,
        bioAccuracy: comprehensive.results.bioAccuracy,
        avgResponseTime: comprehensive.results.averageResponseTime,
        postsRetrieved: comprehensive.results.postsRetrieved,
        affiliatesFound: comprehensive.results.affiliatesFound
      },
      trends: {
        successTrend: comparison.improvements.successRate > 5 ? 'improving' : comparison.improvements.successRate < -5 ? 'declining' : 'stable',
        performanceTrend: comparison.improvements.responseTime > 1000 ? 'improving' : comparison.improvements.responseTime < -1000 ? 'declining' : 'stable',
        recommendation: comparison.recommendation
      },
      alerts
    };
  }

  private displayVisualDashboard(data: DashboardData): void {
    const healthIcon = {
      excellent: '🟢',
      good: '🟡',
      fair: '🟠',
      poor: '🔴'
    }[data.overallHealth];

    console.log('\n' + '╭' + '─'.repeat(68) + '╮');
    console.log('│' + ' '.repeat(18) + 'INSTAGRAM V2 TEST DASHBOARD' + ' '.repeat(19) + '│');
    console.log('├' + '─'.repeat(68) + '┤');
    console.log(`│ Overall Health: ${healthIcon} ${data.overallHealth.toUpperCase().padEnd(20)} Updated: ${data.timestamp.toLocaleTimeString().padEnd(15)} │`);
    console.log('├' + '─'.repeat(68) + '┤');
    
    // Key metrics row
    console.log(`│ Success: ${this.formatDashboardMetric(data.metrics.successRate, '%')} │ Bio: ${this.formatDashboardMetric(data.metrics.bioAccuracy, '%')} │ Time: ${this.formatDashboardMetric(data.metrics.avgResponseTime, 'ms', 8)} │`);
    console.log(`│ Posts: ${this.formatDashboardMetric(data.metrics.postsRetrieved, '', 6)} │ Affiliates: ${this.formatDashboardMetric(data.metrics.affiliatesFound, '', 6)} │ ${' '.repeat(12)} │`);
    
    console.log('├' + '─'.repeat(68) + '┤');
    
    // Component status
    console.log('│ COMPONENT STATUS:' + ' '.repeat(49) + '│');
    console.log(`│  Mobile API:       ${this.formatComponentStatus(data.components.mobileAPI.status).padEnd(30)} ${this.formatScore(data.components.mobileAPI.score)}% │`);
    console.log(`│  GraphQL:          ${this.formatComponentStatus(data.components.graphQL.status).padEnd(30)} ${this.formatScore(data.components.graphQL.score)}% │`);
    console.log(`│  Affiliate Detect: ${this.formatComponentStatus(data.components.affiliateDetection.status).padEnd(30)} ${this.formatScore(data.components.affiliateDetection.score)}% │`);
    console.log(`│  Fallback System:  ${this.formatComponentStatus(data.components.scraperAPIFallback.status).padEnd(30)} ${this.formatScore(data.components.scraperAPIFallback.score)}% │`);
    
    console.log('├' + '─'.repeat(68) + '┤');
    
    // Trends
    console.log('│ TRENDS:' + ' '.repeat(59) + '│');
    console.log(`│  Success Rate:     ${this.formatTrend(data.trends.successTrend).padEnd(40)} │`);
    console.log(`│  Performance:      ${this.formatTrend(data.trends.performanceTrend).padEnd(40)} │`);
    
    if (data.alerts.length > 0) {
      console.log('├' + '─'.repeat(68) + '┤');
      console.log('│ ALERTS:' + ' '.repeat(59) + '│');
      data.alerts.slice(0, 3).forEach(alert => {
        const alertText = alert.substring(0, 64);
        console.log(`│  ${alertText.padEnd(64)} │`);
      });
    }
    
    console.log('├' + '─'.repeat(68) + '┤');
    console.log(`│ 💡 ${data.trends.recommendation.substring(0, 62).padEnd(62)} │`);
    console.log('╰' + '─'.repeat(68) + '╯');
    
    // ASCII chart for success rate over time (if history available)
    this.displaySuccessRateChart();
  }

  private formatDashboardMetric(value: number, unit: string, width: number = 6): string {
    const valueStr = Math.round(value).toString() + unit;
    return valueStr.padStart(width);
  }

  private formatComponentStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'healthy': '🟢 Healthy',
      'degraded': '🟡 Degraded',
      'critical': '🔴 Critical',
      'excellent': '🟢 Excellent',
      'good': '🟡 Good',
      'partial': '🟠 Partial',
      'failing': '🔴 Failing',
      'needs_work': '🟠 Needs Work',
      'active': '🟢 Active',
      'standby': '🟡 Standby'
    };
    
    return statusMap[status] || `⚪ ${status}`;
  }

  private formatScore(score: number): string {
    return score.toString().padStart(3);
  }

  private formatTrend(trend: string): string {
    const trendMap: Record<string, string> = {
      'improving': '📈 Improving',
      'stable': '➡️ Stable',
      'declining': '📉 Declining'
    };
    
    return trendMap[trend] || `⚪ ${trend}`;
  }

  private displaySuccessRateChart(): void {
    // Try to load historical data for chart
    const historyFile = path.join(this.resultsDir, 'reliability-history.json');
    
    if (fs.existsSync(historyFile)) {
      try {
        const historyData = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        if (historyData.length > 1) {
          console.log('\n📈 SUCCESS RATE TREND (Last 10 measurements):');
          
          const recentData = historyData.slice(-10);
          const maxRate = Math.max(...recentData.map((d: any) => d.successRate));
          const minRate = Math.min(...recentData.map((d: any) => d.successRate));
          
          // Simple ASCII chart
          console.log('    100% ┤');
          recentData.forEach((entry: any, index: number) => {
            const normalized = maxRate > minRate ? 
              ((entry.successRate - minRate) / (maxRate - minRate)) * 20 : 10;
            const bar = '█'.repeat(Math.max(1, Math.round(normalized)));
            const date = new Date(entry.timestamp).toLocaleDateString();
            console.log(`     ${entry.successRate.toString().padStart(3)}% ┤${bar} ${date}`);
          });
          console.log('      0% ┤');
          console.log('         └' + '─'.repeat(25));
        }
      } catch (error) {
        console.log('⚠️ Could not load historical data for chart');
      }
    }
  }

  private async saveDashboardData(data: DashboardData): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `dashboard-${timestamp}.json`;
    const filePath = path.join(this.resultsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    // Also save as latest dashboard
    const latestPath = path.join(this.resultsDir, 'latest-dashboard.json');
    fs.writeFileSync(latestPath, JSON.stringify(data, null, 2));
    
    console.log(`\n💾 Dashboard data saved to: ${filePath}`);
  }

  // Quick status check without running full tests
  async quickStatus(): Promise<void> {
    console.log('⚡ Instagram V2 Quick Status Check\n');
    
    // Check if we have recent test results
    const latestDashboard = path.join(this.resultsDir, 'latest-dashboard.json');
    
    if (fs.existsSync(latestDashboard)) {
      try {
        const data: DashboardData = JSON.parse(fs.readFileSync(latestDashboard, 'utf8'));
        const age = Date.now() - new Date(data.timestamp).getTime();
        const ageMinutes = Math.round(age / (1000 * 60));
        
        console.log(`📊 Last dashboard update: ${ageMinutes} minutes ago\n`);
        
        if (ageMinutes < 60) {
          this.displayQuickStatus(data);
          return;
        } else {
          console.log('⚠️ Dashboard data is stale, running fresh tests...\n');
        }
      } catch (error) {
        console.log('⚠️ Could not load cached dashboard data\n');
      }
    }

    // Run fresh tests if no recent data
    await this.generateDashboard();
  }

  private displayQuickStatus(data: DashboardData): void {
    const healthIcon = {
      excellent: '🟢',
      good: '🟡', 
      fair: '🟠',
      poor: '🔴'
    }[data.overallHealth];

    console.log('┌' + '─'.repeat(50) + '┐');
    console.log(`│ ${healthIcon} Instagram V2 Status: ${data.overallHealth.toUpperCase().padEnd(20)} │`);
    console.log('├' + '─'.repeat(50) + '┤');
    console.log(`│ Success Rate:    ${data.metrics.successRate.toString().padStart(3)}%                │`);
    console.log(`│ Bio Accuracy:    ${data.metrics.bioAccuracy.toString().padStart(3)}%                │`);
    console.log(`│ Avg Response:    ${data.metrics.avgResponseTime.toString().padStart(4)}ms               │`);
    console.log(`│ Posts Retrieved: ${data.metrics.postsRetrieved.toString().padStart(3)}                 │`);
    console.log('└' + '─'.repeat(50) + '┘');

    if (data.alerts.length > 0) {
      console.log('\n🚨 ACTIVE ALERTS:');
      data.alerts.forEach(alert => console.log(`  ${alert}`));
    }

    console.log(`\n💡 ${data.trends.recommendation}`);
  }

  // Live monitoring mode
  async startLiveMonitoring(intervalMinutes: number = 30): Promise<void> {
    console.log(`🔄 Starting Instagram V2 live monitoring (every ${intervalMinutes} minutes)\n`);
    
    const runMonitoringCycle = async () => {
      try {
        console.log(`\n⏰ ${new Date().toLocaleTimeString()} - Running monitoring cycle...`);
        
        const reliabilityCheck = await runSingleReliabilityCheck();
        
        // Quick dashboard update
        const quickData: Partial<DashboardData> = {
          timestamp: new Date(),
          metrics: {
            successRate: reliabilityCheck.successRate,
            bioAccuracy: reliabilityCheck.bioAccuracyRate,
            avgResponseTime: reliabilityCheck.avgResponseTime,
            postsRetrieved: reliabilityCheck.postRetrievalRate,
            affiliatesFound: reliabilityCheck.affiliateDetectionRate
          }
        };

        console.log('📊 Quick Status Update:');
        console.log(`  Success: ${reliabilityCheck.successRate}% | Bio: ${reliabilityCheck.bioAccuracyRate}% | Time: ${reliabilityCheck.avgResponseTime}ms`);
        
        // Save monitoring log
        const logEntry = {
          timestamp: new Date().toISOString(),
          ...quickData.metrics
        };
        
        const logFile = path.join(this.resultsDir, 'monitoring-log.jsonl');
        fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
        
      } catch (error) {
        console.log(`❌ Monitoring cycle failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    };

    // Run initial cycle
    await runMonitoringCycle();

    // Schedule recurring cycles
    setInterval(runMonitoringCycle, intervalMinutes * 60 * 1000);
    
    console.log(`\n✅ Live monitoring started. Logs saved to: ${path.join(this.resultsDir, 'monitoring-log.jsonl')}`);
  }

  // Generate test report for sharing
  async generateTestReport(): Promise<string> {
    console.log('📋 Generating Instagram V2 Test Report\n');
    
    const dashboardData = await this.generateDashboard();
    
    const reportContent = `
# Instagram V2 Extractor Test Report

**Generated:** ${dashboardData.timestamp.toISOString()}
**Overall Health:** ${dashboardData.overallHealth.toUpperCase()}

## Summary Metrics

- **Success Rate:** ${dashboardData.metrics.successRate}%
- **Bio Accuracy:** ${dashboardData.metrics.bioAccuracy}%
- **Average Response Time:** ${dashboardData.metrics.avgResponseTime}ms
- **Posts Retrieved:** ${dashboardData.metrics.postsRetrieved} avg
- **Affiliates Found:** ${dashboardData.metrics.affiliatesFound} avg

## Component Status

### Mobile API
- **Status:** ${dashboardData.components.mobileAPI.status}
- **Score:** ${dashboardData.components.mobileAPI.score}%
- **Details:** ${dashboardData.components.mobileAPI.details}

### GraphQL Pagination
- **Status:** ${dashboardData.components.graphQL.status}
- **Score:** ${dashboardData.components.graphQL.score}%
- **Details:** ${dashboardData.components.graphQL.details}

### Affiliate Detection
- **Status:** ${dashboardData.components.affiliateDetection.status}
- **Score:** ${dashboardData.components.affiliateDetection.score}%
- **Details:** ${dashboardData.components.affiliateDetection.details}

### ScraperAPI Fallback
- **Status:** ${dashboardData.components.scraperAPIFallback.status}
- **Score:** ${dashboardData.components.scraperAPIFallback.score}%
- **Details:** ${dashboardData.components.scraperAPIFallback.details}

## Trends

- **Success Trend:** ${dashboardData.trends.successTrend}
- **Performance Trend:** ${dashboardData.trends.performanceTrend}

## Recommendation

${dashboardData.trends.recommendation}

${dashboardData.alerts.length > 0 ? `## Alerts\n\n${dashboardData.alerts.map(alert => `- ${alert}`).join('\n')}` : ''}

---
*Report generated by Instagram V2 Test Dashboard*
    `.trim();

    const reportPath = path.join(this.resultsDir, 'test-report.md');
    fs.writeFileSync(reportPath, reportContent);
    
    console.log(`📄 Test report saved to: ${reportPath}`);
    
    return reportContent;
  }
}

// CLI interface for dashboard
async function runDashboard() {
  const args = process.argv.slice(2);
  const dashboard = new InstagramV2Dashboard();

  if (args.includes('--monitor')) {
    const intervalArg = args.find(arg => arg.startsWith('--interval='));
    const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 30;
    await dashboard.startLiveMonitoring(interval);
  } else if (args.includes('--quick')) {
    await dashboard.quickStatus();
  } else if (args.includes('--report')) {
    await dashboard.generateTestReport();
  } else {
    await dashboard.generateDashboard();
  }
}

// Export for use in other files
export { runDashboard };

// Run dashboard if executed directly
if (require.main === module) {
  runDashboard().catch(console.error);
}