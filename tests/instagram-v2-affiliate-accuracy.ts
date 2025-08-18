#!/usr/bin/env ts-node

/**
 * Instagram V2 Affiliate Detection Accuracy Test
 * 
 * Tests the accuracy of affiliate detection across real Instagram profiles
 * with known affiliate patterns and validates false positive rates.
 */

import { AffiliateDetector, AffiliateInfo, AffiliateDetectionResult } from '../src/extractors/affiliateDetector';
import { InstagramMobileAPIExtractor } from '../src/extractors/instagramMobileAPI';
import * as fs from 'fs';
import * as path from 'path';

// Known affiliate test cases with expected results
const AFFILIATE_TEST_CASES = [
  {
    username: 'fashioninfluencer',
    expectedTypes: ['amazon', 'ltk', 'discount_code', 'link_in_bio'],
    minimumAffiliates: 3,
    testCaption: 'Get 20% off with code SAVE20! Check my bio for the link 🛍️ https://amzn.to/3xyz123',
    expectedDetections: [
      { type: 'discount_code', code: 'SAVE20' },
      { type: 'link_in_bio' },
      { type: 'amazon', url: 'https://amzn.to/3xyz123' }
    ]
  },
  {
    username: 'beautyinfluencer',
    expectedTypes: ['shopify', 'discount_code', 'brand_partnership'],
    minimumAffiliates: 2,
    testCaption: '#ad Excited to partner with @beautybrand for this amazing skincare routine! Use GLOW15 for 15% off at checkout',
    expectedDetections: [
      { type: 'discount_code', code: 'GLOW15' },
      { type: 'brand_partnership', brand: 'beautybrand' }
    ]
  },
  {
    username: 'fitnessinfluencer',
    expectedTypes: ['link_in_bio', 'discount_code'],
    minimumAffiliates: 1,
    testCaption: 'Link in bio for my workout plan! Use code FITNESS20 👆 Check it out!',
    expectedDetections: [
      { type: 'discount_code', code: 'FITNESS20' },
      { type: 'link_in_bio' }
    ]
  }
];

// False positive test cases (should NOT detect affiliates)
const FALSE_POSITIVE_TESTS = [
  {
    caption: 'Just had an amazing day at the beach! The weather was perfect.',
    expectedAffiliates: 0,
    description: 'Regular lifestyle post'
  },
  {
    caption: 'Happy birthday to my best friend! Love you so much ❤️',
    expectedAffiliates: 0,
    description: 'Personal birthday message'
  },
  {
    caption: 'Cooking dinner tonight. What should I make? Let me know in the comments!',
    expectedAffiliates: 0,
    description: 'Engagement post'
  },
  {
    caption: 'Training hard for the marathon next month. Feeling strong! 💪',
    expectedAffiliates: 0,
    description: 'Fitness motivation'
  },
  {
    caption: 'New York City is so beautiful this time of year 🌆',
    expectedAffiliates: 0,
    description: 'Travel/location post'
  }
];

interface AffiliateAccuracyResult {
  testType: 'real_profiles' | 'test_captions' | 'false_positives';
  totalTests: number;
  correctDetections: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  details: Array<{
    username?: string;
    caption?: string;
    expected: number;
    detected: number;
    correct: boolean;
    detectedTypes: string[];
  }>;
}

export class InstagramV2AffiliateAccuracyTester {
  private detector: AffiliateDetector;
  private extractor: InstagramMobileAPIExtractor;

  constructor() {
    this.detector = new AffiliateDetector();
    this.extractor = new InstagramMobileAPIExtractor();
  }

  async runAccuracyTests(): Promise<{
    realProfiles: AffiliateAccuracyResult;
    testCaptions: AffiliateAccuracyResult;
    falsePositives: AffiliateAccuracyResult;
    overall: {
      accuracy: number;
      precision: number;
      recall: number;
      f1Score: number;
      recommendation: string;
    };
  }> {
    console.log('🎯 Instagram V2 Affiliate Detection Accuracy Test\n');

    // Test 1: Real profile analysis
    console.log('1️⃣ Testing real Instagram profiles...');
    const realProfileResults = await this.testRealProfiles();

    // Test 2: Controlled caption testing
    console.log('\n2️⃣ Testing controlled captions...');
    const captionResults = await this.testControlledCaptions();

    // Test 3: False positive testing
    console.log('\n3️⃣ Testing false positive rate...');
    const falsePositiveResults = await this.testFalsePositives();

    // Calculate overall metrics
    const overall = this.calculateOverallMetrics([realProfileResults, captionResults, falsePositiveResults]);

    // Display results
    this.displayAccuracyDashboard({
      realProfiles: realProfileResults,
      testCaptions: captionResults,
      falsePositives: falsePositiveResults,
      overall
    });

    return {
      realProfiles: realProfileResults,
      testCaptions: captionResults,
      falsePositives: falsePositiveResults,
      overall
    };
  }

  private async testRealProfiles(): Promise<AffiliateAccuracyResult> {
    const results = {
      testType: 'real_profiles' as const,
      totalTests: 0,
      correctDetections: 0,
      falsePositives: 0,
      falseNegatives: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      details: [] as any[]
    };

    // Test with known affiliate accounts
    const affiliateAccounts = ['cristiano', 'therock', 'kyliejenner'];
    
    for (const username of affiliateAccounts) {
      console.log(`  🔍 Analyzing @${username}...`);
      
      try {
        const extractionResult = await this.extractor.extract(username, {
          detectAffiliates: true,
          maxPosts: 12
        });

        if (extractionResult.success && extractionResult.profile?.affiliateAnalysis) {
          const analysis = extractionResult.profile.affiliateAnalysis;
          
          results.totalTests++;
          
          // For these high-profile accounts, we expect some affiliate activity
          const hasReasonableAffiliates = analysis.totalAffiliates >= 0 && analysis.totalAffiliates <= 50;
          const hasGoodConfidence = analysis.averageConfidence > 0.5;
          
          if (hasReasonableAffiliates && hasGoodConfidence) {
            results.correctDetections++;
          }

          results.details.push({
            username,
            expected: -1, // Unknown exact number
            detected: analysis.totalAffiliates,
            correct: hasReasonableAffiliates,
            detectedTypes: Object.keys(analysis.typeBreakdown)
          });

          console.log(`    📊 ${analysis.totalAffiliates} affiliates detected (${(analysis.averageConfidence * 100).toFixed(1)}% avg confidence)`);
          
        } else {
          console.log(`    ❌ Extraction failed for @${username}`);
        }

      } catch (error) {
        console.log(`    ❌ Error testing @${username}: ${error instanceof Error ? error.message : String(error)}`);
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    results.accuracy = results.totalTests > 0 ? (results.correctDetections / results.totalTests) * 100 : 0;
    results.precision = results.correctDetections / Math.max(results.correctDetections + results.falsePositives, 1) * 100;
    results.recall = results.correctDetections / Math.max(results.correctDetections + results.falseNegatives, 1) * 100;
    results.f1Score = 2 * (results.precision * results.recall) / Math.max(results.precision + results.recall, 1);

    return results;
  }

  private async testControlledCaptions(): Promise<AffiliateAccuracyResult> {
    const results = {
      testType: 'test_captions' as const,
      totalTests: 0,
      correctDetections: 0,
      falsePositives: 0,
      falseNegatives: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      details: [] as any[]
    };

    for (const testCase of AFFILIATE_TEST_CASES) {
      console.log(`  🧪 Testing: ${testCase.description || testCase.username}`);
      
      results.totalTests++;
      
      const detected = await this.detector.detectInPost({
        caption: testCase.testCaption
      });

      const detectedTypes = detected.map(d => d.type);
      let correctCount = 0;
      let expectedCount = testCase.expectedDetections.length;

      // Check each expected detection
      for (const expected of testCase.expectedDetections) {
        const found = detected.find(d => {
          if (d.type !== expected.type) return false;
          if (expected.code && d.code !== expected.code) return false;
          if (expected.brand && d.brand !== expected.brand) return false;
          if (expected.url && !d.url?.includes(expected.url.split('/')[2])) return false; // Check domain
          return true;
        });

        if (found) {
          correctCount++;
        } else {
          results.falseNegatives++;
        }
      }

      // Check for false positives (detected but not expected)
      const unexpectedDetections = detected.filter(d => 
        !testCase.expectedDetections.some(expected => expected.type === d.type)
      );
      results.falsePositives += unexpectedDetections.length;

      if (correctCount === expectedCount && unexpectedDetections.length === 0) {
        results.correctDetections++;
      }

      results.details.push({
        caption: testCase.testCaption.substring(0, 60) + '...',
        expected: expectedCount,
        detected: detected.length,
        correct: correctCount === expectedCount,
        detectedTypes
      });

      console.log(`    Expected: ${expectedCount}, Detected: ${detected.length}, Correct: ${correctCount === expectedCount ? '✅' : '❌'}`);
    }

    results.accuracy = (results.correctDetections / results.totalTests) * 100;
    results.precision = results.correctDetections / Math.max(results.correctDetections + results.falsePositives, 1) * 100;
    results.recall = results.correctDetections / Math.max(results.correctDetections + results.falseNegatives, 1) * 100;
    results.f1Score = 2 * (results.precision * results.recall) / Math.max(results.precision + results.recall, 1);

    return results;
  }

  private async testFalsePositives(): Promise<AffiliateAccuracyResult> {
    const results = {
      testType: 'false_positives' as const,
      totalTests: 0,
      correctDetections: 0,
      falsePositives: 0,
      falseNegatives: 0,
      accuracy: 0,
      precision: 0,
      recall: 0,
      f1Score: 0,
      details: [] as any[]
    };

    for (const testCase of FALSE_POSITIVE_TESTS) {
      console.log(`  🚫 Testing: ${testCase.description}`);
      
      results.totalTests++;
      
      const detected = await this.detector.detectInPost({
        caption: testCase.caption
      });

      const detectedCount = detected.length;
      const expectedCount = testCase.expectedAffiliates;
      
      if (detectedCount === expectedCount) {
        results.correctDetections++;
      } else {
        // Any detection in these cases is a false positive
        results.falsePositives += detectedCount;
      }

      results.details.push({
        caption: testCase.caption.substring(0, 60) + '...',
        expected: expectedCount,
        detected: detectedCount,
        correct: detectedCount === expectedCount,
        detectedTypes: detected.map(d => d.type)
      });

      console.log(`    Expected: ${expectedCount}, Detected: ${detectedCount}, Result: ${detectedCount === expectedCount ? '✅' : '❌'}`);
      
      if (detectedCount > 0) {
        detected.forEach(aff => {
          console.log(`      False positive: ${aff.type} (${(aff.confidence * 100).toFixed(0)}% confidence)`);
        });
      }
    }

    results.accuracy = (results.correctDetections / results.totalTests) * 100;
    
    // For false positive testing, precision is about correctly identifying no affiliates
    const trueNegatives = results.correctDetections;
    const falsePositiveRate = (results.falsePositives / Math.max(results.falsePositives + trueNegatives, 1)) * 100;
    
    results.precision = 100 - falsePositiveRate; // Inverse of false positive rate
    results.recall = results.accuracy; // Same as accuracy for this test type
    results.f1Score = 2 * (results.precision * results.recall) / Math.max(results.precision + results.recall, 1);

    return results;
  }

  private calculateOverallMetrics(testResults: AffiliateAccuracyResult[]): {
    accuracy: number;
    precision: number;
    recall: number;
    f1Score: number;
    recommendation: string;
  } {
    const totalCorrect = testResults.reduce((sum, result) => sum + result.correctDetections, 0);
    const totalTests = testResults.reduce((sum, result) => sum + result.totalTests, 0);
    const totalFalsePositives = testResults.reduce((sum, result) => sum + result.falsePositives, 0);
    const totalFalseNegatives = testResults.reduce((sum, result) => sum + result.falseNegatives, 0);

    const accuracy = (totalCorrect / totalTests) * 100;
    const precision = totalCorrect / Math.max(totalCorrect + totalFalsePositives, 1) * 100;
    const recall = totalCorrect / Math.max(totalCorrect + totalFalseNegatives, 1) * 100;
    const f1Score = 2 * (precision * recall) / Math.max(precision + recall, 1);

    let recommendation = 'Affiliate detection is performing well';
    
    if (accuracy < 70) {
      recommendation = 'Improve affiliate detection patterns and confidence scoring';
    } else if (precision < 80) {
      recommendation = 'Reduce false positives by tightening detection criteria';
    } else if (recall < 80) {
      recommendation = 'Enhance detection patterns to catch more affiliates';
    } else if (f1Score > 85) {
      recommendation = 'Excellent affiliate detection performance';
    }

    return {
      accuracy: Math.round(accuracy),
      precision: Math.round(precision),
      recall: Math.round(recall),
      f1Score: Math.round(f1Score),
      recommendation
    };
  }

  private displayAccuracyDashboard(results: {
    realProfiles: AffiliateAccuracyResult;
    testCaptions: AffiliateAccuracyResult;
    falsePositives: AffiliateAccuracyResult;
    overall: any;
  }): void {
    console.log('\n' + '='.repeat(60));
    console.log('🎯 AFFILIATE DETECTION ACCURACY DASHBOARD');
    console.log('='.repeat(60));

    console.log('\n📊 OVERALL PERFORMANCE:');
    console.log(`  Accuracy:   ${this.formatMetric(results.overall.accuracy)}%`);
    console.log(`  Precision:  ${this.formatMetric(results.overall.precision)}% (low false positives)`);
    console.log(`  Recall:     ${this.formatMetric(results.overall.recall)}% (catches real affiliates)`);
    console.log(`  F1 Score:   ${this.formatMetric(results.overall.f1Score)}% (balanced performance)`);

    console.log('\n📋 TEST CATEGORY BREAKDOWN:');
    console.log(`  Real Profiles:    ${this.formatMetric(results.realProfiles.accuracy)}% accuracy`);
    console.log(`  Test Captions:    ${this.formatMetric(results.testCaptions.accuracy)}% accuracy`);
    console.log(`  False Positive:   ${this.formatMetric(results.falsePositives.accuracy)}% accuracy`);

    console.log('\n🔍 DETECTION QUALITY:');
    const totalDetected = results.realProfiles.correctDetections + results.testCaptions.correctDetections;
    const totalFalsePos = results.falsePositives.falsePositives;
    const falsePositiveRate = totalFalsePos / Math.max(totalFalsePos + totalDetected, 1) * 100;
    
    console.log(`  False Positive Rate: ${this.formatMetric(Math.round(falsePositiveRate))}%`);
    console.log(`  Detection Confidence: ${totalDetected > 0 ? '🟢 High' : '🔴 Low'}`);

    console.log('\n💡 RECOMMENDATION:');
    console.log(`  ${results.overall.recommendation}`);

    console.log('\n🎖️ PERFORMANCE GRADE:');
    const overallScore = results.overall.f1Score;
    let grade, status;
    if (overallScore >= 90) { grade = 'A+'; status = '🏆 EXCELLENT'; }
    else if (overallScore >= 80) { grade = 'A'; status = '🟢 GOOD'; }
    else if (overallScore >= 70) { grade = 'B'; status = '🟡 FAIR'; }
    else if (overallScore >= 60) { grade = 'C'; status = '🟠 NEEDS WORK'; }
    else { grade = 'F'; status = '🔴 POOR'; }
    
    console.log(`  Grade: ${grade} (${status})`);
  }

  private formatMetric(value: number): string {
    if (value >= 80) return `🟢 ${value}`;
    if (value >= 60) return `🟡 ${value}`;
    return `🔴 ${value}`;
  }

  async saveAccuracyResults(results: any): Promise<void> {
    const resultsDir = path.join(__dirname, 'results');
    if (!fs.existsSync(resultsDir)) {
      fs.mkdirSync(resultsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `affiliate-accuracy-${timestamp}.json`;
    const filePath = path.join(resultsDir, filename);

    const fullResults = {
      timestamp: new Date().toISOString(),
      testType: 'affiliate_accuracy',
      ...results
    };

    fs.writeFileSync(filePath, JSON.stringify(fullResults, null, 2));
    console.log(`\n💾 Accuracy results saved to: ${filePath}`);
  }
}

// Utility function for quick affiliate testing
export async function quickAffiliateTest(caption: string): Promise<AffiliateInfo[]> {
  const detector = new AffiliateDetector();
  return await detector.detectInPost({ caption });
}

// Main test execution
async function runAffiliateAccuracyTests() {
  const tester = new InstagramV2AffiliateAccuracyTester();
  const results = await tester.runAccuracyTests();
  
  await tester.saveAccuracyResults(results);
  
  console.log('\n🏁 Affiliate accuracy testing completed!');
  
  return results;
}

// Export for use in other test files
export { runAffiliateAccuracyTests, InstagramV2AffiliateAccuracyTester, quickAffiliateTest };

// Run test if executed directly
if (require.main === module) {
  runAffiliateAccuracyTests().catch(console.error);
}