#!/usr/bin/env ts-node

/**
 * Instagram Mobile API Test Runner
 * 
 * Tests the new mobile API approach vs the old browser-based approach
 * to validate improvements in bio extraction and reliability.
 */

import { InstagramMobileAPIExtractor } from '../src/extractors/instagramMobileAPI';
import { FixedInstagramExtractor } from './extractors-fixed/instagram-fixed';
import { TEST_ACCOUNTS } from './config/testAccounts';
import { validateUserDataIntegrity } from './core/dataValidation';
import * as fs from 'fs';
import * as path from 'path';

interface TestResult {
  platform: string;
  username: string;
  success: boolean;
  responseTimeMs: number;
  dataIntegrityValid: boolean;
  integrityScore: number;
  validationIssues: Array<{
    type: string;
    description: string;
    severity: string;
  }>;
  extractedData?: any;
  errorDetails?: {
    type: string;
    message: string;
  };
}

async function testInstagramMobileAPI() {
  console.log('🧪 Instagram Mobile API vs Browser Comparison Test\n');
  
  const mobileAPIExtractor = new InstagramMobileAPIExtractor();
  const browserExtractor = new FixedInstagramExtractor();
  
  const instagramAccounts = TEST_ACCOUNTS.filter(account => account.platforms.instagram?.exists);
  
  const mobileAPIResults: TestResult[] = [];
  const browserResults: TestResult[] = [];
  
  console.log(`Testing ${instagramAccounts.length} Instagram accounts with both methods...\n`);
  
  for (const account of instagramAccounts) {
    const username = account.username;
    console.log(`🔍 Testing @${username}...`);
    
    // Test Mobile API
    console.log(`  📱 Mobile API test...`);
    const mobileStart = Date.now();
    try {
      const mobileResult = await mobileAPIExtractor.extract(username);
      const responseTime = Date.now() - mobileStart;
      
      if (mobileResult.success && mobileResult.profile) {
        const profile = mobileResult.profile;
        const validation = validateUserDataIntegrity(
          username,
          'instagram',
          {
            username: profile.username,
            followerCount: profile.followers,
            bio: profile.bio,
            isVerified: profile.isVerified,
            bioLink: profile.bioLink
          },
          account.platforms.instagram
        );
        
        mobileAPIResults.push({
          platform: 'instagram-mobile-api',
          username,
          success: true,
          responseTimeMs: responseTime,
          dataIntegrityValid: validation.isValid,
          integrityScore: validation.confidence,
          validationIssues: validation.issues,
          extractedData: profile
        });
        
        console.log(`    ✅ Success - Bio: "${profile.bio.substring(0, 50)}..." | Followers: ${profile.followers.toLocaleString()} | Posts: ${profile.posts.length}`);
        console.log(`    📊 Integrity: ${validation.isValid ? '✅' : '❌'} (${validation.confidence}%)`);
        
      } else {
        mobileAPIResults.push({
          platform: 'instagram-mobile-api',
          username,
          success: false,
          responseTimeMs: responseTime,
          dataIntegrityValid: false,
          integrityScore: 0,
          validationIssues: [],
          errorDetails: {
            type: 'EXTRACTION_FAILED',
            message: mobileResult.error || 'Unknown error'
          }
        });
        console.log(`    ❌ Failed: ${mobileResult.error}`);
      }
      
    } catch (error) {
      const responseTime = Date.now() - mobileStart;
      mobileAPIResults.push({
        platform: 'instagram-mobile-api',
        username,
        success: false,
        responseTimeMs: responseTime,
        dataIntegrityValid: false,
        integrityScore: 0,
        validationIssues: [],
        errorDetails: {
          type: 'EXCEPTION',
          message: error instanceof Error ? error.message : String(error)
        }
      });
      console.log(`    ❌ Exception: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    // Test Browser Approach (for comparison)
    console.log(`  🌐 Browser test...`);
    const browserStart = Date.now();
    try {
      const browserResult = await browserExtractor.getProfile(username);
      const responseTime = Date.now() - browserStart;
      
      if (browserResult) {
        const validation = validateUserDataIntegrity(
          username,
          'instagram',
          {
            username: browserResult.username,
            followerCount: browserResult.followerCount,
            bio: browserResult.bioText,
            isVerified: browserResult.isVerified,
            bioLink: browserResult.bioLink
          },
          account.platforms.instagram
        );
        
        browserResults.push({
          platform: 'instagram-browser',
          username,
          success: true,
          responseTimeMs: responseTime,
          dataIntegrityValid: validation.isValid,
          integrityScore: validation.confidence,
          validationIssues: validation.issues,
          extractedData: browserResult
        });
        
        console.log(`    ✅ Success - Bio: "${(browserResult.bioText || '').substring(0, 50)}..." | Followers: ${browserResult.followerCount.toLocaleString()}`);
        console.log(`    📊 Integrity: ${validation.isValid ? '✅' : '❌'} (${validation.confidence}%)`);
        
      } else {
        throw new Error('Browser extraction returned null');
      }
      
    } catch (error) {
      const responseTime = Date.now() - browserStart;
      browserResults.push({
        platform: 'instagram-browser',
        username,
        success: false,
        responseTimeMs: responseTime,
        dataIntegrityValid: false,
        integrityScore: 0,
        validationIssues: [],
        errorDetails: {
          type: 'EXTRACTION_FAILED',
          message: error instanceof Error ? error.message : String(error)
        }
      });
      console.log(`    ❌ Failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    console.log('');
    
    // Delay between accounts to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  // No cleanup needed for mobile API, browser extractor handles its own cleanup
  
  // Generate comparison report
  console.log('\n📊 COMPARISON RESULTS\n');
  
  const mobileSuccessRate = (mobileAPIResults.filter(r => r.success).length / mobileAPIResults.length) * 100;
  const browserSuccessRate = (browserResults.filter(r => r.success).length / browserResults.length) * 100;
  
  const mobileAvgTime = mobileAPIResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / mobileAPIResults.length;
  const browserAvgTime = browserResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / browserResults.length;
  
  const mobileIntegrityRate = (mobileAPIResults.filter(r => r.dataIntegrityValid).length / mobileAPIResults.length) * 100;
  const browserIntegrityRate = (browserResults.filter(r => r.dataIntegrityValid).length / browserResults.length) * 100;
  
  console.log('Mobile API Results:');
  console.log(`  Success Rate: ${mobileSuccessRate.toFixed(1)}%`);
  console.log(`  Data Integrity: ${mobileIntegrityRate.toFixed(1)}%`);
  console.log(`  Avg Response Time: ${Math.round(mobileAvgTime)}ms`);
  
  console.log('\nBrowser Results:');
  console.log(`  Success Rate: ${browserSuccessRate.toFixed(1)}%`);
  console.log(`  Data Integrity: ${browserIntegrityRate.toFixed(1)}%`);
  console.log(`  Avg Response Time: ${Math.round(browserAvgTime)}ms`);
  
  console.log('\nComparison:');
  console.log(`  Success Rate: ${mobileSuccessRate > browserSuccessRate ? '📈' : '📉'} ${(mobileSuccessRate - browserSuccessRate).toFixed(1)}% difference`);
  console.log(`  Data Integrity: ${mobileIntegrityRate > browserIntegrityRate ? '📈' : '📉'} ${(mobileIntegrityRate - browserIntegrityRate).toFixed(1)}% difference`);
  console.log(`  Speed: ${mobileAvgTime < browserAvgTime ? '⚡' : '🐌'} ${Math.round(mobileAvgTime - browserAvgTime)}ms difference`);
  
  // Save results
  const comparisonReport = {
    summary: {
      totalTests: mobileAPIResults.length,
      timestamp: new Date().toISOString(),
      mobileAPI: {
        successRate: mobileSuccessRate,
        integrityRate: mobileIntegrityRate,
        avgResponseTime: mobileAvgTime
      },
      browser: {
        successRate: browserSuccessRate,
        integrityRate: browserIntegrityRate,
        avgResponseTime: browserAvgTime
      },
      winner: mobileSuccessRate > browserSuccessRate ? 'mobile-api' : 'browser',
      improvement: {
        successRate: mobileSuccessRate - browserSuccessRate,
        integrityRate: mobileIntegrityRate - browserIntegrityRate,
        responseTime: browserAvgTime - mobileAvgTime
      }
    },
    mobileAPIResults,
    browserResults
  };
  
  // Ensure results directory exists
  const resultsDir = path.join(__dirname, 'results');
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }
  
  // Save comparison results
  const outputPath = path.join(resultsDir, 'instagram_comparison_test.json');
  fs.writeFileSync(outputPath, JSON.stringify(comparisonReport, null, 2));
  
  console.log(`\n💾 Results saved to: ${outputPath}`);
  console.log(`\n🎯 Recommendation: Use ${comparisonReport.summary.winner === 'mobile-api' ? 'Mobile API' : 'Browser'} approach`);
  
  return comparisonReport;
}

// Run test if executed directly
if (require.main === module) {
  testInstagramMobileAPI().catch(console.error);
}

export { testInstagramMobileAPI };