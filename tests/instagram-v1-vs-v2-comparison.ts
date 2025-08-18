#!/usr/bin/env ts-node

/**
 * Instagram V1 vs V2 Extractor Comparison Test
 * 
 * Compares the new Instagram V2 mobile API system against the original
 * browser-based V1 extractor to measure improvements in reliability,
 * speed, and data quality.
 */

import { InstagramMobileAPIExtractor } from '../src/extractors/instagramMobileAPI';
import { FixedInstagramExtractor } from './extractors-fixed/instagram-fixed';
import * as fs from 'fs';
import * as path from 'path';

interface ExtractorComparison {
  testAccount: string;
  v1Result: {
    success: boolean;
    responseTime: number;
    bioQuality: 'good' | 'page_title' | 'empty';
    followerCount: number;
    postsRetrieved: number;
    error?: string;
  };
  v2Result: {
    success: boolean;
    responseTime: number;
    bioQuality: 'good' | 'page_title' | 'empty';
    followerCount: number;
    postsRetrieved: number;
    affiliatesDetected: number;
    method: string;
    error?: string;
  };
  winner: 'v1' | 'v2' | 'tie';
  improvements: string[];
  regressions: string[];
}

interface ComparisonSummary {
  timestamp: Date;
  testAccounts: number;
  v1Stats: {
    successRate: number;
    avgResponseTime: number;
    avgPostsRetrieved: number;
    bioQualityRate: number;
  };
  v2Stats: {
    successRate: number;
    avgResponseTime: number;
    avgPostsRetrieved: number;
    bioQualityRate: number;
    affiliateDetectionRate: number;
    methodBreakdown: Record<string, number>;
  };
  improvements: {
    successRate: number;
    responseTime: number;
    bioQuality: number;
    postRetrieval: number;
  };
  recommendation: string;
  migrationReady: boolean;
}

export class InstagramV1V2Comparator {
  private v1Extractor: FixedInstagramExtractor;
  private v2Extractor: InstagramMobileAPIExtractor;

  constructor(scraperAPIKey?: string) {
    this.v1Extractor = new FixedInstagramExtractor();
    this.v2Extractor = new InstagramMobileAPIExtractor(scraperAPIKey);
  }

  async runComparison(): Promise<ComparisonSummary> {
    console.log('⚡ Instagram V1 vs V2 Comparison Test\n');
    
    // Test accounts that work well with both extractors
    const testAccounts = ['cristiano', 'therock', 'kyliejenner', 'arianagrande'];
    const comparisons: ExtractorComparison[] = [];

    for (const username of testAccounts) {
      console.log(`🔍 Comparing extractors for @${username}...`);
      
      const comparison = await this.compareExtractors(username);
      comparisons.push(comparison);

      console.log(`  Winner: ${comparison.winner === 'v1' ? '🥇 V1' : comparison.winner === 'v2' ? '🥇 V2' : '🤝 Tie'}`);
      
      if (comparison.improvements.length > 0) {
        console.log(`  Improvements: ${comparison.improvements.join(', ')}`);
      }
      if (comparison.regressions.length > 0) {
        console.log(`  Regressions: ${comparison.regressions.join(', ')}`);
      }

      console.log('');
      
      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Calculate summary statistics
    const summary = this.calculateSummary(comparisons);
    
    // Display comparison dashboard
    this.displayComparisonDashboard(summary, comparisons);
    
    // Save results
    await this.saveComparisonResults(summary, comparisons);

    return summary;
  }

  private async compareExtractors(username: string): Promise<ExtractorComparison> {
    console.log(`  📱 Testing V1 (browser)...`);
    
    // Test V1 extractor
    const v1Start = Date.now();
    let v1Result;
    
    try {
      const v1Profile = await this.v1Extractor.getProfile(username);
      const v1ResponseTime = Date.now() - v1Start;
      
      if (v1Profile) {
        v1Result = {
          success: true,
          responseTime: v1ResponseTime,
          bioQuality: this.assessBioQuality(v1Profile.bioText || ''),
          followerCount: v1Profile.followerCount || 0,
          postsRetrieved: 0 // V1 doesn't retrieve posts
        };
        console.log(`    ✅ ${v1ResponseTime}ms - Bio: "${(v1Profile.bioText || '').substring(0, 40)}..."`);
      } else {
        throw new Error('V1 extraction returned null');
      }
    } catch (error) {
      const v1ResponseTime = Date.now() - v1Start;
      v1Result = {
        success: false,
        responseTime: v1ResponseTime,
        bioQuality: 'empty' as const,
        followerCount: 0,
        postsRetrieved: 0,
        error: error instanceof Error ? error.message : String(error)
      };
      console.log(`    ❌ Failed: ${v1Result.error}`);
    }

    console.log(`  🚀 Testing V2 (mobile API + GraphQL + affiliates)...`);
    
    // Test V2 extractor
    const v2Start = Date.now();
    let v2Result;
    
    try {
      const v2Profile = await this.v2Extractor.extract(username, {
        detectAffiliates: true,
        maxPosts: 18,
        useFallback: true
      });
      const v2ResponseTime = Date.now() - v2Start;
      
      if (v2Profile.success && v2Profile.profile) {
        const profile = v2Profile.profile;
        v2Result = {
          success: true,
          responseTime: v2ResponseTime,
          bioQuality: this.assessBioQuality(profile.bio),
          followerCount: profile.followers,
          postsRetrieved: profile.posts.length,
          affiliatesDetected: profile.affiliateAnalysis?.totalAffiliates || 0,
          method: v2Profile.method
        };
        console.log(`    ✅ ${v2ResponseTime}ms - Bio: "${profile.bio.substring(0, 40)}..." | Posts: ${profile.posts.length} | Method: ${v2Profile.method}`);
      } else {
        throw new Error(v2Profile.error || 'V2 extraction failed');
      }
    } catch (error) {
      const v2ResponseTime = Date.now() - v2Start;
      v2Result = {
        success: false,
        responseTime: v2ResponseTime,
        bioQuality: 'empty' as const,
        followerCount: 0,
        postsRetrieved: 0,
        affiliatesDetected: 0,
        method: 'failed',
        error: error instanceof Error ? error.message : String(error)
      };
      console.log(`    ❌ Failed: ${v2Result.error}`);
    }

    // Determine winner and analyze differences
    const { winner, improvements, regressions } = this.analyzeComparison(v1Result, v2Result);

    return {
      testAccount: username,
      v1Result,
      v2Result,
      winner,
      improvements,
      regressions
    };
  }

  private assessBioQuality(bio: string): 'good' | 'page_title' | 'empty' {
    if (!bio || bio.length < 3) return 'empty';
    
    // Check for page title indicators
    const pageTitleWords = ['Followers', 'Following', 'Posts', 'See Instagram photos and videos'];
    const hasPageTitleWords = pageTitleWords.some(word => bio.includes(word));
    
    if (hasPageTitleWords) return 'page_title';
    return 'good';
  }

  private analyzeComparison(v1: any, v2: any): {
    winner: 'v1' | 'v2' | 'tie';
    improvements: string[];
    regressions: string[];
  } {
    const improvements: string[] = [];
    const regressions: string[] = [];

    // Success rate comparison
    if (v2.success && !v1.success) improvements.push('Fixed extraction failures');
    if (!v2.success && v1.success) regressions.push('New extraction failures');

    // Bio quality comparison
    if (v2.bioQuality === 'good' && v1.bioQuality !== 'good') improvements.push('Better bio extraction');
    if (v2.bioQuality !== 'good' && v1.bioQuality === 'good') regressions.push('Bio quality regression');

    // Speed comparison (V2 slower is expected due to more features)
    if (v2.responseTime < v1.responseTime * 1.5) improvements.push('Reasonable response time');
    if (v2.responseTime > v1.responseTime * 3) regressions.push('Significantly slower');

    // New features in V2
    if (v2.postsRetrieved > 0) improvements.push('Post retrieval capability');
    if (v2.affiliatesDetected > 0) improvements.push('Affiliate detection capability');

    // Determine winner based on weighted criteria
    let v1Score = 0;
    let v2Score = 0;

    // Success is most important
    if (v1.success) v1Score += 40;
    if (v2.success) v2Score += 40;

    // Bio quality is second most important
    if (v1.bioQuality === 'good') v1Score += 30;
    if (v2.bioQuality === 'good') v2Score += 30;

    // V2 gets points for additional features
    if (v2.postsRetrieved > 0) v2Score += 20;
    if (v2.affiliatesDetected > 0) v2Score += 10;

    // Speed penalty for V2 if extremely slow
    if (v2.responseTime > v1.responseTime * 3) v2Score -= 10;

    let winner: 'v1' | 'v2' | 'tie';
    if (v2Score > v1Score + 5) winner = 'v2';
    else if (v1Score > v2Score + 5) winner = 'v1';
    else winner = 'tie';

    return { winner, improvements, regressions };
  }

  private calculateSummary(comparisons: ExtractorComparison[]): ComparisonSummary {
    const v1Results = comparisons.map(c => c.v1Result);
    const v2Results = comparisons.map(c => c.v2Result);

    // V1 statistics
    const v1Successes = v1Results.filter(r => r.success).length;
    const v1SuccessRate = (v1Successes / v1Results.length) * 100;
    const v1AvgResponseTime = v1Results.reduce((sum, r) => sum + r.responseTime, 0) / v1Results.length;
    const v1AvgPosts = v1Results.reduce((sum, r) => sum + r.postsRetrieved, 0) / v1Results.length;
    const v1BioQualityRate = (v1Results.filter(r => r.bioQuality === 'good').length / v1Results.length) * 100;

    // V2 statistics
    const v2Successes = v2Results.filter(r => r.success).length;
    const v2SuccessRate = (v2Successes / v2Results.length) * 100;
    const v2AvgResponseTime = v2Results.reduce((sum, r) => sum + r.responseTime, 0) / v2Results.length;
    const v2AvgPosts = v2Results.reduce((sum, r) => sum + r.postsRetrieved, 0) / v2Results.length;
    const v2BioQualityRate = (v2Results.filter(r => r.bioQuality === 'good').length / v2Results.length) * 100;
    const v2AffiliateRate = (v2Results.filter(r => r.affiliatesDetected > 0).length / v2Results.length) * 100;

    // Method breakdown for V2
    const methodBreakdown: Record<string, number> = {};
    v2Results.forEach(r => {
      if (r.success && r.method) {
        methodBreakdown[r.method] = (methodBreakdown[r.method] || 0) + 1;
      }
    });

    // Calculate improvements
    const improvements = {
      successRate: v2SuccessRate - v1SuccessRate,
      responseTime: v1AvgResponseTime - v2AvgResponseTime, // Positive = V2 is faster
      bioQuality: v2BioQualityRate - v1BioQualityRate,
      postRetrieval: v2AvgPosts - v1AvgPosts
    };

    // Generate recommendation
    let recommendation = 'Continue with V1 extractor';
    let migrationReady = false;

    if (improvements.successRate > 20 && improvements.bioQuality > 10) {
      recommendation = 'Migrate to V2 extractor - significant improvements';
      migrationReady = true;
    } else if (improvements.successRate > 10 || improvements.bioQuality > 20) {
      recommendation = 'Consider migrating to V2 - moderate improvements';
      migrationReady = true;
    } else if (v2SuccessRate > 60 && v2BioQualityRate > 80) {
      recommendation = 'V2 extractor is reliable - safe to migrate';
      migrationReady = true;
    } else if (v2SuccessRate < 30) {
      recommendation = 'V2 needs improvement before migration';
    }

    return {
      timestamp: new Date(),
      testAccounts: comparisons.length,
      v1Stats: {
        successRate: Math.round(v1SuccessRate),
        avgResponseTime: Math.round(v1AvgResponseTime),
        avgPostsRetrieved: Math.round(v1AvgPosts),
        bioQualityRate: Math.round(v1BioQualityRate)
      },
      v2Stats: {
        successRate: Math.round(v2SuccessRate),
        avgResponseTime: Math.round(v2AvgResponseTime),
        avgPostsRetrieved: Math.round(v2AvgPosts),
        bioQualityRate: Math.round(v2BioQualityRate),
        affiliateDetectionRate: Math.round(v2AffiliateRate),
        methodBreakdown
      },
      improvements: {
        successRate: Math.round(improvements.successRate),
        responseTime: Math.round(improvements.responseTime),
        bioQuality: Math.round(improvements.bioQuality),
        postRetrieval: Math.round(improvements.postRetrieval)
      },
      recommendation,
      migrationReady
    };
  }

  private displayComparisonDashboard(summary: ComparisonSummary, comparisons: ExtractorComparison[]): void {
    console.log('\n' + '='.repeat(70));
    console.log('⚡ INSTAGRAM V1 vs V2 COMPARISON DASHBOARD');
    console.log('='.repeat(70));

    console.log('\n📊 SUCCESS RATES:');
    console.log(`  V1 (Browser):     ${this.formatComparison(summary.v1Stats.successRate, summary.v2Stats.successRate)}%`);
    console.log(`  V2 (Mobile API):  ${this.formatComparison(summary.v2Stats.successRate, summary.v1Stats.successRate)}%`);
    console.log(`  Improvement:      ${this.formatDelta(summary.improvements.successRate)}%`);

    console.log('\n🚀 PERFORMANCE:');
    console.log(`  V1 Response Time: ${summary.v1Stats.avgResponseTime}ms`);
    console.log(`  V2 Response Time: ${summary.v2Stats.avgResponseTime}ms`);
    console.log(`  Speed Change:     ${this.formatTimeDelta(summary.improvements.responseTime)}ms`);

    console.log('\n📝 DATA QUALITY:');
    console.log(`  V1 Bio Quality:   ${this.formatComparison(summary.v1Stats.bioQualityRate, summary.v2Stats.bioQualityRate)}%`);
    console.log(`  V2 Bio Quality:   ${this.formatComparison(summary.v2Stats.bioQualityRate, summary.v1Stats.bioQualityRate)}%`);
    console.log(`  Bio Improvement:  ${this.formatDelta(summary.improvements.bioQuality)}%`);

    console.log('\n🆕 NEW CAPABILITIES (V2 Only):');
    console.log(`  Posts Retrieved:  ${summary.v2Stats.avgPostsRetrieved} avg per profile`);
    console.log(`  Affiliate Detection: ${summary.v2Stats.affiliateDetectionRate}% of profiles`);
    console.log(`  GraphQL Pagination: ${summary.v2Stats.methodBreakdown['mobile_api'] || 0} uses`);
    console.log(`  ScraperAPI Fallback: ${summary.v2Stats.methodBreakdown['scraper_api'] || 0} uses`);

    console.log('\n🏆 HEAD-TO-HEAD WINS:');
    const v1Wins = comparisons.filter(c => c.winner === 'v1').length;
    const v2Wins = comparisons.filter(c => c.winner === 'v2').length;
    const ties = comparisons.filter(c => c.winner === 'tie').length;
    
    console.log(`  V1 Wins: ${v1Wins}/${comparisons.length}`);
    console.log(`  V2 Wins: ${v2Wins}/${comparisons.length}`);
    console.log(`  Ties:    ${ties}/${comparisons.length}`);

    console.log('\n🎯 MIGRATION READINESS:');
    console.log(`  Status: ${summary.migrationReady ? '🟢 READY' : '🔴 NOT READY'}`);
    console.log(`  Recommendation: ${summary.recommendation}`);

    if (summary.migrationReady) {
      console.log('\n✅ MIGRATION BENEFITS:');
      if (summary.improvements.successRate > 0) console.log(`  • +${summary.improvements.successRate}% success rate`);
      if (summary.improvements.bioQuality > 0) console.log(`  • +${summary.improvements.bioQuality}% bio quality`);
      if (summary.v2Stats.avgPostsRetrieved > 0) console.log(`  • Post retrieval capability`);
      if (summary.v2Stats.affiliateDetectionRate > 0) console.log(`  • Affiliate detection capability`);
      console.log(`  • Progressive fallback system`);
    }
  }

  private formatComparison(current: number, comparison: number): string {
    const diff = current - comparison;
    if (Math.abs(diff) < 5) return `🟡 ${current}`;
    if (diff > 0) return `🟢 ${current}`;
    return `🔴 ${current}`;
  }

  private formatDelta(delta: number): string {
    if (Math.abs(delta) < 2) return `⚪ ${delta >= 0 ? '+' : ''}${delta}`;
    if (delta > 0) return `🟢 +${delta}`;
    return `🔴 ${delta}`;
  }

  private formatTimeDelta(delta: number): string {
    if (Math.abs(delta) < 500) return `⚪ ${delta >= 0 ? '+' : ''}${delta}`;
    if (delta > 0) return `🟢 +${delta} (faster)`;
    return `🔴 ${delta} (slower)`;
  }

  private async saveComparisonResults(summary: ComparisonSummary, comparisons: ExtractorComparison[]): Promise<void> {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `v1-vs-v2-comparison-${timestamp}.json`;
    const filePath = path.join(resultsDir, filename);

    const fullResults = {
      summary,
      detailedComparisons: comparisons,
      metadata: {
        testDate: new Date().toISOString(),
        testType: 'v1_vs_v2_comparison',
        accounts_tested: comparisons.length
      }
    };

    fs.writeFileSync(filePath, JSON.stringify(fullResults, null, 2));
    console.log(`\n💾 Comparison results saved to: ${filePath}`);
  }
}

// Quick comparison function
export async function quickV1V2Comparison(username: string): Promise<ExtractorComparison> {
  const comparator = new InstagramV1V2Comparator();
  console.log(`⚡ Quick V1 vs V2 comparison for @${username}`);
  
  const comparison = await comparator.compareExtractors(username);
  
  console.log(`\nResult: ${comparison.winner === 'v1' ? 'V1 wins' : comparison.winner === 'v2' ? 'V2 wins' : 'Tie'}`);
  if (comparison.improvements.length > 0) {
    console.log(`Improvements: ${comparison.improvements.join(', ')}`);
  }
  
  return comparison;
}

// Main test execution
async function runV1V2Comparison() {
  const scraperAPIKey = process.env.SCRAPER_API_KEY;
  const comparator = new InstagramV1V2Comparator(scraperAPIKey);
  
  if (!scraperAPIKey) {
    console.log('⚠️ SCRAPER_API_KEY not set - V2 fallback testing limited');
  }

  const summary = await comparator.runComparison();
  
  console.log('\n🏁 V1 vs V2 comparison completed!');
  console.log(`Migration recommendation: ${summary.recommendation}`);
  
  return summary;
}

// Export for use in other test files
export { runV1V2Comparison, InstagramV1V2Comparator, quickV1V2Comparison };

// Run test if executed directly
if (require.main === module) {
  runV1V2Comparison().catch(console.error);
}