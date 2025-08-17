#!/usr/bin/env ts-node

/**
 * Test Fixed Extractors
 * 
 * Tests the fixed extractors that don't share browser state
 * to verify the caching bug is resolved.
 */

import { ExtractorTester } from './core/ExtractorTester';
import { FixedInstagramExtractor } from './extractors-fixed/instagram-fixed';
import { FixedLinktreeExtractor } from './extractors-fixed/linktree-fixed';

// Fixed extractors with no shared state
const fixedExtractors = {
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
      
      // Try to construct Linktree URL from username
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
  }
};

async function main() {
  console.log('🧪 Testing FIXED extractors (no shared state)...\n');
  
  const tester = new ExtractorTester(fixedExtractors);
  
  try {
    // Test with quick mode to see if caching bug is fixed
    const results = await tester.testAll('quick');
    
    console.log('\n📊 FIXED EXTRACTOR RESULTS:');
    console.log('='.repeat(50));
    
    // Show validation results specifically
    let validDataCount = 0;
    let invalidDataCount = 0;
    
    results.forEach(result => {
      const integrity = result.dataIntegrityValid ? '✅ VALID' : '❌ INVALID';
      const integrityScore = result.integrityScore || 0;
      
      console.log(`${result.platform}/${result.username}: ${integrity} (${integrityScore}% integrity)`);
      
      if (result.dataIntegrityValid) {
        validDataCount++;
      } else {
        invalidDataCount++;
        if (result.validationIssues && result.validationIssues.length > 0) {
          result.validationIssues.forEach((issue: any) => {
            console.log(`  🚨 ${issue.severity}: ${issue.description}`);
          });
        }
      }
    });
    
    console.log('\n📈 DATA INTEGRITY SUMMARY:');
    console.log(`Valid extractions: ${validDataCount}/${results.length}`);
    console.log(`Invalid extractions: ${invalidDataCount}/${results.length}`);
    console.log(`Data integrity rate: ${((validDataCount / results.length) * 100).toFixed(1)}%`);
    
    if (validDataCount === results.length) {
      console.log('\n🎉 SUCCESS: All extractions returned valid, user-specific data!');
      console.log('✅ Caching bug has been FIXED!');
    } else {
      console.log('\n⚠️ Still seeing data integrity issues - needs more investigation');
    }
    
    // Print standard report
    tester.printResults(results);
    
    // Save results
    await tester.saveResults(results, './tests/results/fixed_extractors_test.json');
    
  } catch (error) {
    console.error('❌ Test failed:', (error as Error).message);
    process.exit(1);
  } finally {
    await tester.cleanup();
  }
}

if (require.main === module) {
  main().catch(console.error);
}