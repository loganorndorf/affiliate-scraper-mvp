import { LinktreeExtractor } from './extractors/linktree';
import { LinkExpander } from './processors/linkExpander';

async function testFullPipeline() {
  console.log('🧪 Testing full extraction pipeline...\n');
  
  const linktreeExtractor = new LinktreeExtractor();
  const linkExpander = new LinkExpander();
  
  try {
    // Step 1: Extract links from Linktree
    console.log('Step 1: Extracting from Linktree...');
    const links = await linktreeExtractor.extractLinks('https://linktr.ee/therock');
    
    console.log(`Found ${links.length} links from Linktree\n`);
    
    // Step 2: Expand and analyze each link
    console.log('Step 2: Expanding and analyzing links...');
    
    for (const link of links) {
      console.log(`\n📎 Processing: ${link.title}`);
      console.log(`   Original: ${link.originalUrl}`);
      
      // Expand URL
      const expandedUrl = await linkExpander.expandUrl(link.originalUrl);
      
      // Detect affiliate info
      const affiliateInfo = linkExpander.detectAffiliateParams(expandedUrl);
      
      // Classify link type
      const linkType = linkExpander.classifyLinkType(expandedUrl);
      
      // Extract product info
      const productId = linkExpander.extractProductId(expandedUrl, linkType);
      const brand = linkExpander.extractBrandFromUrl(expandedUrl);
      
      console.log(`   Expanded: ${expandedUrl}`);
      console.log(`   Type: ${linkType}`);
      console.log(`   Brand: ${brand || 'Unknown'}`);
      console.log(`   Affiliate: ${affiliateInfo.isAffiliate ? `Yes (${affiliateInfo.platform}: ${affiliateInfo.affiliateId})` : 'No'}`);
      if (productId) console.log(`   Product ID: ${productId}`);
    }
    
    // Step 3: Summary
    const affiliateLinks = links.filter(link => {
      const expanded = linkExpander.detectAffiliateParams(link.originalUrl);
      return expanded.isAffiliate;
    });
    
    console.log(`\n📊 Pipeline Summary:`);
    console.log(`Total links extracted: ${links.length}`);
    console.log(`Affiliate links detected: ${affiliateLinks.length}`);
    console.log(`Processing completed successfully! ✅`);
    
  } catch (error) {
    console.error('❌ Pipeline test failed:', error);
  } finally {
    await linktreeExtractor.close();
  }
}

testFullPipeline();