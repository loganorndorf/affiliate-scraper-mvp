import axios from 'axios';
import { LinkType } from '../extractors/types';

export interface AffiliateInfo {
  isAffiliate: boolean;
  platform?: string;
  affiliateId?: string;
}

export class LinkExpander {
  private static readonly USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
  private static readonly TIMEOUT = 10000; // 10 second timeout
  
  async expandUrl(shortUrl: string): Promise<string> {
    try {
      console.log(`🔗 Expanding: ${shortUrl}`);
      
      const response = await axios.get(shortUrl, {
        maxRedirects: 5,
        validateStatus: (status) => status < 400,
        timeout: LinkExpander.TIMEOUT,
        headers: {
          'User-Agent': LinkExpander.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive'
        }
      });
      
      // Get the final URL after redirects
      const finalUrl = response.request.res?.responseUrl || response.config.url || shortUrl;
      console.log(`✅ Expanded to: ${finalUrl}`);
      
      return finalUrl;
      
    } catch (error) {
      console.log(`⚠️ Failed to expand ${shortUrl}, using original`);
      return shortUrl;
    }
  }
  
  async expandMultipleUrls(urls: string[]): Promise<Record<string, string>> {
    console.log(`🚀 Expanding ${urls.length} URLs in parallel...`);
    
    const expansionPromises = urls.map(async (url) => {
      const expanded = await this.expandUrl(url);
      return { original: url, expanded };
    });
    
    const results = await Promise.all(expansionPromises);
    
    const mapping: Record<string, string> = {};
    results.forEach(({ original, expanded }) => {
      mapping[original] = expanded;
    });
    
    return mapping;
  }
  
  detectAffiliateParams(url: string): AffiliateInfo {
    const urlLower = url.toLowerCase();
    
    // Amazon affiliate detection
    const amazonTagMatch = url.match(/[?&]tag=([^&]+)/i);
    if (amazonTagMatch) {
      return {
        isAffiliate: true,
        platform: 'amazon',
        affiliateId: amazonTagMatch[1]
      };
    }
    
    // ShareASale detection
    const shareASaleMatch = url.match(/[?&](afftrack|saref)=([^&]+)/i);
    if (shareASaleMatch) {
      return {
        isAffiliate: true,
        platform: 'shareasale',
        affiliateId: shareASaleMatch[2]
      };
    }
    
    // CJ Affiliate detection
    const cjMatch = url.match(/[?&](cjdata|cjevent)=([^&]+)/i);
    if (cjMatch) {
      return {
        isAffiliate: true,
        platform: 'cj_affiliate',
        affiliateId: cjMatch[2]
      };
    }
    
    // Generic affiliate parameters
    const genericParams = ['ref', 'affiliate', 'partner', 'utm_source'];
    for (const param of genericParams) {
      const regex = new RegExp(`[?&]${param}=([^&]+)`, 'i');
      const match = url.match(regex);
      if (match) {
        return {
          isAffiliate: true,
          platform: 'generic',
          affiliateId: match[1]
        };
      }
    }
    
    // Shopify affiliate detection
    if (urlLower.includes('shopify') || urlLower.includes('myshopify')) {
      const shopifyMatch = url.match(/[?&](ref|source)=([^&]+)/i);
      if (shopifyMatch) {
        return {
          isAffiliate: true,
          platform: 'shopify',
          affiliateId: shopifyMatch[2]
        };
      }
    }
    
    // Check for affiliate in path (some sites use /ref/affiliateid)
    const pathAffiliateMatch = url.match(/\/ref\/([^\/\?]+)/i);
    if (pathAffiliateMatch) {
      return {
        isAffiliate: true,
        platform: 'path_based',
        affiliateId: pathAffiliateMatch[1]
      };
    }
    
    return { isAffiliate: false };
  }
  
  classifyLinkType(url: string): LinkType {
    const urlLower = url.toLowerCase();
    
    // Amazon detection
    if (urlLower.includes('amazon.com') || 
        urlLower.includes('amzn.to') || 
        urlLower.includes('amazon.') ||
        urlLower.includes('/dp/') ||
        urlLower.includes('/gp/product/')) {
      return LinkType.AMAZON;
    }
    
    // Shopify detection
    if (urlLower.includes('shopify.com') || 
        urlLower.includes('myshopify.com') ||
        urlLower.includes('.shopify.')) {
      return LinkType.SHOPIFY;
    }
    
    // Affiliate networks
    if (urlLower.includes('linksynergy') || 
        urlLower.includes('shareasale') ||
        urlLower.includes('cj.com') ||
        urlLower.includes('commission-junction') ||
        urlLower.includes('impact.com') ||
        urlLower.includes('partnerize.com')) {
      return LinkType.AFFILIATE_NETWORK;
    }
    
    // Social media
    if (urlLower.includes('instagram.com') ||
        urlLower.includes('twitter.com') ||
        urlLower.includes('tiktok.com') ||
        urlLower.includes('youtube.com') ||
        urlLower.includes('facebook.com')) {
      return LinkType.SOCIAL_MEDIA;
    }
    
    // Direct brand sites
    if (this.isDirectBrandSite(urlLower)) {
      return LinkType.BRAND_DIRECT;
    }
    
    return LinkType.UNKNOWN;
  }
  
  private isDirectBrandSite(url: string): boolean {
    const brandDomains = [
      'nike.com', 'adidas.com', 'underarmour.com', 'puma.com',
      'gymshark.com', 'lululemon.com', 'fabletics.com',
      'projectrock.com', 'projectrock.online',
      'teremana.com', 'zoa.energy',
      'reebok.com', 'newbalance.com', 'asics.com',
      'champion.com', 'hoka.com', 'allbirds.com',
      'patagonia.com', 'thenorthface.com'
    ];
    
    return brandDomains.some(domain => url.includes(domain));
  }
  
  extractProductId(url: string, type: LinkType): string | undefined {
    switch (type) {
      case LinkType.AMAZON:
        // Extract ASIN from Amazon URL
        const asinMatch = url.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/i);
        return asinMatch ? asinMatch[1] : undefined;
        
      case LinkType.SHOPIFY:
        // Extract Shopify product ID
        const shopifyMatch = url.match(/\/products\/([^\/\?]+)/i);
        return shopifyMatch ? shopifyMatch[1] : undefined;
        
      default:
        return undefined;
    }
  }
  
  extractBrandFromUrl(url: string): string | undefined {
    const urlLower = url.toLowerCase();
    
    // Extract domain and check against known brands
    const domainMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);
    if (!domainMatch) return undefined;
    
    const domain = domainMatch[1].toLowerCase();
    
    const brandMap: Record<string, string> = {
      'nike.com': 'Nike',
      'adidas.com': 'Adidas',
      'underarmour.com': 'Under Armour',
      'puma.com': 'Puma',
      'gymshark.com': 'Gymshark',
      'lululemon.com': 'Lululemon',
      'fabletics.com': 'Fabletics',
      'projectrock.com': 'Project Rock',
      'projectrock.online': 'Project Rock',
      'teremana.com': 'Teremana',
      'zoa.energy': 'ZOA Energy',
      'reebok.com': 'Reebok',
      'newbalance.com': 'New Balance',
      'asics.com': 'ASICS',
      'champion.com': 'Champion',
      'hoka.com': 'Hoka'
    };
    
    for (const [domainPattern, brand] of Object.entries(brandMap)) {
      if (domain.includes(domainPattern)) {
        return brand;
      }
    }
    
    // Fallback: try to extract brand from Amazon URLs
    if (urlLower.includes('amazon')) {
      return 'Amazon';
    }
    
    return undefined;
  }
}

// Test if run directly
if (require.main === module) {
  async function test() {
    const expander = new LinkExpander();
    
    const testUrls = [
      'https://amzn.to/3xyz123',  // Amazon short link
      'https://bit.ly/abc456',    // Bitly link  
      'https://projectrock.online/pr6', // Direct link
      'https://zoa.energy/DJ2023' // With affiliate code
    ];
    
    console.log('🧪 Testing URL expansion and affiliate detection...\n');
    
    for (const url of testUrls) {
      try {
        console.log(`Testing: ${url}`);
        
        const expanded = await expander.expandUrl(url);
        const affiliateInfo = expander.detectAffiliateParams(expanded);
        const linkType = expander.classifyLinkType(expanded);
        const productId = expander.extractProductId(expanded, linkType);
        const brand = expander.extractBrandFromUrl(expanded);
        
        console.log(`  Expanded: ${expanded}`);
        console.log(`  Type: ${linkType}`);
        console.log(`  Affiliate: ${affiliateInfo.isAffiliate ? `Yes (${affiliateInfo.platform}: ${affiliateInfo.affiliateId})` : 'No'}`);
        console.log(`  Brand: ${brand || 'Unknown'}`);
        console.log(`  Product ID: ${productId || 'None'}`);
        console.log('');
        
      } catch (error) {
        console.error(`Failed to process ${url}:`, error);
      }
    }
  }
  
  test();
}