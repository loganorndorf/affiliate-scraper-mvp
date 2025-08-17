/**
 * Test Account Configuration for Extractor Reliability Testing
 * 
 * Defines stable test accounts with expected data for validation.
 * Used to measure extractor success rates, accuracy, and performance.
 */

export interface TestAccount {
  username: string;
  reason: string;
  category: 'mega_creator' | 'content_creator' | 'business' | 'small_creator' | 'edge_case';
  platforms: TestPlatforms;
}

export interface TestPlatforms {
  instagram?: InstagramTestData;
  tiktok?: TikTokTestData;
  youtube?: YouTubeTestData;
  twitter?: TwitterTestData;
  linktree?: LinktreeTestData;
  beacons?: BeaconsTestData;
  amazon?: AmazonTestData;
  website?: WebsiteTestData;
}

export interface InstagramTestData {
  exists: boolean;
  isPrivate?: boolean;
  isVerified?: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  bioKeywords?: string[];
  hasBioLink?: boolean;
  bioLinkContains?: string;
  linkPattern?: RegExp;
  shouldNotExist?: boolean;
  expectBusinessLinks?: boolean;
}

export interface TikTokTestData {
  exists: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  hasLink?: boolean;
  bioKeywords?: string[];
  isVerified?: boolean;
  hasBioLink?: boolean;
  shouldNotExist?: boolean;
}

export interface YouTubeTestData {
  exists: boolean;
  channelName?: string;
  channelHandle?: string;
  minSubscribers: number;
  maxSubscribers?: number;
  isVerified?: boolean;
  channelKeywords?: string[];
  hasChannelLinks?: boolean;
  expectAffiliates?: boolean;
  expectedInDescription?: string[];
  expectNoAffiliates?: boolean;
}

export interface TwitterTestData {
  exists: boolean;
  minFollowers?: number;
  maxFollowers?: number;
  bioKeywords?: string[];
  isVerified?: boolean;
  hasBioLink?: boolean;
  bioLinkExpected?: boolean;
  expectBusinessLinks?: boolean;
  shouldNotExist?: boolean;
}

export interface LinktreeTestData {
  exists: boolean;
  minLinks?: number;
  maxLinks?: number;
  expectedLinks?: string[];
  mustHaveCategories?: string[];
  shouldNotExist?: boolean;
}

export interface BeaconsTestData {
  exists: boolean;
  minLinks: number;
  maxLinks: number;
  expectedLinks?: string[];
  shouldNotExist?: boolean;
}

export interface AmazonTestData {
  exists: boolean;
  storeHandle?: string;
  minProducts?: number;
  maxProducts?: number;
  categories?: string[];
  hasCustomBranding?: boolean;
  shouldNotExist?: boolean;
}

export interface WebsiteTestData {
  exists: boolean;
  domains?: string[];
  hasAffiliate?: boolean;
  hasShop?: boolean;
  expectedPlatform?: 'wordpress' | 'shopify' | 'squarespace' | 'wix' | 'custom';
  minLinks?: number;
  shouldNotExist?: boolean;
}

/**
 * Core test accounts for reliability testing
 */
export const TEST_ACCOUNTS: TestAccount[] = [
  // ===== MEGA CREATORS (Most Stable) =====
  {
    username: 'cristiano',
    reason: 'Most followed person globally, extremely stable profile',
    category: 'mega_creator',
    platforms: {
      instagram: {
        exists: true,
        isVerified: true,
        minFollowers: 600_000_000,
        maxFollowers: 650_000_000,
        bioKeywords: ['footballer', 'CR7', 'portugal'],
        hasBioLink: true,
        linkPattern: /goat\.com|nike\.com|livescore|cr7/i
      },
      tiktok: {
        exists: true,
        isVerified: true,
        minFollowers: 50_000_000,
        bioKeywords: ['footballer', 'CR7'],
        hasBioLink: false // TikTok often has no external link
      },
      twitter: {
        exists: true,
        isVerified: true,
        minFollowers: 100_000_000,
        bioKeywords: ['footballer', 'CR7'],
        hasBioLink: true
      },
      youtube: {
        exists: true,
        channelName: 'Cristiano Ronaldo',
        isVerified: true,
        minSubscribers: 1_000_000,
        channelKeywords: ['football', 'soccer', 'goals'],
        hasChannelLinks: false,
        expectNoAffiliates: true // Rarely does affiliate marketing
      },
      amazon: {
        exists: false,
        shouldNotExist: true
      },
      website: {
        exists: false,
        shouldNotExist: true
      }
    }
  },

  {
    username: 'therock',
    reason: 'Has stable Linktree setup with business ventures',
    category: 'mega_creator',
    platforms: {
      instagram: {
        exists: true,
        isVerified: true,
        minFollowers: 390_000_000,
        maxFollowers: 420_000_000,
        bioKeywords: ['actor', 'tequila', 'project rock'],
        hasBioLink: true,
        bioLinkContains: 'linktr.ee'
      },
      linktree: {
        exists: true,
        minLinks: 8,
        maxLinks: 15,
        expectedLinks: [
          'teremana.com',        // His tequila brand
          'projectrock.com',     // Under Armour line
          'zoaenergy.com',       // Energy drink
          'sevenbucksprod.com'   // Production company
        ],
        mustHaveCategories: ['shop', 'brand']
      },
      tiktok: {
        exists: true,
        isVerified: true,
        minFollowers: 70_000_000,
        bioKeywords: ['actor', 'tequila'],
        hasBioLink: true
      },
      twitter: {
        exists: true,
        isVerified: true,
        minFollowers: 20_000_000,
        bioKeywords: ['actor', 'tequila', 'project rock'],
        hasBioLink: true
      },
      youtube: {
        exists: true,
        channelName: 'TheRock',
        isVerified: true,
        minSubscribers: 5_000_000,
        channelKeywords: ['workout', 'motivation', 'tequila'],
        hasChannelLinks: true,
        expectAffiliates: true
      },
      amazon: {
        exists: false,
        shouldNotExist: true
      },
      website: {
        exists: false,
        shouldNotExist: true
      }
    }
  },

  // ===== CONTENT CREATORS (YouTube Heavy) =====
  {
    username: 'mrbeast',
    reason: 'YouTube focused with extensive affiliate network',
    category: 'content_creator',
    platforms: {
      instagram: {
        exists: true,
        isVerified: true,
        minFollowers: 50_000_000,
        maxFollowers: 70_000_000,
        hasBioLink: true
      },
      youtube: {
        exists: true,
        channelHandle: '@MrBeast',
        channelName: 'MrBeast',
        minSubscribers: 200_000_000,
        expectAffiliates: true,
        expectedInDescription: [
          'feastables.com',      // His chocolate brand
          'shopmrbeast.com',     // Merchandise
          'beastphilanthropy'    // Charity organization
        ]
      },
      tiktok: {
        exists: true,
        isVerified: true,
        minFollowers: 90_000_000,
        bioKeywords: ['youtube', 'philanthropy'],
        hasBioLink: true
      },
      twitter: {
        exists: true,
        isVerified: true,
        minFollowers: 20_000_000,
        bioKeywords: ['youtube', 'creator'],
        hasBioLink: true
      },
      amazon: {
        exists: true,
        storeHandle: 'mrbeast',
        minProducts: 5,
        maxProducts: 50,
        categories: ['food', 'gaming', 'lifestyle'],
        hasCustomBranding: true
      },
      beacons: {
        exists: false,
        shouldNotExist: true,
        minLinks: 0,
        maxLinks: 0
      },
      website: {
        exists: true,
        domains: ['mrbeast.com', 'feastables.com'],
        hasAffiliate: true,
        hasShop: true,
        expectedPlatform: 'custom',
        minLinks: 3
      }
    }
  },

  {
    username: 'mkbhd',
    reason: 'Tech reviewer with affiliate links in YouTube descriptions',
    category: 'content_creator',
    platforms: {
      instagram: {
        exists: true,
        isVerified: true,
        minFollowers: 5_000_000,
        maxFollowers: 7_000_000,
        bioKeywords: ['tech', 'reviewer', 'youtube']
      },
      youtube: {
        exists: true,
        channelHandle: '@MKBHD',
        channelName: 'Marques Brownlee',
        minSubscribers: 18_000_000,
        expectAffiliates: true,
        expectedInDescription: [
          'amazon.com',
          'store.dftba.com'
        ]
      },
      twitter: {
        exists: true,
        isVerified: true,
        minFollowers: 3_000_000,
        bioKeywords: ['tech', 'reviewer'],
        hasBioLink: false,
        bioLinkExpected: false
      },
      amazon: {
        exists: false,
        shouldNotExist: true
      },
      beacons: {
        exists: false,
        shouldNotExist: true,
        minLinks: 0,
        maxLinks: 0
      },
      website: {
        exists: false,
        shouldNotExist: true
      }
    }
  },

  // ===== BUSINESS ACCOUNTS =====
  {
    username: 'garyvee',
    reason: 'Business entrepreneur with links across platforms',
    category: 'business',
    platforms: {
      instagram: {
        exists: true,
        isVerified: true,
        minFollowers: 10_000_000,
        maxFollowers: 12_000_000,
        bioKeywords: ['entrepreneur', 'wine', 'business'],
        expectBusinessLinks: true
      },
      twitter: {
        exists: true,
        isVerified: true,
        minFollowers: 3_000_000,
        bioKeywords: ['entrepreneur', 'wine'],
        hasBioLink: true,
        bioLinkExpected: true
      },
      youtube: {
        exists: true,
        channelName: 'GaryVee',
        isVerified: true,
        minSubscribers: 3_000_000,
        channelKeywords: ['entrepreneur', 'business', 'wine'],
        hasChannelLinks: true,
        expectAffiliates: false // More education focused
      },
      amazon: {
        exists: false,
        shouldNotExist: true
      },
      beacons: {
        exists: false,
        shouldNotExist: true,
        minLinks: 0,
        maxLinks: 0
      },
      website: {
        exists: true,
        domains: ['garyvaynerchuk.com'],
        hasAffiliate: false,
        hasShop: true,
        expectedPlatform: 'custom',
        minLinks: 1
      }
    }
  },

  {
    username: 'teslamotors',
    reason: 'Corporate account with consistent branding',
    category: 'business',
    platforms: {
      instagram: {
        exists: true,
        isVerified: true,
        minFollowers: 8_000_000,
        maxFollowers: 10_000_000,
        bioKeywords: ['electric', 'tesla', 'sustainable'],
        hasBioLink: true,
        bioLinkContains: 'tesla.com'
      },
      twitter: {
        exists: true,
        minFollowers: 20_000_000,
        bioLinkExpected: true
      },
      youtube: {
        exists: true,
        channelName: 'Tesla',
        isVerified: true,
        minSubscribers: 2_000_000,
        channelKeywords: ['electric', 'car', 'technology'],
        hasChannelLinks: true,
        expectNoAffiliates: true
      },
      amazon: {
        exists: false,
        shouldNotExist: true
      },
      beacons: {
        exists: false,
        shouldNotExist: true,
        minLinks: 0,
        maxLinks: 0
      },
      website: {
        exists: true,
        domains: ['tesla.com'],
        hasAffiliate: false,
        hasShop: true,
        expectedPlatform: 'custom',
        minLinks: 0
      },
      tiktok: {
        exists: true,
        isVerified: true,
        minFollowers: 5_000_000,
        bioKeywords: ['electric', 'tesla'],
        hasBioLink: true
      }
    }
  },

  // ===== SMALL CREATORS =====
  {
    username: 'fitness_guru_sarah',
    reason: 'Small fitness creator with affiliate links',
    category: 'small_creator',
    platforms: {
      instagram: {
        exists: true,
        isVerified: false,
        minFollowers: 5_000,
        maxFollowers: 15_000,
        bioKeywords: ['fitness', 'nutrition'],
        hasBioLink: true
      },
      linktree: {
        exists: true,
        minLinks: 3,
        maxLinks: 10,
        expectedLinks: ['gymshark.com'],
        mustHaveCategories: ['fitness']
      },
      beacons: {
        exists: false,
        shouldNotExist: true,
        minLinks: 0,
        maxLinks: 0
      },
      amazon: {
        exists: false,
        shouldNotExist: true
      },
      website: {
        exists: false,
        shouldNotExist: true
      }
    }
  },

  // ===== EDGE CASES =====
  {
    username: 'nonexistent_user_test_12345',
    reason: 'Test account not found handling',
    category: 'edge_case',
    platforms: {
      instagram: { exists: false, shouldNotExist: true, minFollowers: 0 },
      tiktok: { exists: false, shouldNotExist: true },
      twitter: { exists: false, shouldNotExist: true },
      youtube: { exists: false, minSubscribers: 0 },
      linktree: { exists: false, shouldNotExist: true, minLinks: 0, maxLinks: 0 },
      beacons: { exists: false, shouldNotExist: true, minLinks: 0, maxLinks: 0 },
      amazon: { exists: false, shouldNotExist: true },
      website: { exists: false, shouldNotExist: true }
    }
  },

  {
    username: 'private_test_account',
    reason: 'Test private account handling',
    category: 'edge_case',
    platforms: {
      instagram: {
        exists: true,
        isPrivate: true,
        minFollowers: 0,
        maxFollowers: 1000
      }
    }
  }
];

/**
 * Quick test subset for rapid development testing
 */
export const QUICK_TEST_ACCOUNTS = TEST_ACCOUNTS.filter(account => 
  ['cristiano', 'therock', 'mrbeast'].includes(account.username)
);

/**
 * Critical platforms that must work for core functionality
 */
export const CRITICAL_PLATFORMS = ['instagram', 'linktree'];

/**
 * Success rate thresholds by platform priority
 */
export const SUCCESS_THRESHOLDS = {
  critical: {
    platforms: ['instagram', 'linktree'],
    minimumSuccessRate: 0.80,
    minimumAccuracy: 0.95
  },
  important: {
    platforms: ['tiktok', 'youtube'],
    minimumSuccessRate: 0.70,
    minimumAccuracy: 0.90
  },
  optional: {
    platforms: ['twitter', 'beacons'],
    minimumSuccessRate: 0.50,
    minimumAccuracy: 0.85
  }
} as const;

/**
 * Expected error types for testing error handling
 */
export const EXPECTED_ERRORS = {
  ACCOUNT_NOT_FOUND: 'Account does not exist on platform',
  PRIVATE_ACCOUNT: 'Account is private and cannot be accessed',
  RATE_LIMITED: 'Platform is rate limiting requests',
  TIMEOUT: 'Request timed out',
  SELECTOR_NOT_FOUND: 'HTML selectors have changed',
  NETWORK_ERROR: 'Network connection failed',
  CAPTCHA_REQUIRED: 'Platform requires captcha verification'
} as const;

/**
 * Test configuration for different test scenarios
 */
export const TEST_CONFIGURATIONS = {
  quick: {
    accounts: QUICK_TEST_ACCOUNTS,
    timeout: 10_000,
    skipAccuracy: false,
    maxConcurrent: 2
  },
  full: {
    accounts: TEST_ACCOUNTS,
    timeout: 30_000,
    skipAccuracy: false,
    maxConcurrent: 3
  },
  edgeCases: {
    accounts: TEST_ACCOUNTS.filter(a => a.category === 'edge_case'),
    timeout: 5_000,
    expectErrors: true,
    maxConcurrent: 1
  }
} as const;

/**
 * Helper to get test accounts by category
 */
export function getAccountsByCategory(category: TestAccount['category']): TestAccount[] {
  return TEST_ACCOUNTS.filter(account => account.category === category);
}

/**
 * Helper to get accounts that should have specific platform
 */
export function getAccountsWithPlatform(platform: keyof TestPlatforms): TestAccount[] {
  return TEST_ACCOUNTS.filter(account => account.platforms[platform]?.exists);
}

/**
 * Helper to add new test account (for easy expansion)
 */
export function createTestAccount(
  username: string,
  reason: string,
  category: TestAccount['category'],
  platforms: TestPlatforms
): TestAccount {
  return {
    username,
    reason,
    category,
    platforms
  };
}