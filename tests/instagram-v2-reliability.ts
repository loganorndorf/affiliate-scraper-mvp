#!/usr/bin/env ts-node

/**
 * Instagram V2 Reliability and Performance Monitor
 * 
 * Tracks success rates, degradation detection, and trend analysis
 * for the Instagram V2 extractor system over time.
 */

import { InstagramMobileAPIExtractor } from '../src/extractors/instagramMobileAPI';
import * as fs from 'fs';
import * as path from 'path';

interface ReliabilityMetrics {
  timestamp: Date;
  successRate: number;
  avgResponseTime: number;
  bioAccuracyRate: number;
  followerAccuracyRate: number;
  postRetrievalRate: number;
  affiliateDetectionRate: number;
  errorBreakdown: Record<string, number>;
  methodBreakdown: {
    mobileAPI: { attempts: number; successes: number };
    graphQL: { attempts: number; successes: number };
    scraperAPI: { attempts: number; successes: number };
  };
}

interface TrendAnalysis {
  timeframe: string;
  degradationDetected: boolean;
  improvementDetected: boolean;
  recommendations: string[];
  alerts: string[];
}

export class InstagramV2ReliabilityMonitor {
  private readonly resultsDir: string;
  private readonly historyFile: string;
  private readonly maxHistoryDays = 30;

  constructor() {
    this.resultsDir = path.join(__dirname, 'results');
    this.historyFile = path.join(this.resultsDir, 'reliability-history.json');
    
    if (!fs.existsSync(this.resultsDir)) {
      fs.mkdirSync(this.resultsDir, { recursive: true });
    }
  }

  async runReliabilityCheck(): Promise<ReliabilityMetrics> {
    console.log('📊 Instagram V2 Reliability Check\n');
    
    const extractor = new InstagramMobileAPIExtractor();
    const startTime = Date.now();
    
    // Test accounts for reliability monitoring
    const testAccounts = ['cristiano', 'therock', 'kyliejenner', 'arianagrande', 'selenagomez'];
    
    const results = {
      total: 0,
      successes: 0,
      responseTimes: [] as number[],
      bioAccuracies: [] as boolean[],
      followerAccuracies: [] as boolean[],
      postRetrievals: [] as boolean[],
      affiliateDetections: [] as boolean[],
      errors: {} as Record<string, number>,
      methods: {
        mobileAPI: { attempts: 0, successes: 0 },
        graphQL: { attempts: 0, successes: 0 },
        scraperAPI: { attempts: 0, successes: 0 }
      }
    };

    for (const username of testAccounts) {
      console.log(`🔍 Checking @${username}...`);
      
      const accountStart = Date.now();
      results.total++;
      results.methods.mobileAPI.attempts++;

      try {
        const result = await extractor.extract(username, {
          detectAffiliates: true,
          maxPosts: 18, // Test pagination
          useFallback: true
        });

        const responseTime = Date.now() - accountStart;
        results.responseTimes.push(responseTime);

        if (result.success && result.profile) {
          results.successes++;
          results.methods.mobileAPI.successes++;

          const profile = result.profile;
          
          // Bio accuracy (not page title)
          const bioValid = this.validateBioQuality(profile.bio);
          results.bioAccuracies.push(bioValid);
          
          // Follower accuracy (reasonable numbers)
          const followerValid = profile.followers > 1000 && profile.followers < 1_000_000_000;
          results.followerAccuracies.push(followerValid);
          
          // Post retrieval success
          const postsValid = profile.posts.length >= 12;
          results.postRetrievals.push(postsValid);
          
          // Affiliate detection (if profile likely has affiliates)
          const affiliatesValid = profile.affiliateAnalysis ? profile.affiliateAnalysis.totalAffiliates >= 0 : false;
          results.affiliateDetections.push(affiliatesValid);

          console.log(`  ✅ ${responseTime}ms - Bio: ${bioValid ? '✅' : '❌'} | Followers: ${followerValid ? '✅' : '❌'} | Posts: ${postsValid ? '✅' : '❌'}`);

          // Track which method was actually used
          if (result.method === 'scraper_api') {
            results.methods.scraperAPI.attempts++;
            results.methods.scraperAPI.successes++;
          }
          if (profile.posts.length > 12) {
            results.methods.graphQL.attempts++;
            results.methods.graphQL.successes++;
          }

        } else {
          console.log(`  ❌ Failed: ${result.error}`);
          
          // Track error types
          const errorType = this.categorizeError(result.error || 'Unknown');
          results.errors[errorType] = (results.errors[errorType] || 0) + 1;
          
          // Add default false values for failed extractions
          results.bioAccuracies.push(false);
          results.followerAccuracies.push(false);
          results.postRetrievals.push(false);
          results.affiliateDetections.push(false);
        }

      } catch (error) {
        const responseTime = Date.now() - accountStart;
        results.responseTimes.push(responseTime);
        
        console.log(`  ❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
        
        const errorType = this.categorizeError(error instanceof Error ? error.message : String(error));
        results.errors[errorType] = (results.errors[errorType] || 0) + 1;
        
        results.bioAccuracies.push(false);
        results.followerAccuracies.push(false);
        results.postRetrievals.push(false);
        results.affiliateDetections.push(false);
      }

      // Rate limiting delay
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Calculate metrics
    const metrics: ReliabilityMetrics = {
      timestamp: new Date(),
      successRate: Math.round((results.successes / results.total) * 100),
      avgResponseTime: Math.round(results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length),
      bioAccuracyRate: Math.round((results.bioAccuracies.filter(Boolean).length / results.bioAccuracies.length) * 100),
      followerAccuracyRate: Math.round((results.followerAccuracies.filter(Boolean).length / results.followerAccuracies.length) * 100),
      postRetrievalRate: Math.round((results.postRetrievals.filter(Boolean).length / results.postRetrievals.length) * 100),
      affiliateDetectionRate: Math.round((results.affiliateDetections.filter(Boolean).length / results.affiliateDetections.length) * 100),
      errorBreakdown: results.errors,
      methodBreakdown: results.methods
    };

    console.log('\n📊 RELIABILITY METRICS:');
    console.log(`  Overall Success:     ${this.formatScore(metrics.successRate)}%`);
    console.log(`  Bio Accuracy:        ${this.formatScore(metrics.bioAccuracyRate)}%`);
    console.log(`  Follower Accuracy:   ${this.formatScore(metrics.followerAccuracyRate)}%`);
    console.log(`  Post Retrieval:      ${this.formatScore(metrics.postRetrievalRate)}%`);
    console.log(`  Affiliate Detection: ${this.formatScore(metrics.affiliateDetectionRate)}%`);
    console.log(`  Avg Response Time:   ${metrics.avgResponseTime}ms`);

    if (Object.keys(metrics.errorBreakdown).length > 0) {
      console.log('\n❌ ERROR BREAKDOWN:');
      Object.entries(metrics.errorBreakdown).forEach(([type, count]) => {
        console.log(`  ${type}: ${count} occurrences`);
      });
    }

    console.log('\n🔧 METHOD BREAKDOWN:');
    console.log(`  Mobile API: ${results.methods.mobileAPI.successes}/${results.methods.mobileAPI.attempts} (${Math.round((results.methods.mobileAPI.successes / Math.max(results.methods.mobileAPI.attempts, 1)) * 100)}%)`);
    if (results.methods.graphQL.attempts > 0) {
      console.log(`  GraphQL: ${results.methods.graphQL.successes}/${results.methods.graphQL.attempts} (${Math.round((results.methods.graphQL.successes / results.methods.graphQL.attempts) * 100)}%)`);
    }
    if (results.methods.scraperAPI.attempts > 0) {
      console.log(`  ScraperAPI: ${results.methods.scraperAPI.successes}/${results.methods.scraperAPI.attempts} (${Math.round((results.methods.scraperAPI.successes / results.methods.scraperAPI.attempts) * 100)}%)`);
    }

    // Save metrics and analyze trends
    await this.saveMetrics(metrics);
    const trends = await this.analyzeTrends();
    
    if (trends) {
      this.displayTrendAnalysis(trends);
    }

    return metrics;
  }

  private validateBioQuality(bio: string): boolean {
    if (!bio || bio.length < 5) return false;
    
    // Check for page title indicators
    const forbiddenWords = ['Followers', 'Following', 'Posts', 'See Instagram', 'photos and videos'];
    const hasPageTitleIndicators = forbiddenWords.some(word => bio.includes(word));
    
    return !hasPageTitleIndicators;
  }

  private categorizeError(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    if (message.includes('401') || message.includes('unauthorized')) return 'AUTHENTICATION_ERROR';
    if (message.includes('429') || message.includes('rate limit')) return 'RATE_LIMITED';
    if (message.includes('403') || message.includes('forbidden')) return 'ACCESS_DENIED';
    if (message.includes('404') || message.includes('not found')) return 'USER_NOT_FOUND';
    if (message.includes('timeout') || message.includes('timed out')) return 'TIMEOUT';
    if (message.includes('network') || message.includes('fetch')) return 'NETWORK_ERROR';
    if (message.includes('json') || message.includes('parse')) return 'PARSING_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  private formatScore(score: number): string {
    if (score >= 80) return `🟢 ${score}`;
    if (score >= 60) return `🟡 ${score}`;
    return `🔴 ${score}`;
  }

  private async saveMetrics(metrics: ReliabilityMetrics): Promise<void> {
    let history: ReliabilityMetrics[] = [];
    
    // Load existing history
    if (fs.existsSync(this.historyFile)) {
      try {
        const historyData = fs.readFileSync(this.historyFile, 'utf8');
        history = JSON.parse(historyData);
      } catch (error) {
        console.log('⚠️ Could not load history file, starting fresh');
      }
    }

    // Add new metrics
    history.push(metrics);

    // Keep only last 30 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.maxHistoryDays);
    history = history.filter(entry => new Date(entry.timestamp) > cutoffDate);

    // Save updated history
    fs.writeFileSync(this.historyFile, JSON.stringify(history, null, 2));
    
    // Also save current run
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const currentRunFile = path.join(this.resultsDir, `reliability-${timestamp}.json`);
    fs.writeFileSync(currentRunFile, JSON.stringify(metrics, null, 2));
    
    console.log(`\n💾 Metrics saved to reliability history (${history.length} entries)`);
  }

  private async analyzeTrends(): Promise<TrendAnalysis | null> {
    if (!fs.existsSync(this.historyFile)) {
      return null;
    }

    try {
      const historyData = fs.readFileSync(this.historyFile, 'utf8');
      const history: ReliabilityMetrics[] = JSON.parse(historyData);

      if (history.length < 2) {
        return null;
      }

      // Get recent metrics (last 7 days)
      const recentCutoff = new Date();
      recentCutoff.setDate(recentCutoff.getDate() - 7);
      const recentMetrics = history.filter(entry => new Date(entry.timestamp) > recentCutoff);

      if (recentMetrics.length < 2) {
        return null;
      }

      // Calculate trends
      const latest = recentMetrics[recentMetrics.length - 1];
      const baseline = recentMetrics[0];

      const successTrend = latest.successRate - baseline.successRate;
      const responseTrend = latest.avgResponseTime - baseline.avgResponseTime;
      const bioTrend = latest.bioAccuracyRate - baseline.bioAccuracyRate;

      const degradationDetected = successTrend < -10 || responseTrend > 2000 || bioTrend < -15;
      const improvementDetected = successTrend > 10 || (responseTrend < -1000 && successTrend > 0);

      const recommendations: string[] = [];
      const alerts: string[] = [];

      if (degradationDetected) {
        alerts.push('Performance degradation detected');
        if (successTrend < -10) recommendations.push('Investigate API endpoint changes');
        if (responseTrend > 2000) recommendations.push('Check for rate limiting issues');
        if (bioTrend < -15) recommendations.push('Verify bio extraction logic');
      }

      if (latest.successRate < 30) {
        alerts.push('Critical: Success rate below 30%');
        recommendations.push('Consider switching to ScraperAPI fallback');
      }

      if (improvementDetected) {
        recommendations.push('Performance improving - continue current approach');
      }

      return {
        timeframe: `${recentMetrics.length} measurements over 7 days`,
        degradationDetected,
        improvementDetected,
        recommendations,
        alerts
      };

    } catch (error) {
      console.log('⚠️ Could not analyze trends:', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private displayTrendAnalysis(trends: TrendAnalysis): void {
    console.log('\n📈 TREND ANALYSIS:');
    console.log(`  Timeframe: ${trends.timeframe}`);
    console.log(`  Degradation: ${trends.degradationDetected ? '🔴 Yes' : '🟢 No'}`);
    console.log(`  Improvement: ${trends.improvementDetected ? '🟢 Yes' : '⚪ No'}`);

    if (trends.alerts.length > 0) {
      console.log('\n🚨 ALERTS:');
      trends.alerts.forEach(alert => console.log(`  ⚠️ ${alert}`));
    }

    if (trends.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      trends.recommendations.forEach(rec => console.log(`  • ${rec}`));
    }
  }

  async getHistoricalData(): Promise<ReliabilityMetrics[]> {
    if (!fs.existsSync(this.historyFile)) {
      return [];
    }

    try {
      const historyData = fs.readFileSync(this.historyFile, 'utf8');
      return JSON.parse(historyData);
    } catch (error) {
      console.log('⚠️ Could not load historical data');
      return [];
    }
  }

  generateTextDashboard(metrics: ReliabilityMetrics): string {
    const dashboard = `
╭─────────────────────────────────────────────╮
│          INSTAGRAM V2 RELIABILITY           │
├─────────────────────────────────────────────┤
│ Success Rate:     ${metrics.successRate.toString().padStart(3)}%                   │
│ Bio Accuracy:     ${metrics.bioAccuracyRate.toString().padStart(3)}%                   │
│ Response Time:    ${metrics.avgResponseTime.toString().padStart(4)}ms                  │
│ Post Retrieval:   ${metrics.postRetrievalRate.toString().padStart(3)}%                   │
│ Affiliate Detect: ${metrics.affiliateDetectionRate.toString().padStart(3)}%                   │
├─────────────────────────────────────────────┤
│ Status: ${this.getOverallStatus(metrics).padEnd(32)} │
╰─────────────────────────────────────────────╯
    `.trim();

    return dashboard;
  }

  private getOverallStatus(metrics: ReliabilityMetrics): string {
    if (metrics.successRate >= 70) return '🟢 EXCELLENT';
    if (metrics.successRate >= 50) return '🟡 GOOD';
    if (metrics.successRate >= 30) return '🟠 FAIR';
    return '🔴 POOR';
  }
}

// Continuous monitoring function
export async function startReliabilityMonitoring(intervalMinutes: number = 60): Promise<void> {
  const monitor = new InstagramV2ReliabilityMonitor();
  
  console.log(`🔄 Starting Instagram V2 reliability monitoring (every ${intervalMinutes} minutes)`);
  
  const runCheck = async () => {
    try {
      const metrics = await monitor.runReliabilityCheck();
      const dashboard = monitor.generateTextDashboard(metrics);
      console.log('\n' + dashboard);
      
      // Log to file for external monitoring
      const logEntry = `${new Date().toISOString()} - Success: ${metrics.successRate}% | Response: ${metrics.avgResponseTime}ms | Bio: ${metrics.bioAccuracyRate}%\n`;
      fs.appendFileSync(path.join(__dirname, 'results', 'monitoring.log'), logEntry);
      
    } catch (error) {
      console.log(`❌ Monitoring check failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Run initial check
  await runCheck();

  // Schedule recurring checks
  setInterval(runCheck, intervalMinutes * 60 * 1000);
}

// Single reliability check
export async function runSingleReliabilityCheck(): Promise<ReliabilityMetrics> {
  const monitor = new InstagramV2ReliabilityMonitor();
  const metrics = await monitor.runReliabilityCheck();
  
  const dashboard = monitor.generateTextDashboard(metrics);
  console.log('\n' + dashboard);
  
  return metrics;
}

// Run test if executed directly
if (require.main === module) {
  // Check for monitoring mode
  const args = process.argv.slice(2);
  const monitorMode = args.includes('--monitor');
  const intervalArg = args.find(arg => arg.startsWith('--interval='));
  const interval = intervalArg ? parseInt(intervalArg.split('=')[1]) : 60;

  if (monitorMode) {
    console.log('Starting continuous monitoring mode...');
    startReliabilityMonitoring(interval).catch(console.error);
  } else {
    runSingleReliabilityCheck().catch(console.error);
  }
}