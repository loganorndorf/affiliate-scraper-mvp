/**
 * ExtractorTester - Reliability testing for web scraping extractors
 * 
 * Tests extractors against known accounts, measures performance,
 * and provides detailed metrics for reliability assessment.
 */

import { TestAccount, TestPlatforms, TEST_ACCOUNTS, QUICK_TEST_ACCOUNTS } from '../config/testAccounts';
import { validateTestResult, ValidatedTestResult } from './dataValidation';

export interface TestResult {
  platform: string;
  username: string;
  success: boolean;
  responseTimeMs: number;
  accuracyScore: number;
  completenessScore: number;
  errorDetails?: ErrorDetails;
  extractedData?: any;
  expectedData?: any;
  timestamp: Date;
  retryCount: number;
  dataIntegrityValid?: boolean;
  integrityScore?: number;
  validationIssues?: any[];
}

export interface ErrorDetails {
  type: ErrorType;
  message: string;
  code?: string;
  stack?: string;
  isRetryable: boolean;
}

export enum ErrorType {
  TIMEOUT = 'TIMEOUT',
  SELECTOR_NOT_FOUND = 'SELECTOR_NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',
  AUTH_REQUIRED = 'AUTH_REQUIRED',
  NOT_FOUND = 'NOT_FOUND',
  NETWORK_ERROR = 'NETWORK_ERROR',
  CAPTCHA_REQUIRED = 'CAPTCHA_REQUIRED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

export interface TestSummary {
  totalTests: number;
  successfulTests: number;
  failedTests: number;
  successRate: number;
  averageResponseTime: number;
  averageAccuracy: number;
  platformResults: Record<string, PlatformSummary>;
  errorBreakdown: Record<ErrorType, number>;
  timestamp: Date;
}

export interface PlatformSummary {
  platform: string;
  testsRun: number;
  successRate: number;
  averageResponseTime: number;
  averageAccuracy: number;
  averageCompleteness: number;
  status: 'EXCELLENT' | 'HEALTHY' | 'WARNING' | 'CRITICAL';
  recommendation: string;
  errors: ErrorDetails[];
  totalTests: number;
  errorBreakdown: Record<ErrorType, number>;
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
  healthScore: number;
}

export interface ExtractorInterface {
  extract(username: string): Promise<any>;
  close?(): Promise<void>;
}

export class ExtractorTester {
  private extractors: Record<string, ExtractorInterface> = {};
  private defaultTimeout = 10_000; // 10 seconds
  private maxRetries = 3;

  constructor(extractors: Record<string, ExtractorInterface>) {
    this.extractors = extractors;
  }

  /**
   * Test all extractors against all test accounts
   */
  async testAll(mode: 'quick' | 'full' = 'full'): Promise<TestResult[]> {
    console.log(`🧪 Starting ${mode} reliability test suite...`);
    
    const accounts = mode === 'quick' ? QUICK_TEST_ACCOUNTS : TEST_ACCOUNTS;
    const results: TestResult[] = [];

    for (const account of accounts) {
      for (const [platform, expectedData] of Object.entries(account.platforms)) {
        if (this.extractors[platform] && expectedData?.exists !== false) {
          const result = await this.testSingle(platform, account.username, expectedData);
          results.push(result);
          
          // Brief pause between tests to be respectful
          await this.delay(1000);
        }
      }
    }

    console.log(`✅ Test suite complete: ${results.length} tests run`);
    return results;
  }

  /**
   * Test all accounts for a specific platform
   */
  async testPlatform(platform: string): Promise<TestResult[]> {
    if (!this.extractors[platform]) {
      throw new Error(`No extractor found for platform: ${platform}`);
    }

    console.log(`🔍 Testing ${platform} extractor...`);
    
    const results: TestResult[] = [];
    const relevantAccounts = TEST_ACCOUNTS.filter(
      account => account.platforms[platform as keyof TestPlatforms]?.exists
    );

    for (const account of relevantAccounts) {
      const expectedData = account.platforms[platform as keyof TestPlatforms];
      if (expectedData) {
        const result = await this.testSingle(platform, account.username, expectedData);
        results.push(result);
        await this.delay(500);
      }
    }

    return results;
  }

  /**
   * Test a single extractor against a single account
   */
  async testSingle(
    platform: string, 
    username: string, 
    expectedData: any,
    retryCount = 0
  ): Promise<TestResult> {
    const startTime = Date.now();
    const timestamp = new Date();

    console.log(`  Testing ${platform}/${username}...`);

    try {
      // Run extractor with timeout
      const extractedData = await this.runWithTimeout(
        this.extractors[platform].extract(username),
        this.defaultTimeout
      );

      const responseTime = Date.now() - startTime;

      // Calculate metrics
      const accuracyScore = this.calculateAccuracy(extractedData, expectedData);
      const completenessScore = this.calculateCompleteness(extractedData, expectedData);

      // CRITICAL: Validate data integrity to catch silent failures
      const basicResult = {
        platform,
        username,
        success: true,
        responseTimeMs: responseTime,
        accuracyScore,
        completenessScore,
        extractedData,
        expectedData,
        timestamp,
        retryCount
      };

      const validatedResult = validateTestResult(
        platform, 
        username, 
        extractedData, 
        expectedData, 
        basicResult
      );

      // If data integrity fails, mark as failed even if extraction "succeeded"
      return {
        ...basicResult,
        success: validatedResult.overallSuccess,
        dataIntegrityValid: validatedResult.dataIntegrityValid,
        integrityScore: validatedResult.integrityScore,
        validationIssues: validatedResult.validation.issues
      };

    } catch (error) {
      const responseTime = Date.now() - startTime;
      const errorDetails = this.categorizeError(error);

      // Retry logic for retryable errors
      if (errorDetails.isRetryable && retryCount < this.maxRetries) {
        console.log(`    Retrying ${platform}/${username} (attempt ${retryCount + 1})...`);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        await this.delay(delay);
        
        return this.testSingle(platform, username, expectedData, retryCount + 1);
      }

      return {
        platform,
        username,
        success: false,
        responseTimeMs: responseTime,
        accuracyScore: 0,
        completenessScore: 0,
        errorDetails,
        expectedData,
        timestamp,
        retryCount
      };
    }
  }

  /**
   * Calculate accuracy score by comparing extracted vs expected data
   */
  private calculateAccuracy(extracted: any, expected: any): number {
    const metrics = require('./metrics').calculateAccuracy(extracted, expected);
    return metrics.overallAccuracy;
  }

  /**
   * Calculate completeness score (how much expected data was found)
   */
  private calculateCompleteness(extracted: any, expected: any): number {
    // For link platforms, use the dedicated completeness function
    if (expected.expectedLinks) {
      const metrics = require('./metrics').calculateCompleteness(extracted.links, expected.expectedLinks);
      return metrics.completenessPercentage;
    }

    // For social platforms, calculate field completeness
    const requiredFields = ['username', 'platform'];
    const optionalFields = ['bio', 'followerCount', 'bioLink'];
    
    let foundRequired = 0;
    let foundOptional = 0;

    requiredFields.forEach(field => {
      if (extracted && extracted[field]) foundRequired++;
    });

    optionalFields.forEach(field => {
      if (extracted && extracted[field]) foundOptional++;
    });

    const requiredScore = (foundRequired / requiredFields.length) * 70; // 70% weight
    const optionalScore = (foundOptional / optionalFields.length) * 30; // 30% weight

    return Math.round(requiredScore + optionalScore);
  }

  /**
   * Categorize errors for better debugging
   */
  private categorizeError(error: unknown): ErrorDetails {
    return require('./metrics').categorizeError(error);
  }

  /**
   * Run extractor with timeout
   */
  private async runWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Generate summary report from test results
   */
  generateSummary(results: TestResult[]): TestSummary {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    // Group by platform
    const platformGroups = this.groupBy(results, 'platform');
    const platformResults: Record<string, PlatformSummary> = {};

    for (const [platform, platformTests] of Object.entries(platformGroups)) {
      const platformSuccessful = platformTests.filter(t => t.success);
      const platformFailed = platformTests.filter(t => !t.success);

      const successRate = (platformSuccessful.length / platformTests.length) * 100;
      const avgResponseTime = this.average(platformTests.map(t => t.responseTimeMs));
      const avgAccuracy = this.average(platformSuccessful.map(t => t.accuracyScore));
      const avgCompleteness = this.average(platformSuccessful.map(t => t.completenessScore));

      // Count error types for this platform
      const errorBreakdown: Record<ErrorType, number> = {} as any;
      platformFailed.forEach(result => {
        if (result.errorDetails) {
          const errorType = result.errorDetails.type;
          errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
        }
      });

      const healthScore = Math.round(
        (successRate * 0.4) + (avgAccuracy * 0.3) + (avgCompleteness * 0.2) + 
        (Math.max(0, 100 - (avgResponseTime / 100)) * 0.1)
      );

      platformResults[platform] = {
        platform,
        testsRun: platformTests.length,
        successRate,
        averageResponseTime: avgResponseTime,
        averageAccuracy: avgAccuracy,
        averageCompleteness: avgCompleteness,
        status: this.getHealthStatus(successRate, avgAccuracy).toLowerCase() as any,
        recommendation: this.getRecommendation(successRate, avgAccuracy, avgResponseTime),
        errors: platformFailed.map(t => t.errorDetails!).filter(Boolean),
        totalTests: platformTests.length,
        errorBreakdown,
        trend: 'unknown' as const,
        healthScore
      };
    }

    // Count error types
    const errorBreakdown: Record<ErrorType, number> = {} as any;
    failed.forEach(result => {
      if (result.errorDetails) {
        const errorType = result.errorDetails.type;
        errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
      }
    });

    return {
      totalTests: results.length,
      successfulTests: successful.length,
      failedTests: failed.length,
      successRate: (successful.length / results.length) * 100,
      averageResponseTime: this.average(results.map(r => r.responseTimeMs)),
      averageAccuracy: this.average(successful.map(r => r.accuracyScore)),
      platformResults,
      errorBreakdown,
      timestamp: new Date()
    };
  }

  /**
   * Get health status based on metrics
   */
  private getHealthStatus(successRate: number, accuracy: number): string {
    if (successRate >= 90 && accuracy >= 95) return 'EXCELLENT';
    if (successRate >= 80 && accuracy >= 90) return 'HEALTHY';
    if (successRate >= 60 && accuracy >= 80) return 'WARNING';
    return 'CRITICAL';
  }

  /**
   * Get recommendation based on metrics
   */
  private getRecommendation(successRate: number, accuracy: number, responseTime: number): string {
    if (successRate < 50) {
      return 'CRITICAL: Fix immediately - blocking user onboarding';
    }
    if (successRate < 70) {
      return 'HIGH PRIORITY: Needs significant improvement';
    }
    if (accuracy < 85) {
      return 'MEDIUM: Improve data accuracy';
    }
    if (responseTime > 10000) {
      return 'LOW: Optimize for better performance';
    }
    return 'GOOD: Monitor for degradation';
  }

  /**
   * Test with retry logic and exponential backoff
   */
  private async testWithRetry(
    platform: string,
    username: string,
    expectedData: any,
    retryCount = 0
  ): Promise<TestResult> {
    try {
      return await this.testSingle(platform, username, expectedData, retryCount);
    } catch (error) {
      const errorDetails = this.categorizeError(error);
      
      if (errorDetails.isRetryable && retryCount < this.maxRetries) {
        const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
        console.log(`    Retrying ${platform}/${username} in ${delay}ms...`);
        
        await this.delay(delay);
        return this.testWithRetry(platform, username, expectedData, retryCount + 1);
      }
      
      throw error;
    }
  }

  /**
   * Utility functions
   */
  private groupBy<T>(array: T[], key: keyof T): Record<string, T[]> {
    return array.reduce((groups, item) => {
      const group = (item[key] as unknown as string);
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {} as Record<string, T[]>);
  }

  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return Math.round(numbers.reduce((a, b) => a + b, 0) / numbers.length);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Print results in a readable format
   */
  printResults(results: TestResult[]): void {
    // Simple console output for now
    console.log('\n🧪 RELIABILITY TEST RESULTS');
    console.log('='.repeat(50));
    
    const summary = this.generateSummary(results);
    console.log(`Total Tests: ${summary.totalTests}`);
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`Average Response Time: ${summary.averageResponseTime}ms`);
    
    console.log('\nPlatform Results:');
    for (const [platform, stats] of Object.entries(summary.platformResults)) {
      console.log(`  ${platform}: ${stats.successRate.toFixed(1)}% success, ${stats.averageResponseTime}ms avg`);
    }
  }

  private getStatusEmoji(status: PlatformSummary['status']): string {
    switch (status) {
      case 'EXCELLENT': return '🚀';
      case 'HEALTHY': return '✅';
      case 'WARNING': return '⚠️';
      case 'CRITICAL': return '🚨';
      default: return '❓';
    }
  }

  /**
   * Save results to JSON file
   */
  async saveResults(results: TestResult[], filename?: string): Promise<string> {
    const fs = require('fs').promises;
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    const outputPath = filename || `./tests/results/reliability_${timestamp}.json`;
    
    // Ensure directory exists
    await fs.mkdir('./tests/results', { recursive: true });
    
    const summary = this.generateSummary(results);
    const output = {
      summary,
      detailedResults: results,
      generatedAt: new Date().toISOString()
    };
    
    await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
    console.log(`💾 Results saved to ${outputPath}`);
    
    return outputPath;
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    for (const [platform, extractor] of Object.entries(this.extractors)) {
      if (extractor.close) {
        try {
          await extractor.close();
          console.log(`🧹 Cleaned up ${platform} extractor`);
        } catch (error) {
          console.warn(`Warning: Failed to cleanup ${platform}:`, (error as Error).message);
        }
      }
    }
  }
}