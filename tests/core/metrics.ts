/**
 * Metrics Calculator for Extractor Reliability Testing
 * 
 * Provides functions to calculate accuracy, completeness, and health metrics
 * for web scraping extractors.
 */

import { TestResult, ErrorType, ErrorDetails } from './ExtractorTester';

export interface PlatformHealth {
  platform: string;
  successRate: number;
  averageAccuracy: number;
  averageCompleteness: number;
  averageResponseTime: number;
  totalTests: number;
  errorBreakdown: Record<ErrorType, number>;
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
  healthScore: number;
  status: 'excellent' | 'healthy' | 'warning' | 'critical';
}

export interface AccuracyMetrics {
  followerAccuracy: number;
  bioAccuracy: number;
  verificationAccuracy: number;
  linkAccuracy: number;
  overallAccuracy: number;
  checkedFields: string[];
}

export interface CompletenessMetrics {
  expectedCount: number;
  foundCount: number;
  exactMatches: number;
  domainMatches: number;
  completenessPercentage: number;
  missingLinks: string[];
}

export interface PlatformHealth {
  platform: string;
  successRate: number;
  averageAccuracy: number;
  averageCompleteness: number;
  averageResponseTime: number;
  totalTests: number;
  errorBreakdown: Record<ErrorType, number>;
  trend: 'improving' | 'stable' | 'degrading' | 'unknown';
  healthScore: number;
  status: 'excellent' | 'healthy' | 'warning' | 'critical';
}

export interface BaselineComparison {
  platform: string;
  successRateChange: number;
  accuracyChange: number;
  responseTimeChange: number;
  alerts: ComparisonAlert[];
  overallChange: 'improved' | 'stable' | 'degraded';
}

export interface ComparisonAlert {
  type: 'success_rate_drop' | 'accuracy_drop' | 'response_time_increase' | 'new_errors';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  currentValue: number;
  previousValue: number;
  changePercentage: number;
}

/**
 * Calculate accuracy by comparing actual extracted data with expected values
 */
export function calculateAccuracy(actual: any, expected: any): AccuracyMetrics {
  if (!actual || !expected) {
    return {
      followerAccuracy: 0,
      bioAccuracy: 0,
      verificationAccuracy: 0,
      linkAccuracy: 0,
      overallAccuracy: 0,
      checkedFields: []
    };
  }

  const metrics = {
    followerAccuracy: 0,
    bioAccuracy: 0,
    verificationAccuracy: 0,
    linkAccuracy: 0,
    overallAccuracy: 0,
    checkedFields: [] as string[]
  };

  let totalChecks = 0;
  let passedChecks = 0;

  // 1. Follower Count Accuracy (allow 10% variance for growth)
  if (expected.minFollowers !== undefined && actual.followerCount !== undefined) {
    metrics.checkedFields.push('followerCount');
    totalChecks++;

    const expectedMin = expected.minFollowers;
    const expectedMax = expected.maxFollowers || expectedMin * 1.1; // Default 10% growth
    const actualCount = actual.followerCount;

    if (actualCount >= expectedMin && actualCount <= expectedMax) {
      metrics.followerAccuracy = 100;
      passedChecks++;
    } else {
      // Calculate partial accuracy based on variance
      const variance = Math.min(
        Math.abs(actualCount - expectedMin) / expectedMin,
        Math.abs(actualCount - expectedMax) / expectedMax
      );
      metrics.followerAccuracy = Math.max(0, 100 - (variance * 100));
      if (variance <= 0.2) passedChecks++; // Accept within 20% as "passed"
    }
  }

  // 2. Bio Text Accuracy (check for expected keywords)
  if (expected.bioKeywords && actual.bio) {
    metrics.checkedFields.push('bioKeywords');
    totalChecks++;

    const bioLower = actual.bio.toLowerCase();
    let keywordMatches = 0;

    expected.bioKeywords.forEach((keyword: string) => {
      if (bioLower.includes(keyword.toLowerCase())) {
        keywordMatches++;
      }
    });

    metrics.bioAccuracy = (keywordMatches / expected.bioKeywords.length) * 100;
    if (metrics.bioAccuracy >= 80) passedChecks++; // 80% keyword match is good
  }

  // 3. Verification Status Accuracy
  if (expected.isVerified !== undefined && actual.isVerified !== undefined) {
    metrics.checkedFields.push('isVerified');
    totalChecks++;

    if (actual.isVerified === expected.isVerified) {
      metrics.verificationAccuracy = 100;
      passedChecks++;
    } else {
      metrics.verificationAccuracy = 0;
    }
  }

  // 4. External Link Accuracy
  if (expected.hasBioLink !== undefined || expected.bioLinkContains || expected.linkPattern) {
    metrics.checkedFields.push('externalLink');
    totalChecks++;

    const actualLink = actual.bioLink || actual.externalUrl || '';
    let linkScore = 0;

    // Check if link exists when expected
    if (expected.hasBioLink !== undefined) {
      const hasLink = !!actualLink;
      if (hasLink === expected.hasBioLink) {
        linkScore += 40;
      }
    }

    // Check if link contains expected text
    if (expected.bioLinkContains && actualLink) {
      if (actualLink.toLowerCase().includes(expected.bioLinkContains.toLowerCase())) {
        linkScore += 30;
      }
    }

    // Check if link matches expected pattern
    if (expected.linkPattern && actualLink) {
      if (expected.linkPattern.test(actualLink)) {
        linkScore += 30;
      }
    }

    metrics.linkAccuracy = Math.min(100, linkScore);
    if (metrics.linkAccuracy >= 70) passedChecks++;
  }

  // Calculate overall accuracy
  metrics.overallAccuracy = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;

  return metrics;
}

/**
 * Calculate completeness for link extraction (how many expected links were found)
 */
export function calculateCompleteness(links: any[], expectedLinks?: string[]): CompletenessMetrics {
  if (!expectedLinks || expectedLinks.length === 0) {
    return {
      expectedCount: 0,
      foundCount: links?.length || 0,
      exactMatches: 0,
      domainMatches: 0,
      completenessPercentage: links?.length > 0 ? 100 : 0,
      missingLinks: []
    };
  }

  const actualLinks = links || [];
  const actualUrls = actualLinks.map(link => 
    (typeof link === 'string' ? link : link.url || link.originalUrl || '').toLowerCase()
  );

  let exactMatches = 0;
  let domainMatches = 0;
  const missingLinks: string[] = [];

  expectedLinks.forEach(expectedLink => {
    const expectedLower = expectedLink.toLowerCase();
    const expectedDomain = extractDomain(expectedLower);

    // Check for exact URL match
    const exactMatch = actualUrls.some(url => url.includes(expectedLower));
    if (exactMatch) {
      exactMatches++;
      return;
    }

    // Check for domain match
    const domainMatch = actualUrls.some(url => {
      const actualDomain = extractDomain(url);
      return actualDomain === expectedDomain;
    });

    if (domainMatch) {
      domainMatches++;
    } else {
      missingLinks.push(expectedLink);
    }
  });

  const totalMatches = exactMatches + domainMatches;
  const completenessPercentage = (totalMatches / expectedLinks.length) * 100;

  return {
    expectedCount: expectedLinks.length,
    foundCount: actualLinks.length,
    exactMatches,
    domainMatches,
    completenessPercentage: Math.round(completenessPercentage),
    missingLinks
  };
}

/**
 * Categorize errors for better debugging and handling
 */
export function categorizeError(error: unknown): ErrorDetails {
  const message = (error as any)?.message || (error as any)?.toString() || '';
  const messageLower = message.toLowerCase();
  const stack = (error as any)?.stack || '';

  let type: ErrorType = ErrorType.UNKNOWN_ERROR;
  let isRetryable = false;

  // Timeout errors
  if (messageLower.includes('timeout') || 
      messageLower.includes('timed out') ||
      (error as any).code === 'ETIMEDOUT') {
    type = ErrorType.TIMEOUT;
    isRetryable = true;
  }
  
  // Selector/DOM errors
  else if (messageLower.includes('selector') ||
           messageLower.includes('element not found') ||
           messageLower.includes('waiting for selector') ||
           messageLower.includes('no such element')) {
    type = ErrorType.SELECTOR_NOT_FOUND;
    isRetryable = false; // Requires code fix
  }
  
  // Rate limiting
  else if (messageLower.includes('rate limit') ||
           messageLower.includes('too many requests') ||
           messageLower.includes('429') ||
           (error as any).code === 'RATE_LIMITED') {
    type = ErrorType.RATE_LIMITED;
    isRetryable = true;
  }
  
  // Authentication required
  else if (messageLower.includes('login') ||
           messageLower.includes('authentication') ||
           messageLower.includes('unauthorized') ||
           messageLower.includes('401')) {
    type = ErrorType.AUTH_REQUIRED;
    isRetryable = false;
  }
  
  // Not found errors
  else if (messageLower.includes('not found') ||
           messageLower.includes('404') ||
           messageLower.includes('user not found') ||
           messageLower.includes('page not found')) {
    type = ErrorType.NOT_FOUND;
    isRetryable = false; // Expected for test accounts
  }
  
  // Network errors
  else if (messageLower.includes('network') ||
           messageLower.includes('connection') ||
           messageLower.includes('econnreset') ||
           messageLower.includes('enotfound') ||
           (error as any).code === 'ECONNRESET') {
    type = ErrorType.NETWORK_ERROR;
    isRetryable = true;
  }
  
  // Captcha/verification
  else if (messageLower.includes('captcha') ||
           messageLower.includes('verification') ||
           messageLower.includes('suspicious activity') ||
           messageLower.includes('please verify')) {
    type = ErrorType.CAPTCHA_REQUIRED;
    isRetryable = false;
  }

  return {
    type,
    message,
    code: (error as any).code,
    stack,
    isRetryable
  };
}

/**
 * Calculate overall platform health from test results
 */
export function calculatePlatformHealth(results: TestResult[], platform: string): PlatformHealth {
  const platformResults = results.filter(r => r.platform === platform);
  
  if (platformResults.length === 0) {
    return {
      platform,
      successRate: 0,
      averageAccuracy: 0,
      averageCompleteness: 0,
      averageResponseTime: 0,
      totalTests: 0,
      errorBreakdown: {} as Record<ErrorType, number>,
      trend: 'unknown',
      healthScore: 0,
      status: 'critical'
    };
  }

  const successful = platformResults.filter(r => r.success);
  const failed = platformResults.filter(r => !r.success);

  // Basic metrics
  const successRate = (successful.length / platformResults.length) * 100;
  const averageAccuracy = successful.length > 0 
    ? successful.reduce((sum, r) => sum + r.accuracyScore, 0) / successful.length
    : 0;
  const averageCompleteness = successful.length > 0
    ? successful.reduce((sum, r) => sum + r.completenessScore, 0) / successful.length
    : 0;
  const averageResponseTime = platformResults.reduce((sum, r) => sum + r.responseTimeMs, 0) / platformResults.length;

  // Error breakdown
  const errorBreakdown: Record<ErrorType, number> = {} as any;
  failed.forEach(result => {
    if (result.errorDetails) {
      const errorType = result.errorDetails.type;
      errorBreakdown[errorType] = (errorBreakdown[errorType] || 0) + 1;
    }
  });

  // Calculate health score (weighted combination of metrics)
  const healthScore = Math.round(
    (successRate * 0.4) +           // 40% weight on success rate
    (averageAccuracy * 0.3) +      // 30% weight on accuracy
    (averageCompleteness * 0.2) +  // 20% weight on completeness
    (Math.max(0, 100 - (averageResponseTime / 100)) * 0.1) // 10% weight on speed
  );

  // Determine status
  let status: PlatformHealth['status'];
  if (healthScore >= 90) status = 'excellent';
  else if (healthScore >= 75) status = 'healthy';
  else if (healthScore >= 50) status = 'warning';
  else status = 'critical';

  return {
    platform,
    successRate: Math.round(successRate * 100) / 100,
    averageAccuracy: Math.round(averageAccuracy * 100) / 100,
    averageCompleteness: Math.round(averageCompleteness * 100) / 100,
    averageResponseTime: Math.round(averageResponseTime),
    totalTests: platformResults.length,
    errorBreakdown,
    trend: 'unknown', // Would need historical data
    healthScore,
    status
  };
}

/**
 * Compare current results with baseline to detect degradation
 */
export function compareWithBaseline(
  current: PlatformHealth,
  baseline: PlatformHealth
): BaselineComparison {
  const alerts: ComparisonAlert[] = [];

  // Calculate changes
  const successRateChange = current.successRate - baseline.successRate;
  const accuracyChange = current.averageAccuracy - baseline.averageAccuracy;
  const responseTimeChange = current.averageResponseTime - baseline.averageResponseTime;

  // Check for significant degradation
  
  // Success rate alerts
  if (successRateChange <= -20) {
    alerts.push({
      type: 'success_rate_drop',
      severity: 'critical',
      message: `Success rate dropped significantly: ${baseline.successRate}% → ${current.successRate}%`,
      currentValue: current.successRate,
      previousValue: baseline.successRate,
      changePercentage: successRateChange
    });
  } else if (successRateChange <= -10) {
    alerts.push({
      type: 'success_rate_drop',
      severity: 'high',
      message: `Success rate decreased: ${baseline.successRate}% → ${current.successRate}%`,
      currentValue: current.successRate,
      previousValue: baseline.successRate,
      changePercentage: successRateChange
    });
  }

  // Accuracy alerts
  if (accuracyChange <= -15) {
    alerts.push({
      type: 'accuracy_drop',
      severity: 'high',
      message: `Accuracy dropped: ${baseline.averageAccuracy}% → ${current.averageAccuracy}%`,
      currentValue: current.averageAccuracy,
      previousValue: baseline.averageAccuracy,
      changePercentage: accuracyChange
    });
  } else if (accuracyChange <= -10) {
    alerts.push({
      type: 'accuracy_drop',
      severity: 'medium',
      message: `Accuracy decreased: ${baseline.averageAccuracy}% → ${current.averageAccuracy}%`,
      currentValue: current.averageAccuracy,
      previousValue: baseline.averageAccuracy,
      changePercentage: accuracyChange
    });
  }

  // Response time alerts
  if (responseTimeChange >= 5000) { // 5+ second increase
    alerts.push({
      type: 'response_time_increase',
      severity: 'medium',
      message: `Response time increased significantly: ${baseline.averageResponseTime}ms → ${current.averageResponseTime}ms`,
      currentValue: current.averageResponseTime,
      previousValue: baseline.averageResponseTime,
      changePercentage: (responseTimeChange / baseline.averageResponseTime) * 100
    });
  }

  // New error types
  const baselineErrors = new Set(Object.keys(baseline.errorBreakdown));
  const currentErrors = new Set(Object.keys(current.errorBreakdown));
  const newErrors = [...currentErrors].filter(error => !baselineErrors.has(error));

  if (newErrors.length > 0) {
    alerts.push({
      type: 'new_errors',
      severity: 'medium',
      message: `New error types detected: ${newErrors.join(', ')}`,
      currentValue: newErrors.length,
      previousValue: 0,
      changePercentage: 100
    });
  }

  // Determine overall change
  let overallChange: BaselineComparison['overallChange'];
  if (alerts.some(a => a.severity === 'critical')) {
    overallChange = 'degraded';
  } else if (successRateChange >= 5 && accuracyChange >= 5) {
    overallChange = 'improved';
  } else if (Math.abs(successRateChange) <= 5 && Math.abs(accuracyChange) <= 5) {
    overallChange = 'stable';
  } else {
    overallChange = 'degraded';
  }

  return {
    platform: current.platform,
    successRateChange: Math.round(successRateChange * 100) / 100,
    accuracyChange: Math.round(accuracyChange * 100) / 100,
    responseTimeChange: Math.round(responseTimeChange),
    alerts,
    overallChange
  };
}

/**
 * Helper function to extract domain from URL
 */
function extractDomain(url: string): string {
  try {
    // Handle URLs without protocol
    const urlToProcess = url.startsWith('http') ? url : `https://${url}`;
    const urlObj = new URL(urlToProcess);
    return urlObj.hostname.toLowerCase().replace('www.', '');
  } catch {
    // If URL parsing fails, try regex
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\?#]+)/);
    return match ? match[1].toLowerCase() : url.toLowerCase();
  }
}

/**
 * Validate that actual data meets minimum requirements
 */
export function validateRequiredFields(actual: any, required: string[]): {
  isValid: boolean;
  missingFields: string[];
  score: number;
} {
  if (!actual) {
    return {
      isValid: false,
      missingFields: required,
      score: 0
    };
  }

  const missingFields = required.filter(field => {
    const value = actual[field];
    return value === undefined || value === null || value === '';
  });

  const score = ((required.length - missingFields.length) / required.length) * 100;

  return {
    isValid: missingFields.length === 0,
    missingFields,
    score: Math.round(score)
  };
}

/**
 * Calculate trend from historical data points
 */
export function calculateTrend(historicalHealth: PlatformHealth[]): 'improving' | 'stable' | 'degrading' | 'unknown' {
  if (historicalHealth.length < 2) return 'unknown';

  // Sort by timestamp (most recent last)
  const sorted = [...historicalHealth].sort((a, b) => 
    new Date(a.platform).getTime() - new Date(b.platform).getTime()
  );

  const recent = sorted.slice(-3); // Last 3 data points
  if (recent.length < 2) return 'unknown';

  // Calculate average change in health score
  let totalChange = 0;
  for (let i = 1; i < recent.length; i++) {
    totalChange += recent[i].healthScore - recent[i - 1].healthScore;
  }

  const averageChange = totalChange / (recent.length - 1);

  if (averageChange >= 5) return 'improving';
  if (averageChange <= -5) return 'degrading';
  return 'stable';
}

/**
 * Get performance grade based on metrics
 */
export function getPerformanceGrade(health: PlatformHealth): {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  description: string;
} {
  const score = health.healthScore;

  if (score >= 95) {
    return { grade: 'A+', description: 'Exceptional performance' };
  } else if (score >= 90) {
    return { grade: 'A', description: 'Excellent performance' };
  } else if (score >= 80) {
    return { grade: 'B', description: 'Good performance' };
  } else if (score >= 70) {
    return { grade: 'C', description: 'Acceptable performance' };
  } else if (score >= 50) {
    return { grade: 'D', description: 'Poor performance - needs improvement' };
  } else {
    return { grade: 'F', description: 'Critical issues - immediate attention required' };
  }
}