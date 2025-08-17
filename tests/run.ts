#!/usr/bin/env ts-node

/**
 * Test Runner Entry Point
 * 
 * Usage:
 *   npm run test:reliability
 *   npm run test:reliability -- --platform=instagram
 *   npm run test:reliability -- --username=therock
 *   npm run test:reliability -- --mode=quick
 */

import { ExtractorTester } from './core/ExtractorTester';

// Enhanced mock extractors that return user-specific data  
// NOTE: Use 'npm run test:fixed' to test actual fixed extractors
const mockExtractors = {
  instagram: {
    async extract(username: string) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Return user-specific data to test validation system
      const userData = getMockUserData(username);
      return {
        username,
        platform: 'instagram',
        ...userData.instagram
      };
    }
  },
  
  linktree: {
    async extract(username: string) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const userData = getMockUserData(username);
      return {
        username,
        platform: 'linktree',
        links: userData.linktree.links
      };
    }
  }
};

// Mock data that matches expected test account data
function getMockUserData(username: string) {
  const mockData: Record<string, any> = {
    cristiano: {
      instagram: {
        followerCount: 615_000_000,
        bio: 'Portuguese footballer, CR7, Manchester United',
        isVerified: true,
        bioLink: 'https://goat.com/cristiano'
      },
      linktree: { links: [] }
    },
    therock: {
      instagram: {
        followerCount: 395_000_000,
        bio: 'Actor, producer, tequila, Project Rock',
        isVerified: true,
        bioLink: 'https://linktr.ee/therock'
      },
      linktree: {
        links: [
          { title: 'Teremana Tequila', url: 'https://teremana.com' },
          { title: 'Project Rock', url: 'https://projectrock.com' },
          { title: 'ZOA Energy', url: 'https://zoaenergy.com' },
          { title: 'Seven Bucks', url: 'https://sevenbucksprod.com' }
        ]
      }
    },
    mrbeast: {
      instagram: {
        followerCount: 60_000_000,
        bio: 'YouTube creator, philanthropy, chocolate',
        isVerified: true,
        bioLink: 'https://linktr.ee/mrbeast'
      },
      linktree: { links: [] }
    },
    // For users not in our mock data, return obviously wrong data to test validation
    default: {
      instagram: {
        followerCount: 600_000_000, // Cristiano's count - should trigger validation
        bio: 'Portuguese footballer, CR7', // Cristiano's bio - should trigger validation
        isVerified: true,
        bioLink: 'https://goat.com/cristiano' // Cristiano's link - should trigger validation
      },
      linktree: {
        links: [
          { title: 'Teremana Tequila', url: 'https://teremana.com' }, // Rock's links - should trigger validation
          { title: 'Project Rock', url: 'https://projectrock.com' }
        ]
      }
    }
  };

  return mockData[username] || mockData.default;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = getArg(args, '--mode') || 'full';
  const platform = getArg(args, '--platform');
  const username = getArg(args, '--username');

  const tester = new ExtractorTester(mockExtractors);

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

    // Print results
    tester.printResults(results);

    // Save results
    const outputFile = await tester.saveResults(results);
    console.log(`\n📁 Detailed results saved to: ${outputFile}`);

  } catch (error) {
    console.error('❌ Test runner failed:', (error as Error).message);
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