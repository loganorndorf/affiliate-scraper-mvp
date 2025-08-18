#!/usr/bin/env ts-node

/**
 * Instagram V2 Comprehensive Test Suite
 * 
 * Tests the complete Instagram V2 extractor system including:
 * - Mobile API extraction
 * - GraphQL pagination
 * - Affiliate detection
 * - ScraperAPI fallback
 * - Performance and reliability metrics
 */

import { InstagramMobileAPIExtractor, InstagramProfile, InstagramPost } from '../src/extractors/instagramMobileAPI';
import { AffiliateDetector, AffiliateInfo } from '../src/extractors/affiliateDetector';
import { InstagramGraphQLClient } from '../src/extractors/instagramGraphQL';
import { ScraperAPIClient } from '../src/extractors/scraperAPIClient';
import * as fs from 'fs';
import * as path from 'path';

// Test account configurations
const TEST_ACCOUNTS = [
  {
    username: 'cristiano',
    expected: {
      bioContains: ['footballer', 'CR7', 'Manchester', 'Portugal'],
      followers: { min: 600_000_000, max: 700_000_000 },
      minPosts: 12,
      hasAffiliates: true,
      isVerified: true,
      hasMorePosts: true
    }
  },
  {
    username: 'therock',
    expected: {
      bioContains: ['actor', 'producer', 'entrepreneur'],
      followers: { min: 390_000_000, max: 450_000_000 },
      minPosts: 12,
      hasAffiliates: true,
      isVerified: true,
      hasMorePosts: true
    }
  },
  {
    username: 'kyliejenner',
    expected: {
      bioContains: ['Kylie', 'beauty', 'cosmetics'],
      followers: { min: 390_000_000, max: 450_000_000 },
      minPosts: 12,
      hasAffiliates: true,
      isVerified: true,
      hasMorePosts: true
    }
  }
];

interface ProfileTestResult {
  bioAccuracy: boolean;
  bioIsNotPageTitle: boolean;
  bioContainsExpectedKeywords: boolean;
  followerCountInRange: boolean;
  verificationAccurate: boolean;
  bioLinkExtracted: boolean;
  responseTime: number;
  score: number; // 0-100
}

interface PostTestResult {
  minPostsRetrieved: boolean;
  captionsExtracted: boolean;
  mediaUrlsValid: boolean;
  timestampsValid: boolean;
  uniquePostIds: boolean;
  score: number; // 0-100
}

interface AffiliateTestResult {
  knownAffiliatesDetected: number;
  discountCodesFound: number;
  linkInBioMentions: number;
  falsePositiveRate: number;
  averageConfidence: number;
  score: number; // 0-100
}

interface PerformanceTestResult {
  responseTime: number;
  successRate: number;
  memoryUsage: number;
  score: number; // 0-100
}

interface ComprehensiveTestResult {
  platform: 'instagram-v2';
  timestamp: Date;
  results: {
    successRate: number;
    bioAccuracy: number;
    postsRetrieved: number;
    affiliatesFound: number;
    averageResponseTime: number;
  };
  comparison?: {
    vsV1?: string;
    vsPaid?: string;
  };
  recommendation: string;
  details: {
    profileTests: ProfileTestResult[];
    postTests: PostTestResult[];
    affiliateTests: AffiliateTestResult[];
    performanceTests: PerformanceTestResult[];
  };
}

export class InstagramV2TestSuite {
  private mobileAPIExtractor: InstagramMobileAPIExtractor;
  private affiliateDetector: AffiliateDetector;
  private graphqlClient: InstagramGraphQLClient;
  private scraperAPIClient?: ScraperAPIClient;

  constructor(scraperAPIKey?: string) {
    this.mobileAPIExtractor = new InstagramMobileAPIExtractor(scraperAPIKey);
    this.affiliateDetector = new AffiliateDetector();
    this.graphqlClient = new InstagramGraphQLClient();
    
    if (scraperAPIKey) {
      this.scraperAPIClient = new ScraperAPIClient({
        apiKey: scraperAPIKey,
        deviceType: 'mobile',
        renderJS: false
      });
    }
  }

  async runComprehensiveTest(): Promise<ComprehensiveTestResult> {
    console.log('🧪 Instagram V2 Comprehensive Test Suite\n');
    
    const testStartTime = Date.now();
    const profileTests: ProfileTestResult[] = [];
    const postTests: PostTestResult[] = [];
    const affiliateTests: AffiliateTestResult[] = [];
    const performanceTests: PerformanceTestResult[] = [];

    let totalSuccesses = 0;
    let totalTests = 0;
    let totalPostsRetrieved = 0;
    let totalAffiliatesFound = 0;
    let totalResponseTime = 0;

    for (const testAccount of TEST_ACCOUNTS) {
      console.log(`🔍 Testing @${testAccount.username}...`);
      totalTests++;

      const accountStartTime = Date.now();
      
      try {
        // Main extraction test
        const result = await this.mobileAPIExtractor.extract(testAccount.username, {
          detectAffiliates: true,
          maxPosts: 24, // Test pagination
          useFallback: true
        });

        const accountResponseTime = Date.now() - accountStartTime;
        totalResponseTime += accountResponseTime;

        if (result.success && result.profile) {
          totalSuccesses++;
          const profile = result.profile;
          
          // Run all test categories
          const profileTest = await this.testProfile(profile, testAccount.expected, accountResponseTime);
          const postTest = await this.testPosts(profile.posts, testAccount.expected);
          const affiliateTest = await this.testAffiliates(profile, testAccount.expected);
          const performanceTest = await this.testPerformance(result, accountResponseTime);

          profileTests.push(profileTest);
          postTests.push(postTest);
          affiliateTests.push(affiliateTest);
          performanceTests.push(performanceTest);

          totalPostsRetrieved += profile.posts.length;
          totalAffiliatesFound += profile.affiliateAnalysis?.totalAffiliates || 0;

          console.log(`  ✅ Profile: ${profileTest.score}% | Posts: ${postTest.score}% | Affiliates: ${affiliateTest.score}% | Performance: ${performanceTest.score}%`);
          
        } else {
          console.log(`  ❌ Extraction failed: ${result.error}`);
          
          // Add zero scores for failed extraction
          profileTests.push({ bioAccuracy: false, bioIsNotPageTitle: false, bioContainsExpectedKeywords: false, followerCountInRange: false, verificationAccurate: false, bioLinkExtracted: false, responseTime: accountResponseTime, score: 0 });
          postTests.push({ minPostsRetrieved: false, captionsExtracted: false, mediaUrlsValid: false, timestampsValid: false, uniquePostIds: false, score: 0 });
          affiliateTests.push({ knownAffiliatesDetected: 0, discountCodesFound: 0, linkInBioMentions: 0, falsePositiveRate: 0, averageConfidence: 0, score: 0 });
          performanceTests.push({ responseTime: accountResponseTime, successRate: 0, memoryUsage: 0, score: 0 });
        }

      } catch (error) {
        console.log(`  ❌ Test exception: ${error instanceof Error ? error.message : String(error)}`);
        
        const accountResponseTime = Date.now() - accountStartTime;
        totalResponseTime += accountResponseTime;

        // Add zero scores for exception
        profileTests.push({ bioAccuracy: false, bioIsNotPageTitle: false, bioContainsExpectedKeywords: false, followerCountInRange: false, verificationAccurate: false, bioLinkExtracted: false, responseTime: accountResponseTime, score: 0 });
        postTests.push({ minPostsRetrieved: false, captionsExtracted: false, mediaUrlsValid: false, timestampsValid: false, uniquePostIds: false, score: 0 });
        affiliateTests.push({ knownAffiliatesDetected: 0, discountCodesFound: 0, linkInBioMentions: 0, falsePositiveRate: 0, averageConfidence: 0, score: 0 });
        performanceTests.push({ responseTime: accountResponseTime, successRate: 0, memoryUsage: 0, score: 0 });
      }

      // Delay between tests
      await new Promise(resolve => setTimeout(resolve, 3000));
    }

    // Calculate overall metrics
    const successRate = (totalSuccesses / totalTests) * 100;
    const avgBioAccuracy = profileTests.reduce((sum, test) => sum + test.score, 0) / profileTests.length;
    const avgPostsRetrieved = totalPostsRetrieved / totalTests;
    const avgAffiliatesFound = totalAffiliatesFound / totalTests;
    const avgResponseTime = totalResponseTime / totalTests;

    // Generate recommendation
    let recommendation = 'Continue with Instagram V2 mobile API';
    if (successRate < 30) {
      recommendation = 'Consider fallback to ScraperAPI for reliability';
    } else if (successRate > 70) {
      recommendation = 'Instagram V2 mobile API performing well';
    }

    const comprehensiveResult: ComprehensiveTestResult = {
      platform: 'instagram-v2',
      timestamp: new Date(),
      results: {
        successRate: Math.round(successRate),
        bioAccuracy: Math.round(avgBioAccuracy),
        postsRetrieved: Math.round(avgPostsRetrieved),
        affiliatesFound: Math.round(avgAffiliatesFound),
        averageResponseTime: Math.round(avgResponseTime)
      },
      recommendation,
      details: {
        profileTests,
        postTests,
        affiliateTests,
        performanceTests
      }
    };

    // Display results dashboard
    this.displayDashboard(comprehensiveResult);

    // Save results
    await this.saveResults(comprehensiveResult);

    return comprehensiveResult;
  }

  private async testProfile(profile: InstagramProfile, expected: any, responseTime: number): Promise<ProfileTestResult> {
    const tests = {
      bioAccuracy: profile.bio.length > 0,
      bioIsNotPageTitle: this.validateBioIsNotPageTitle(profile.bio),
      bioContainsExpectedKeywords: this.validateBioKeywords(profile.bio, expected.bioContains),
      followerCountInRange: profile.followers >= expected.followers.min && profile.followers <= expected.followers.max,
      verificationAccurate: profile.isVerified === expected.isVerified,
      bioLinkExtracted: profile.bioLink !== undefined
    };

    const passedTests = Object.values(tests).filter(Boolean).length;
    const score = Math.round((passedTests / Object.keys(tests).length) * 100);

    return {
      ...tests,
      responseTime,
      score
    };
  }

  private async testPosts(posts: InstagramPost[], expected: any): Promise<PostTestResult> {
    const tests = {
      minPostsRetrieved: posts.length >= expected.minPosts,
      captionsExtracted: posts.every(post => typeof post.caption === 'string'),
      mediaUrlsValid: posts.every(post => post.imageUrl && post.imageUrl.startsWith('http')),
      timestampsValid: posts.every(post => post.timestamp instanceof Date && !isNaN(post.timestamp.getTime())),
      uniquePostIds: new Set(posts.map(p => p.id)).size === posts.length
    };

    const passedTests = Object.values(tests).filter(Boolean).length;
    const score = Math.round((passedTests / Object.keys(tests).length) * 100);

    return {
      ...tests,
      score
    };
  }

  private async testAffiliates(profile: InstagramProfile, expected: any): Promise<AffiliateTestResult> {
    const analysis = profile.affiliateAnalysis;
    
    if (!analysis) {
      return {
        knownAffiliatesDetected: 0,
        discountCodesFound: 0,
        linkInBioMentions: 0,
        falsePositiveRate: 0,
        averageConfidence: 0,
        score: 0
      };
    }

    // Count specific types
    const discountCodes = analysis.affiliates.filter(a => a.type === 'discount_code').length;
    const linkInBioMentions = analysis.affiliates.filter(a => a.type === 'link_in_bio').length;

    // Calculate false positive rate (affiliates with confidence < 0.5)
    const lowConfidenceAffiliates = analysis.affiliates.filter(a => a.confidence < 0.5).length;
    const falsePositiveRate = analysis.totalAffiliates > 0 ? (lowConfidenceAffiliates / analysis.totalAffiliates) * 100 : 0;

    // Score based on detection quality
    let score = 0;
    if (expected.hasAffiliates && analysis.totalAffiliates > 0) score += 40;
    if (analysis.averageConfidence > 0.7) score += 30;
    if (falsePositiveRate < 10) score += 30;

    return {
      knownAffiliatesDetected: analysis.totalAffiliates,
      discountCodesFound: discountCodes,
      linkInBioMentions: linkInBioMentions,
      falsePositiveRate: Math.round(falsePositiveRate),
      averageConfidence: Math.round(analysis.averageConfidence * 100),
      score: Math.min(score, 100)
    };
  }

  private async testPerformance(result: any, responseTime: number): Promise<PerformanceTestResult> {
    const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024; // MB

    let score = 0;
    
    // Response time scoring (under 5 seconds = full points)
    if (responseTime < 5000) score += 40;
    else if (responseTime < 10000) score += 20;
    
    // Success rate scoring
    if (result.success) score += 40;
    
    // Memory usage scoring (under 100MB = full points)
    if (memoryUsage < 100) score += 20;
    else if (memoryUsage < 200) score += 10;

    return {
      responseTime,
      successRate: result.success ? 100 : 0,
      memoryUsage: Math.round(memoryUsage),
      score
    };
  }

  private validateBioIsNotPageTitle(bio: string): boolean {
    const forbiddenWords = ['Followers', 'Following', 'Posts', 'See Instagram', 'photos and videos'];
    return !forbiddenWords.some(word => bio.includes(word));
  }

  private validateBioKeywords(bio: string, expectedKeywords: string[]): boolean {
    const bioLower = bio.toLowerCase();
    return expectedKeywords.some(keyword => bioLower.includes(keyword.toLowerCase()));
  }

  private displayDashboard(result: ComprehensiveTestResult): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 INSTAGRAM V2 TEST DASHBOARD');
    console.log('='.repeat(60));
    
    console.log('\n🎯 OVERALL RESULTS:');
    console.log(`  Success Rate:     ${this.formatScore(result.results.successRate)}%`);
    console.log(`  Bio Accuracy:     ${this.formatScore(result.results.bioAccuracy)}%`);
    console.log(`  Posts Retrieved:  ${result.results.postsRetrieved} avg`);
    console.log(`  Affiliates Found: ${result.results.affiliatesFound} avg`);
    console.log(`  Response Time:    ${result.results.averageResponseTime}ms avg`);

    console.log('\n📋 DETAILED BREAKDOWN:');
    
    // Profile test summary
    const profileScores = result.details.profileTests.map(t => t.score);
    const avgProfileScore = profileScores.reduce((a, b) => a + b, 0) / profileScores.length;
    console.log(`  Profile Tests:    ${this.formatScore(Math.round(avgProfileScore))}%`);
    
    // Post test summary
    const postScores = result.details.postTests.map(t => t.score);
    const avgPostScore = postScores.reduce((a, b) => a + b, 0) / postScores.length;
    console.log(`  Post Tests:       ${this.formatScore(Math.round(avgPostScore))}%`);
    
    // Affiliate test summary
    const affiliateScores = result.details.affiliateTests.map(t => t.score);
    const avgAffiliateScore = affiliateScores.reduce((a, b) => a + b, 0) / affiliateScores.length;
    console.log(`  Affiliate Tests:  ${this.formatScore(Math.round(avgAffiliateScore))}%`);
    
    // Performance test summary
    const performanceScores = result.details.performanceTests.map(t => t.score);
    const avgPerformanceScore = performanceScores.reduce((a, b) => a + b, 0) / performanceScores.length;
    console.log(`  Performance:      ${this.formatScore(Math.round(avgPerformanceScore))}%`);

    console.log('\n🎲 COMPONENT RELIABILITY:');
    console.log(`  Mobile API:       ${result.results.successRate > 50 ? '🟢' : result.results.successRate > 20 ? '🟡' : '🔴'} ${result.results.successRate}% success`);
    console.log(`  GraphQL Pagination: ${avgPostScore > 70 ? '🟢' : avgPostScore > 40 ? '🟡' : '🔴'} ${Math.round(avgPostScore)}% functional`);
    console.log(`  Affiliate Detection: ${avgAffiliateScore > 70 ? '🟢' : avgAffiliateScore > 40 ? '🟡' : '🔴'} ${Math.round(avgAffiliateScore)}% accuracy`);
    console.log(`  Fallback System:  ${this.scraperAPIClient ? '🟢 Available' : '🟡 Not configured'}`);

    console.log('\n💡 RECOMMENDATION:');
    console.log(`  ${result.recommendation}`);
    
    console.log('\n' + '='.repeat(60));
  }

  private formatScore(score: number): string {
    if (score >= 80) return `🟢 ${score}`;
    if (score >= 60) return `🟡 ${score}`;
    return `🔴 ${score}`;
  }

  private async saveResults(result: ComprehensiveTestResult): Promise<void> {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `instagram-v2-comprehensive-${timestamp}.json`;
    const filePath = path.join(resultsDir, filename);

    fs.writeFileSync(filePath, JSON.stringify(result, null, 2));
    console.log(`\n💾 Results saved to: ${filePath}`);
  }
}

// Test execution function
async function runInstagramV2Tests() {
  const scraperAPIKey = process.env.SCRAPER_API_KEY;
  const testSuite = new InstagramV2TestSuite(scraperAPIKey);
  
  if (!scraperAPIKey) {
    console.log('⚠️ SCRAPER_API_KEY not set - fallback testing disabled');
  }

  const results = await testSuite.runComprehensiveTest();
  
  console.log('\n🏁 Test suite completed!');
  console.log(`Final recommendation: ${results.recommendation}`);
  
  return results;
}

// Export for use in other test files
export { runInstagramV2Tests };

// Run test if executed directly
if (require.main === module) {
  runInstagramV2Tests().catch(console.error);
}