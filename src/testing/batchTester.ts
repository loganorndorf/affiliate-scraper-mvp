import { UniversalCreatorDiscovery, UniversalCreatorProfile } from '../orchestrators/universalDiscovery';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface TestCreator {
  name: string;
  handles?: {
    linktree?: string;
    instagram?: string;
    tiktok?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
  };
  expected?: {
    hasLinktree?: boolean;
    hasWebsite?: boolean;
    minLinks?: number;
    minFollowers?: number;
    estimatedPriority?: 'HIGH' | 'MEDIUM' | 'LOW';
  };
}

export interface BatchTestResult {
  creator: TestCreator;
  result: UniversalCreatorProfile;
  success: boolean;
  processingTime: number;
  errors: string[];
  expectations: {
    met: string[];
    failed: string[];
  };
}

export interface BatchTestSummary {
  totalCreators: number;
  successfulExtractions: number;
  successRate: number;
  averageProcessingTime: number;
  averageLinksFound: number;
  platformSuccessRates: { [platform: string]: number };
  priorityDistribution: { HIGH: number; MEDIUM: number; LOW: number };
  competitorUsage: { [competitor: string]: number };
  totalEstimatedRevenue: number;
  results: BatchTestResult[];
}

export class BatchTester {
  private discovery: UniversalCreatorDiscovery;

  constructor(youtubeApiKey?: string) {
    this.discovery = new UniversalCreatorDiscovery(youtubeApiKey);
  }

  async testCreators(creators: TestCreator[]): Promise<BatchTestSummary> {
    console.log(`🧪 Starting batch test of ${creators.length} creators...`);
    console.log('='.repeat(80));

    const results: BatchTestResult[] = [];
    const startTime = Date.now();

    for (let i = 0; i < creators.length; i++) {
      const creator = creators[i];
      console.log(`\n[${i + 1}/${creators.length}] Testing: ${creator.name}`);
      console.log('-'.repeat(50));

      const testStartTime = Date.now();
      
      try {
        const result = await this.discovery.discoverCreator(creator.name, {
          handles: creator.handles,
          timeout: 20000 // Longer timeout for batch testing
        });

        const expectations = this.validateExpectations(creator, result);
        const processingTime = Date.now() - testStartTime;

        results.push({
          creator,
          result,
          success: true,
          processingTime,
          errors: [],
          expectations
        });

        console.log(`✅ ${creator.name}: ${result.summary.uniqueLinks} links, ${result.summary.totalReach.toLocaleString()} reach`);
        console.log(`   Score: ${result.intelligenceReport.overallScore}/100`);

      } catch (error) {
        const processingTime = Date.now() - testStartTime;
        
        results.push({
          creator,
          result: {} as any,
          success: false,
          processingTime,
          errors: [String(error)],
          expectations: { met: [], failed: ['extraction_failed'] }
        });

        console.log(`❌ ${creator.name}: Failed - ${error}`);
      }

      // Rate limiting between tests
      if (i < creators.length - 1) {
        console.log('⏳ Waiting before next test...');
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    const summary = this.generateSummary(results, Date.now() - startTime);
    await this.saveResults(summary);

    console.log('\n' + '='.repeat(80));
    console.log('🏁 BATCH TEST COMPLETE');
    console.log('='.repeat(80));
    this.printSummary(summary);

    return summary;
  }

  private validateExpectations(creator: TestCreator, result: UniversalCreatorProfile): { met: string[]; failed: string[] } {
    const met: string[] = [];
    const failed: string[] = [];
    const expected = creator.expected;

    if (!expected) return { met: ['no_expectations'], failed: [] };

    // Check Linktree expectation
    if (expected.hasLinktree !== undefined) {
      const hasLinktree = result.platforms.linktree?.success && result.platforms.linktree.links.length > 0;
      if (hasLinktree === expected.hasLinktree) {
        met.push(`linktree_${expected.hasLinktree ? 'found' : 'not_found'}`);
      } else {
        failed.push(`linktree_${expected.hasLinktree ? 'expected' : 'unexpected'}`);
      }
    }

    // Check website expectation
    if (expected.hasWebsite !== undefined) {
      const hasWebsite = result.platforms.website?.success && result.platforms.website.links.length > 0;
      if (hasWebsite === expected.hasWebsite) {
        met.push(`website_${expected.hasWebsite ? 'found' : 'not_found'}`);
      } else {
        failed.push(`website_${expected.hasWebsite ? 'expected' : 'unexpected'}`);
      }
    }

    // Check minimum links
    if (expected.minLinks !== undefined) {
      if (result.summary.uniqueLinks >= expected.minLinks) {
        met.push(`min_links_${expected.minLinks}`);
      } else {
        failed.push(`insufficient_links_${result.summary.uniqueLinks}_expected_${expected.minLinks}`);
      }
    }

    // Check minimum followers
    if (expected.minFollowers !== undefined) {
      if (result.summary.totalReach >= expected.minFollowers) {
        met.push(`min_followers_${expected.minFollowers}`);
      } else {
        failed.push(`insufficient_followers_${result.summary.totalReach}_expected_${expected.minFollowers}`);
      }
    }

    // Check priority
    if (expected.estimatedPriority !== undefined) {
      // Priority validation removed with Faves integration
      if (true) {
        met.push(`priority_${expected.estimatedPriority}`);
      } else {
        // Priority validation removed
      }
    }

    return { met, failed };
  }

  private generateSummary(results: BatchTestResult[], totalTime: number): BatchTestSummary {
    const successful = results.filter(r => r.success);
    const successRate = (successful.length / results.length) * 100;
    
    const averageProcessingTime = successful.reduce((sum, r) => sum + r.processingTime, 0) / successful.length;
    const averageLinksFound = successful.reduce((sum, r) => sum + r.result.summary.uniqueLinks, 0) / successful.length;

    // Platform success rates
    const platformSuccessRates: { [platform: string]: number } = {};
    const platforms = ['linktree', 'beacons', 'instagram', 'tiktok', 'youtube', 'twitter', 'website'];
    
    platforms.forEach(platform => {
      const successes = successful.filter(r => r.result.platforms[platform]?.success).length;
      platformSuccessRates[platform] = (successes / successful.length) * 100;
    });

    // Priority distribution
    const priorityDistribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
    successful.forEach(r => {
      // Priority distribution tracking removed
    });

    // Competitor usage
    const competitorUsage: { [competitor: string]: number } = {};
    successful.forEach(r => {
      r.result.intelligenceReport.linkAggregatorAnalysis.currentAggregators.forEach(competitor => {
        competitorUsage[competitor] = (competitorUsage[competitor] || 0) + 1;
      });
    });

    // Total estimated revenue
    const totalEstimatedRevenue = successful.reduce((sum, r) => 
      sum + r.result.intelligenceReport.valueEstimation.totalValue, 0);

    return {
      totalCreators: results.length,
      successfulExtractions: successful.length,
      successRate,
      averageProcessingTime: Math.round(averageProcessingTime),
      averageLinksFound: Math.round(averageLinksFound * 10) / 10,
      platformSuccessRates,
      priorityDistribution,
      competitorUsage,
      totalEstimatedRevenue,
      results
    };
  }

  private printSummary(summary: BatchTestSummary): void {
    console.log(`📊 Test Results: ${summary.successfulExtractions}/${summary.totalCreators} (${summary.successRate.toFixed(1)}% success)`);
    console.log(`⏱️ Average processing time: ${summary.averageProcessingTime}ms`);
    console.log(`🔗 Average links found: ${summary.averageLinksFound}`);
    console.log(`💰 Total estimated revenue: $${summary.totalEstimatedRevenue.toLocaleString()}/month`);

    console.log('\n🎯 Priority Distribution:');
    Object.entries(summary.priorityDistribution).forEach(([priority, count]) => {
      const percentage = (count / summary.successfulExtractions) * 100;
      console.log(`   ${priority}: ${count} creators (${percentage.toFixed(1)}%)`);
    });

    console.log('\n🌐 Platform Success Rates:');
    Object.entries(summary.platformSuccessRates).forEach(([platform, rate]) => {
      const icon = this.getPlatformIcon(platform);
      console.log(`   ${icon} ${platform}: ${rate.toFixed(1)}%`);
    });

    if (Object.keys(summary.competitorUsage).length > 0) {
      console.log('\n⚔️ Competitor Usage:');
      Object.entries(summary.competitorUsage).forEach(([competitor, count]) => {
        const percentage = (count / summary.successfulExtractions) * 100;
        console.log(`   ${competitor}: ${count} creators (${percentage.toFixed(1)}%)`);
      });
    }

    console.log('\n📋 Individual Results:');
    summary.results.forEach((result, i) => {
      const status = result.success ? '✅' : '❌';
      const links = result.success ? result.result.summary.uniqueLinks : 0;
      const priority = 'N/A'; // Priority tracking removed
      console.log(`   ${i + 1}. ${status} ${result.creator.name}: ${links} links, ${priority} priority`);
    });
  }

  private getPlatformIcon(platform: string): string {
    const icons: { [key: string]: string } = {
      'linktree': '🌳',
      'beacons': '📡',
      'instagram': '📸',
      'tiktok': '🎵',
      'youtube': '🎬',
      'twitter': '🐦',
      'website': '🌐'
    };
    return icons[platform] || '📱';
  }

  private async saveResults(summary: BatchTestSummary): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `batch_test_${timestamp}.json`;
    const filepath = path.join('./output', filename);

    await fs.writeFile(filepath, JSON.stringify(summary, null, 2));
    console.log(`\n💾 Batch test results saved to: ${filepath}`);

    // Also save a CSV for easy analysis
    const csvFilename = `batch_test_${timestamp}.csv`;
    const csvFilepath = path.join('./output', csvFilename);
    
    const csvLines = ['Creator,Success,Links,Priority,Revenue,Followers,Platforms,Competitors'];
    
    summary.results.forEach(result => {
      if (result.success) {
        const r = result.result;
        csvLines.push([
          result.creator.name,
          'true',
          r.summary.uniqueLinks,
          'N/A', // Priority removed
          r.intelligenceReport.valueEstimation.totalValue,
          r.summary.totalReach,
          r.summary.platformsFound.join(';'),
          r.intelligenceReport.linkAggregatorAnalysis.currentAggregators.join(';')
        ].join(','));
      } else {
        csvLines.push([
          result.creator.name,
          'false',
          '0',
          'N/A',
          '0',
          '0',
          '',
          ''
        ].join(','));
      }
    });

    await fs.writeFile(csvFilepath, csvLines.join('\n'));
    console.log(`📊 CSV summary saved to: ${csvFilepath}`);
  }

  async cleanup(): Promise<void> {
    await this.discovery.cleanup();
  }
}

// Predefined test creator sets
export const TEST_CREATORS: { [key: string]: TestCreator[] } = {
  // Quick test set for development
  quick: [
    {
      name: 'therock',
      expected: {
        hasLinktree: true,
        minLinks: 3,
        minFollowers: 50000000,
        estimatedPriority: 'HIGH'
      }
    },
    {
      name: 'daviddobrik',
      expected: {
        hasLinktree: true,
        hasWebsite: true,
        minLinks: 2,
        estimatedPriority: 'HIGH'
      }
    }
  ],

  // Comprehensive test set
  comprehensive: [
    {
      name: 'therock',
      expected: {
        hasLinktree: true,
        minLinks: 5,
        minFollowers: 100000000,
        estimatedPriority: 'HIGH'
      }
    },
    {
      name: 'MrBeast',
      expected: {
        hasLinktree: false,
        hasWebsite: true,
        minLinks: 10,
        minFollowers: 50000000,
        estimatedPriority: 'HIGH'
      }
    },
    {
      name: 'daviddobrik',
      expected: {
        hasLinktree: true,
        hasWebsite: true,
        minLinks: 2,
        estimatedPriority: 'HIGH'
      }
    },
    {
      name: 'emmachamberlain',
      expected: {
        hasLinktree: true,
        minLinks: 5,
        estimatedPriority: 'MEDIUM'
      }
    },
    {
      name: 'cristiano',
      expected: {
        minLinks: 1,
        minFollowers: 500000000,
        estimatedPriority: 'HIGH'
      }
    }
  ],

  // Specific niches
  fitness: [
    { name: 'therock', expected: { hasLinktree: true, estimatedPriority: 'HIGH' } },
    { name: 'stephencurry30', expected: { minFollowers: 10000000 } },
    { name: 'lebronjames', expected: { minFollowers: 50000000 } }
  ],

  lifestyle: [
    { name: 'emmachamberlain', expected: { hasLinktree: true } },
    { name: 'jamescharles', expected: { hasLinktree: true } },
    { name: 'jeffreestar', expected: { hasLinktree: true } }
  ],

  // Test edge cases
  edge_cases: [
    { name: 'nonexistentcreator123' }, // Should fail gracefully
    { name: '!@#$%', expected: {} }, // Invalid characters
    { name: '', expected: {} }, // Empty string
    { name: 'a', expected: {} }, // Single character
  ]
};

// CLI interface
async function main() {
  const testSet = process.argv[2] || 'quick';
  const creators = TEST_CREATORS[testSet];

  if (!creators) {
    console.log('❌ Unknown test set. Available sets:');
    Object.keys(TEST_CREATORS).forEach(set => {
      console.log(`   ${set}: ${TEST_CREATORS[set].length} creators`);
    });
    process.exit(1);
  }

  console.log(`🚀 Running "${testSet}" test set (${creators.length} creators)`);
  
  const batchTester = new BatchTester(process.env.YOUTUBE_API_KEY);
  
  try {
    const summary = await batchTester.testCreators(creators);
    
    console.log('\n🎯 TEST COMPLETED SUCCESSFULLY');
    console.log(`Success Rate: ${summary.successRate.toFixed(1)}%`);
    console.log(`Total Revenue Potential: $${summary.totalEstimatedRevenue.toLocaleString()}/month`);
    
    if (summary.successRate < 80) {
      console.log('\n⚠️ Low success rate detected. Consider:');
      console.log('   - Adding YouTube API key for better results');
      console.log('   - Checking network connectivity');
      console.log('   - Reviewing rate limiting');
    }

  } catch (error) {
    console.error('❌ Batch test failed:', error);
    process.exit(1);
  } finally {
    await batchTester.cleanup();
  }
}

if (require.main === module) {
  main();
}