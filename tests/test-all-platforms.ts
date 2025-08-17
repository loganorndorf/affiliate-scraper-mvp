#!/usr/bin/env ts-node

/**
 * Comprehensive Platform Test Runner
 * 
 * Tests ALL extractors with fixed implementations to verify
 * the caching bug is resolved across all platforms.
 */

import { ExtractorTester } from './core/ExtractorTester';
import { FixedInstagramExtractor } from './extractors-fixed/instagram-fixed';
import { FixedLinktreeExtractor } from './extractors-fixed/linktree-fixed';
import { FixedAmazonExtractor } from './extractors-fixed/amazon-fixed';
import { FixedBeaconsExtractor } from './extractors-fixed/beacons-fixed';
import { FixedTikTokExtractor } from './extractors-fixed/tiktok-fixed';
import { FixedTwitterExtractor } from './extractors-fixed/twitter-fixed';
import { FixedWebsiteExtractor } from './extractors-fixed/website-fixed';
import { FixedYouTubeExtractor } from './extractors-fixed/youtube-fixed';

// All fixed extractors with no shared state
const allFixedExtractors = {
  instagram: {
    async extract(username: string) {
      const extractor = new FixedInstagramExtractor();
      const result = await extractor.getProfile(username);
      
      if (!result) throw new Error('Instagram extraction failed');
      
      return {
        username: result.username,
        platform: 'instagram',
        followerCount: result.followerCount,
        bio: result.bioText,
        isVerified: result.isVerified,
        bioLink: result.bioLink
      };
    }
  },
  
  linktree: {
    async extract(username: string) {
      const extractor = new FixedLinktreeExtractor();
      const linktreeUrl = `https://linktr.ee/${username}`;
      const links = await extractor.extractLinks(linktreeUrl);
      
      return {
        username,
        platform: 'linktree',
        links: links.map(link => ({
          title: link.title,
          url: link.originalUrl
        }))
      };
    }
  },
  
  amazon: {
    async extract(username: string) {
      const extractor = new FixedAmazonExtractor();
      const result = await extractor.extractStorefront(username);
      
      return {
        username: result.username,
        platform: result.platform,
        products: result.products,
        totalProducts: result.totalProducts,
        categories: result.categories,
        hasStorefront: result.hasStorefront
      };
    }
  },
  
  beacons: {
    async extract(username: string) {
      const extractor = new FixedBeaconsExtractor();
      const beaconsUrl = `https://beacons.ai/${username}`;
      
      try {
        const links = await extractor.extractLinks(beaconsUrl);
        return {
          username,
          platform: 'beacons',
          links: links.map(link => ({
            title: link.title,
            url: link.originalUrl
          }))
        };
      } catch (error) {
        // Beacons account might not exist
        return {
          username,
          platform: 'beacons',
          links: [],
          error: String(error)
        };
      }
    }
  },
  
  tiktok: {
    async extract(username: string) {
      const extractor = new FixedTikTokExtractor();
      const result = await extractor.extract(username);
      
      if (!result) throw new Error('TikTok extraction failed');
      
      return {
        username: result.username,
        platform: 'tiktok',
        followerCount: result.followerCount,
        bio: result.bioText,
        isVerified: result.isVerified,
        bioLink: result.bioLink,
        fullName: result.fullName
      };
    }
  },
  
  twitter: {
    async extract(username: string) {
      const extractor = new FixedTwitterExtractor();
      const result = await extractor.extract(username);
      
      if (!result) throw new Error('Twitter extraction failed');
      
      return {
        username: result.username,
        platform: 'twitter',
        followerCount: result.followerCount,
        bio: result.bioText,
        isVerified: result.isVerified,
        website: result.website,
        fullName: result.fullName
      };
    }
  },
  
  youtube: {
    async extract(username: string) {
      const extractor = new FixedYouTubeExtractor();
      const result = await extractor.extract(username);
      
      if (!result) throw new Error('YouTube extraction failed');
      
      return {
        username: result.username,
        platform: 'youtube',
        channelName: result.channelName,
        subscriberCount: result.subscriberCount,
        isVerified: result.isVerified,
        description: result.description
      };
    }
  },
  
  website: {
    async extract(username: string) {
      const extractor = new FixedWebsiteExtractor();
      const result = await extractor.discoverWebsite(username);
      
      if (!result) throw new Error('Website discovery failed');
      
      return {
        username: result.username,
        platform: result.platform,
        domain: result.domain,
        websitePlatform: result.websitePlatform,
        hasAffiliate: result.hasAffiliate,
        hasShop: result.hasShop,
        links: result.links,
        products: result.products,
        success: result.success
      };
    }
  }
};

async function main() {
  const args = process.argv.slice(2);
  const mode = getArg(args, '--mode') || 'quick';
  const platform = getArg(args, '--platform');
  const username = getArg(args, '--username');

  console.log('🧪 Testing ALL PLATFORMS with FIXED extractors (no shared state)...\\n');
  
  const tester = new ExtractorTester(allFixedExtractors);
  
  try {
    let results;

    if (username && platform) {
      // Test single account on single platform
      console.log(`Testing ${platform}/${username}...`);
      results = [await tester.testSingle(platform, username, {})];
    } else if (platform) {
      // Test all accounts on single platform
      results = await tester.testPlatform(platform);
    } else {
      // Test all platforms and accounts
      results = await tester.testAll(mode as 'quick' | 'full');
    }

    console.log('\\n📊 ALL PLATFORMS TEST RESULTS:');
    console.log('='.repeat(60));
    
    // Show validation results by platform
    const platformSummary: Record<string, {valid: number, invalid: number, total: number}> = {};
    
    results.forEach(result => {
      if (!platformSummary[result.platform]) {
        platformSummary[result.platform] = {valid: 0, invalid: 0, total: 0};
      }
      
      platformSummary[result.platform].total++;
      
      if (result.dataIntegrityValid) {
        platformSummary[result.platform].valid++;
      } else {
        platformSummary[result.platform].invalid++;
      }
      
      const integrity = result.dataIntegrityValid ? '✅ VALID' : '❌ INVALID';
      const integrityScore = result.integrityScore || 0;
      
      console.log(`${result.platform}/${result.username}: ${integrity} (${integrityScore}% integrity)`);
      
      if (!result.dataIntegrityValid && result.validationIssues && result.validationIssues.length > 0) {
        result.validationIssues.forEach((issue: any) => {
          console.log(`  🚨 ${issue.severity}: ${issue.description}`);
        });
      }
    });
    
    console.log('\\n📈 PLATFORM SUMMARY:');
    Object.entries(platformSummary).forEach(([platform, stats]) => {
      const successRate = ((stats.valid / stats.total) * 100).toFixed(1);
      const status = stats.valid === stats.total ? '✅' : 
                   stats.valid >= stats.total * 0.8 ? '⚠️' : '❌';
      
      console.log(`${status} ${platform}: ${stats.valid}/${stats.total} valid (${successRate}%)`);
    });
    
    const totalValid = Object.values(platformSummary).reduce((sum, stats) => sum + stats.valid, 0);
    const totalTests = Object.values(platformSummary).reduce((sum, stats) => sum + stats.total, 0);
    const overallSuccessRate = ((totalValid / totalTests) * 100).toFixed(1);
    
    console.log('\\n🎯 OVERALL RESULTS:');
    console.log(`Total valid extractions: ${totalValid}/${totalTests}`);
    console.log(`Overall data integrity rate: ${overallSuccessRate}%`);
    
    if (totalValid === totalTests) {
      console.log('\\n🎉 SUCCESS: All platforms returning valid, user-specific data!');
      console.log('✅ Browser state caching bug has been FIXED across all platforms!');
    } else if (totalValid >= totalTests * 0.8) {
      console.log('\\n🟡 MOSTLY WORKING: Most platforms are working correctly');
      console.log('⚠️ Some platforms may have rate limiting or detection issues');
    } else {
      console.log('\\n🔴 ISSUES DETECTED: Multiple platforms showing problems');
      console.log('❌ Needs further investigation');
    }
    
    // Print standard report
    tester.printResults(results);
    
    // Save results
    await tester.saveResults(results, './tests/results/all_platforms_test.json');
    
  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

function getArg(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index !== -1 && index + 1 < args.length ? args[index + 1] : undefined;
}

if (require.main === module) {
  main().catch(console.error);
}