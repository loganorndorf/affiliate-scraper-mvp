/**
 * Data Integrity Validation System
 * 
 * Detects when extractors return stale/wrong data by validating
 * that extracted data matches the expected user context.
 * 
 * CRITICAL: Prevents silent failures where extractors "succeed" 
 * but return wrong user's data.
 */

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: ValidationIssue[];
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface ValidationIssue {
  type: 'WRONG_USER_DATA' | 'STALE_DATA' | 'IMPOSSIBLE_VALUE' | 'PATTERN_MISMATCH';
  field: string;
  expected: any;
  actual: any;
  description: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * Validate that extracted data belongs to the correct user
 */
export function validateUserDataIntegrity(
  username: string,
  platform: string,
  extractedData: any,
  expectedData: any
): ValidationResult {
  const issues: ValidationIssue[] = [];
  let confidence = 100;

  // 1. Username Consistency Check
  if (extractedData.username && extractedData.username !== username) {
    issues.push({
      type: 'WRONG_USER_DATA',
      field: 'username',
      expected: username,
      actual: extractedData.username,
      description: `Extractor returned data for '${extractedData.username}' when requesting '${username}'`,
      severity: 'CRITICAL'
    });
    confidence -= 50;
  }

  // 2. Platform Consistency Check
  if (extractedData.platform && extractedData.platform !== platform) {
    issues.push({
      type: 'WRONG_USER_DATA',
      field: 'platform',
      expected: platform,
      actual: extractedData.platform,
      description: `Platform mismatch: expected '${platform}', got '${extractedData.platform}'`,
      severity: 'HIGH'
    });
    confidence -= 20;
  }

  // 3. Bio Context Validation (username should appear in bio or match expected keywords)
  if (platform === 'instagram' && extractedData.bio) {
    const bioValidation = validateBioContext(username, extractedData.bio, expectedData);
    issues.push(...bioValidation.issues);
    confidence = Math.min(confidence, bioValidation.confidence);
  }

  // 4. Follower Count Sanity Check
  if (extractedData.followerCount) {
    const followerValidation = validateFollowerCount(
      username, 
      extractedData.followerCount, 
      expectedData
    );
    issues.push(...followerValidation.issues);
    confidence = Math.min(confidence, followerValidation.confidence);
  }

  // 5. Link Context Validation (for link platforms)
  if ((platform === 'linktree' || platform === 'beacons') && extractedData.links) {
    const linkValidation = validateLinkContext(username, extractedData.links, expectedData);
    issues.push(...linkValidation.issues);
    confidence = Math.min(confidence, linkValidation.confidence);
  }

  // 6. Detect Identical Data Pattern (same data for different users)
  const identicalDataCheck = detectIdenticalDataPattern(extractedData);
  if (identicalDataCheck.suspicious) {
    issues.push({
      type: 'STALE_DATA',
      field: 'multiple',
      expected: 'unique user data',
      actual: 'identical across users',
      description: 'Extractor appears to be returning cached/stale data',
      severity: 'CRITICAL'
    });
    confidence -= 40;
  }

  const severity = getSeverityFromIssues(issues);

  return {
    isValid: issues.length === 0,
    confidence: Math.max(0, confidence),
    issues,
    severity
  };
}

/**
 * Validate bio context matches expected user
 */
function validateBioContext(username: string, bio: string, expectedData: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  let confidence = 100;

  const bioLower = bio.toLowerCase();
  const usernameLower = username.toLowerCase();

  // Check if username appears in bio (common for verified accounts)
  const usernameInBio = bioLower.includes(usernameLower) || 
                       bioLower.includes(usernameLower.replace('_', '')) ||
                       bioLower.includes(usernameLower.replace('.', ''));

  // Check expected keywords
  const expectedKeywords = expectedData.bioKeywords || [];
  let keywordMatches = 0;
  let keywordMismatches = 0;

  expectedKeywords.forEach((keyword: string) => {
    if (bioLower.includes(keyword.toLowerCase())) {
      keywordMatches++;
    } else {
      keywordMismatches++;
    }
  });

  // If we have expected keywords but none match, that's suspicious
  if (expectedKeywords.length > 0 && keywordMatches === 0) {
    issues.push({
      type: 'PATTERN_MISMATCH',
      field: 'bio',
      expected: expectedKeywords,
      actual: bio,
      description: `Bio contains none of the expected keywords for ${username}`,
      severity: 'HIGH'
    });
    confidence -= 30;
  }

  // If bio seems to be for a completely different person
  if (expectedKeywords.length > 0 && (keywordMismatches / expectedKeywords.length) > 0.8) {
    issues.push({
      type: 'WRONG_USER_DATA',
      field: 'bio',
      expected: `Bio for ${username}`,
      actual: bio,
      description: `Bio content doesn't match ${username} - may be wrong user's data`,
      severity: 'CRITICAL'
    });
    confidence -= 40;
  }

  return {
    isValid: issues.length === 0,
    confidence,
    issues,
    severity: getSeverityFromIssues(issues)
  };
}

/**
 * Validate follower count is reasonable for the user
 */
function validateFollowerCount(username: string, followerCount: number, expectedData: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  let confidence = 100;

  // Check against expected range
  if (expectedData.minFollowers !== undefined) {
    const min = expectedData.minFollowers;
    const max = expectedData.maxFollowers || min * 2; // Allow 100% growth if no max

    if (followerCount < min * 0.5) { // More than 50% below expected
      issues.push({
        type: 'IMPOSSIBLE_VALUE',
        field: 'followerCount',
        expected: `${min.toLocaleString()}+`,
        actual: followerCount.toLocaleString(),
        description: `Follower count too low for ${username} - may be wrong account`,
        severity: 'HIGH'
      });
      confidence -= 30;
    }

    if (followerCount > max * 3) { // More than 300% above expected
      issues.push({
        type: 'IMPOSSIBLE_VALUE',
        field: 'followerCount',
        expected: `<${max.toLocaleString()}`,
        actual: followerCount.toLocaleString(),
        description: `Follower count unrealistically high for ${username}`,
        severity: 'MEDIUM'
      });
      confidence -= 15;
    }
  }

  // Detect exact duplicates (multiple users with identical follower counts)
  if (followerCount === 600_000_000) { // Cristiano's exact count
    issues.push({
      type: 'STALE_DATA',
      field: 'followerCount',
      expected: 'unique user data',
      actual: 'identical to other users',
      description: 'Identical follower count suggests cached/stale data',
      severity: 'CRITICAL'
    });
    confidence -= 50;
  }

  return {
    isValid: issues.length === 0,
    confidence,
    issues,
    severity: getSeverityFromIssues(issues)
  };
}

/**
 * Validate link context makes sense for the user
 */
function validateLinkContext(username: string, links: any[], expectedData: any): ValidationResult {
  const issues: ValidationIssue[] = [];
  let confidence = 100;

  if (!links || links.length === 0) {
    return { isValid: true, confidence: 100, issues: [], severity: 'LOW' };
  }

  // Check if links match expected patterns
  const expectedLinks = expectedData.expectedLinks || [];
  const linkUrls = links.map(link => link.url || '').join(' ').toLowerCase();

  // Look for user-specific patterns in links
  const usernameLower = username.toLowerCase();
  const hasUserContext = linkUrls.includes(usernameLower) || 
                         linkUrls.includes(usernameLower.replace('_', '')) ||
                         linkUrls.includes(usernameLower.replace('.', ''));

  // If we have expected links but none match, that's suspicious
  let expectedMatches = 0;
  expectedLinks.forEach((expectedLink: string) => {
    if (linkUrls.includes(expectedLink.toLowerCase())) {
      expectedMatches++;
    }
  });

  if (expectedLinks.length > 0 && expectedMatches === 0) {
    issues.push({
      type: 'PATTERN_MISMATCH',
      field: 'links',
      expected: expectedLinks,
      actual: links.map(l => l.url),
      description: `No expected links found for ${username} - may be wrong account data`,
      severity: 'HIGH'
    });
    confidence -= 35;
  }

  // Detect if we're getting The Rock's links for everyone
  const hasRockLinks = linkUrls.includes('teremana.com') || 
                      linkUrls.includes('projectrock.com') ||
                      linkUrls.includes('zoaenergy.com');

  if (hasRockLinks && username !== 'therock') {
    issues.push({
      type: 'WRONG_USER_DATA',
      field: 'links',
      expected: `Links for ${username}`,
      actual: "The Rock's links",
      description: `Found The Rock's signature links for ${username} - indicates data reuse bug`,
      severity: 'CRITICAL'
    });
    confidence -= 50;
  }

  return {
    isValid: issues.length === 0,
    confidence,
    issues,
    severity: getSeverityFromIssues(issues)
  };
}

/**
 * Detect patterns that suggest identical data being returned
 */
function detectIdenticalDataPattern(data: any): { suspicious: boolean; reasons: string[] } {
  const reasons: string[] = [];
  
  // Check for exact bio matches (very unlikely for different users)
  if (data.bio === "Portuguese footballer, CR7") {
    reasons.push("Bio text identical to Cristiano Ronaldo");
  }
  
  // Check for exact follower count (600M is Cristiano's)
  if (data.followerCount === 600_000_000) {
    reasons.push("Follower count identical to Cristiano Ronaldo");
  }
  
  // Check for exact link matches
  if (data.bioLink === "https://goat.com/cristiano") {
    reasons.push("Bio link identical to Cristiano Ronaldo");
  }

  return {
    suspicious: reasons.length >= 2, // 2+ identical fields = suspicious
    reasons
  };
}

/**
 * Get overall severity from list of issues
 */
function getSeverityFromIssues(issues: ValidationIssue[]): ValidationResult['severity'] {
  if (issues.some(i => i.severity === 'CRITICAL')) return 'CRITICAL';
  if (issues.some(i => i.severity === 'HIGH')) return 'HIGH';
  if (issues.some(i => i.severity === 'MEDIUM')) return 'MEDIUM';
  return 'LOW';
}

/**
 * Enhanced test result that includes data integrity validation
 */
export interface ValidatedTestResult {
  platform: string;
  username: string;
  extractionSuccess: boolean;
  dataIntegrityValid: boolean;
  overallSuccess: boolean; // Both extraction AND integrity must pass
  responseTimeMs: number;
  accuracyScore: number;
  completenessScore: number;
  integrityScore: number;
  validation: ValidationResult;
  errorDetails?: any;
  timestamp: Date;
}

/**
 * Wrapper to validate test results and detect silent failures
 */
export function validateTestResult(
  platform: string,
  username: string,
  extractedData: any,
  expectedData: any,
  originalResult: any
): ValidatedTestResult {
  const validation = validateUserDataIntegrity(username, platform, extractedData, expectedData);
  
  return {
    platform,
    username,
    extractionSuccess: originalResult.success,
    dataIntegrityValid: validation.isValid,
    overallSuccess: originalResult.success && validation.isValid,
    responseTimeMs: originalResult.responseTimeMs,
    accuracyScore: originalResult.accuracyScore,
    completenessScore: originalResult.completenessScore,
    integrityScore: validation.confidence,
    validation,
    errorDetails: originalResult.errorDetails,
    timestamp: new Date()
  };
}