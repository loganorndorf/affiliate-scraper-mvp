import { ExtractedLink } from '../extractors/types';

export interface DedupedLink {
  url: string;                    // Normalized URL
  originalUrls: string[];         // All variations found
  sources: string[];              // Platforms where found
  occurrences: number;            // How many times found
  confidence: number;             // Calculated confidence score
  firstSeen: Date;
  lastSeen: Date;
  brand?: string;
  title: string;                  // Best title from all sources
  type: string;
  isAffiliate: boolean;
  affiliateId?: string;
}

export class LinkDeduplicator {
  private static readonly TRACKING_PARAMS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term',
    'ref', 'reference', 'affiliate', 'partner', 'source',
    'fbclid', 'gclid', 'msclkid', 'twclid',
    'mc_cid', 'mc_eid', '_ga', 'ck_subscriber_id'
  ];
  
  private static readonly SOURCE_CONFIDENCE: Record<string, number> = {
    'youtube_video': 95,        // High confidence - explicitly mentioned in content
    'youtube_channel': 90,      // High confidence - official channel
    'linktree': 85,            // High confidence - curated links
    'beacons': 85,             // High confidence - curated links
    'bio': 80,                 // Medium confidence - main bio link
    'post': 70,                // Medium confidence - might be temporary
    'story': 60                // Lower confidence - temporary content
  };
  
  deduplicate(links: ExtractedLink[]): DedupedLink[] {
    console.log(`🧠 Deduplicating ${links.length} links...`);
    
    const linkGroups = new Map<string, DedupedLink>();
    const now = new Date();
    
    links.forEach(link => {
      const normalizedUrl = this.normalizeUrl(link.expandedUrl || link.originalUrl);
      
      if (linkGroups.has(normalizedUrl)) {
        // Update existing group
        const existing = linkGroups.get(normalizedUrl)!;
        existing.originalUrls.push(link.originalUrl);
        existing.sources.push(link.source);
        existing.occurrences++;
        existing.lastSeen = now;
        
        // Update confidence based on new source
        existing.confidence = this.calculateConfidence(existing);
        
        // Use better title if available
        if (link.title.length > existing.title.length && link.title.length < 100) {
          existing.title = link.title;
        }
        
      } else {
        // Create new group
        linkGroups.set(normalizedUrl, {
          url: normalizedUrl,
          originalUrls: [link.originalUrl],
          sources: [link.source],
          occurrences: 1,
          confidence: this.getSourceConfidence(link.source),
          firstSeen: now,
          lastSeen: now,
          brand: (link as any).brand,
          title: link.title,
          type: link.type,
          isAffiliate: (link as any).isAffiliate || false,
          affiliateId: (link as any).affiliateId
        });
      }
    });
    
    const dedupedLinks = Array.from(linkGroups.values());
    
    // Sort by confidence and occurrence
    dedupedLinks.sort((a, b) => {
      if (a.confidence !== b.confidence) {
        return b.confidence - a.confidence;
      }
      return b.occurrences - a.occurrences;
    });
    
    console.log(`✅ Deduplicated to ${dedupedLinks.length} unique links`);
    console.log(`   Removed ${links.length - dedupedLinks.length} duplicates`);
    
    return dedupedLinks;
  }
  
  normalizeUrl(url: string): string {
    try {
      const parsed = new URL(url);
      
      // Remove tracking parameters
      LinkDeduplicator.TRACKING_PARAMS.forEach(param => {
        parsed.searchParams.delete(param);
      });
      
      // Special handling for Amazon (keep essential params, remove tracking)
      if (parsed.hostname.includes('amazon')) {
        // Keep essential Amazon params but remove affiliate tracking for dedup
        const essentialParams = ['dp', 'product', 'asin'];
        const newSearchParams = new URLSearchParams();
        
        essentialParams.forEach(param => {
          const value = parsed.searchParams.get(param);
          if (value) newSearchParams.set(param, value);
        });
        
        parsed.search = newSearchParams.toString();
      }
      
      // Normalize protocol
      parsed.protocol = 'https:';
      
      // Remove www prefix for consistency
      if (parsed.hostname.startsWith('www.')) {
        parsed.hostname = parsed.hostname.substring(4);
      }
      
      // Remove trailing slash
      let normalizedUrl = parsed.toString();
      if (normalizedUrl.endsWith('/') && normalizedUrl !== 'https://' + parsed.hostname + '/') {
        normalizedUrl = normalizedUrl.slice(0, -1);
      }
      
      return normalizedUrl.toLowerCase();
      
    } catch (error) {
      // If URL parsing fails, just clean up the string
      return url.toLowerCase().trim().replace(/\/$/, '');
    }
  }
  
  areUrlsEquivalent(url1: string, url2: string): boolean {
    const normalized1 = this.normalizeUrl(url1);
    const normalized2 = this.normalizeUrl(url2);
    
    if (normalized1 === normalized2) {
      return true;
    }
    
    // Additional similarity checks
    return this.checkSpecialEquivalence(normalized1, normalized2);
  }
  
  private checkSpecialEquivalence(url1: string, url2: string): boolean {
    try {
      const parsed1 = new URL(url1);
      const parsed2 = new URL(url2);
      
      // Same domain check
      if (parsed1.hostname !== parsed2.hostname) {
        return false;
      }
      
      // Amazon product equivalence
      if (parsed1.hostname.includes('amazon')) {
        const asin1 = this.extractAmazonASIN(url1);
        const asin2 = this.extractAmazonASIN(url2);
        return asin1 === asin2 && asin1 !== null;
      }
      
      // Shopify product equivalence
      if (parsed1.hostname.includes('shopify')) {
        const product1 = parsed1.pathname.match(/\/products\/([^\/\?]+)/);
        const product2 = parsed2.pathname.match(/\/products\/([^\/\?]+)/);
        return product1?.[1] === product2?.[1];
      }
      
      return false;
    } catch {
      return false;
    }
  }
  
  private extractAmazonASIN(url: string): string | null {
    const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
    return asinMatch ? asinMatch[1] : null;
  }
  
  private getSourceConfidence(source: string): number {
    return LinkDeduplicator.SOURCE_CONFIDENCE[source] || 70;
  }
  
  private calculateConfidence(dedupedLink: DedupedLink): number {
    // Base confidence from best source
    const sourceConfidences = dedupedLink.sources.map(source => 
      this.getSourceConfidence(source)
    );
    const maxSourceConfidence = Math.max(...sourceConfidences);
    
    // Boost confidence for multiple occurrences
    const occurrenceBoost = Math.min(dedupedLink.occurrences * 5, 20);
    
    // Boost for affiliate links (they're usually intentional)
    const affiliateBoost = dedupedLink.isAffiliate ? 10 : 0;
    
    // Cap at 100
    return Math.min(maxSourceConfidence + occurrenceBoost + affiliateBoost, 100);
  }
  
  // Additional utility method for analysis
  generateDeduplicationReport(originalLinks: ExtractedLink[], dedupedLinks: DedupedLink[]) {
    const totalReduction = originalLinks.length - dedupedLinks.length;
    const reductionPercentage = Math.round((totalReduction / originalLinks.length) * 100);
    
    const platformCounts = new Map<string, number>();
    originalLinks.forEach(link => {
      platformCounts.set(link.source, (platformCounts.get(link.source) || 0) + 1);
    });
    
    const duplicatesFound = dedupedLinks.filter(link => link.occurrences > 1);
    
    return {
      originalCount: originalLinks.length,
      uniqueCount: dedupedLinks.length,
      duplicatesRemoved: totalReduction,
      reductionPercentage,
      platformBreakdown: Object.fromEntries(platformCounts),
      duplicatesFound: duplicatesFound.length,
      averageConfidence: Math.round(
        dedupedLinks.reduce((sum, link) => sum + link.confidence, 0) / dedupedLinks.length
      )
    };
  }
}

// Test if run directly
if (require.main === module) {
  async function test() {
    console.log('🧪 Testing LinkDeduplicator...\n');
    
    const deduplicator = new LinkDeduplicator();
    
    // Mock test data with duplicates
    const testLinks: ExtractedLink[] = [
      // Same Amazon product with different tracking
      {
        title: 'Nike Shoes from Linktree',
        originalUrl: 'https://amazon.com/dp/B123456789?tag=linktree',
        expandedUrl: 'https://amazon.com/dp/B123456789?tag=linktree',
        type: 'amazon' as any,
        source: 'linktree',
        confidence: 85
      },
      {
        title: 'Nike Shoes from YouTube',
        originalUrl: 'https://amazon.com/dp/B123456789?tag=youtube&utm_source=video',
        expandedUrl: 'https://amazon.com/dp/B123456789?tag=youtube&utm_source=video',
        type: 'amazon' as any,
        source: 'post',
        confidence: 95
      },
      // Different products
      {
        title: 'Protein Powder',
        originalUrl: 'https://shopify-store.com/products/protein?ref=tiktok',
        expandedUrl: 'https://shopify-store.com/products/protein?ref=tiktok',
        type: 'shopify' as any,
        source: 'bio',
        confidence: 80
      },
      // Same site, different page
      {
        title: 'Teremana Tequila',
        originalUrl: 'https://teremana.com/',
        expandedUrl: 'https://teremana.com/',
        type: 'brand_direct' as any,
        source: 'linktree',
        confidence: 90
      },
      {
        title: 'Teremana Home',
        originalUrl: 'https://www.teremana.com/?utm_source=bio',
        expandedUrl: 'https://www.teremana.com/?utm_source=bio',
        type: 'brand_direct' as any,
        source: 'bio',
        confidence: 85
      }
    ];
    
    console.log(`📋 Test data: ${testLinks.length} original links`);
    testLinks.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.title} (${link.source})`);
      console.log(`     ${link.originalUrl}`);
    });
    
    // Test deduplication
    const dedupedLinks = deduplicator.deduplicate(testLinks);
    
    console.log(`\n✨ After deduplication: ${dedupedLinks.length} unique links`);
    dedupedLinks.forEach((link, i) => {
      console.log(`\n  ${i + 1}. ${link.title}`);
      console.log(`     Normalized: ${link.url}`);
      console.log(`     Sources: ${link.sources.join(', ')}`);
      console.log(`     Occurrences: ${link.occurrences}`);
      console.log(`     Confidence: ${link.confidence}`);
      console.log(`     Original URLs: ${link.originalUrls.length}`);
    });
    
    // Generate report
    const report = deduplicator.generateDeduplicationReport(testLinks, dedupedLinks);
    
    console.log('\n📊 Deduplication Report:');
    console.log(`   Original links: ${report.originalCount}`);
    console.log(`   Unique links: ${report.uniqueCount}`);
    console.log(`   Duplicates removed: ${report.duplicatesRemoved}`);
    console.log(`   Reduction: ${report.reductionPercentage}%`);
    console.log(`   Average confidence: ${report.averageConfidence}`);
    console.log(`   Links found on multiple platforms: ${report.duplicatesFound}`);
    
    console.log('\n✅ LinkDeduplicator test complete!');
  }
  
  test();
}