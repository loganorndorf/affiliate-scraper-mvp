// Using Node.js built-in fetch for URL expansion

export interface AffiliateInfo {
  type: 'amazon' | 'shopify' | 'ltk' | 'discount_code' | 'link_in_bio' | 'shareasale' | 'clickbank' | 'rakuten' | 'generic_affiliate' | 'brand_partnership';
  url?: string;
  code?: string;
  confidence: number; // 0-1
  source: 'caption' | 'bio' | 'comment';
  brand?: string;
  description?: string;
}

export interface AffiliateDetectionResult {
  totalAffiliates: number;
  typeBreakdown: Record<string, number>;
  averageConfidence: number;
  mostMentionedBrands: Array<{ brand: string; count: number }>;
  affiliates: AffiliateInfo[];
}

export class AffiliateDetector {
  private patterns = {
    // Direct affiliate link patterns
    amazon: {
      regex: /(?:amzn\.to|amazon\.com[\/\w]*[\?\&]tag=|a\.co\/)/gi,
      confidence: 0.95,
      brand: 'Amazon'
    },
    shopify: {
      regex: /[\w-]+\.myshopify\.com|shopify\.com\/partners/gi,
      confidence: 0.9,
      brand: 'Shopify'
    },
    ltk: {
      regex: /(?:liketoknow\.it|ltk\.app|shop\.ltk)/gi,
      confidence: 0.95,
      brand: 'LikeToKnow.it'
    },
    shareasale: {
      regex: /shareasale\.com|sas\.fyi/gi,
      confidence: 0.9,
      brand: 'ShareASale'
    },
    clickbank: {
      regex: /clickbank\.net|cb\.run/gi,
      confidence: 0.9,
      brand: 'ClickBank'
    },
    rakuten: {
      regex: /rakuten\.com|linkshare\.com|shop\.rakuten/gi,
      confidence: 0.9,
      brand: 'Rakuten'
    },
    commission_junction: {
      regex: /cj\.com|commission-junction/gi,
      confidence: 0.9,
      brand: 'Commission Junction'
    },
    
    // URL shorteners that often hide affiliates
    shorteners: {
      regex: /(?:bit\.ly|tinyurl\.com|short\.link|ow\.ly|t\.co|goo\.gl|buff\.ly|rebrand\.ly)\/[\w\-]+/gi,
      confidence: 0.6,
      brand: 'URL Shortener'
    },
    
    // Link-in-bio services
    linktree: {
      regex: /linktr\.ee\/[\w\-\.]+/gi,
      confidence: 0.8,
      brand: 'Linktree'
    },
    beacons: {
      regex: /beacons\.ai\/[\w\-\.]+/gi,
      confidence: 0.8,
      brand: 'Beacons'
    },
    
    // Generic affiliate indicators
    affiliate_params: {
      regex: /[\?\&](?:ref|affiliate|aff|utm_source|partner)=[\w\-]+/gi,
      confidence: 0.7,
      brand: 'Generic'
    }
  };

  private discountCodePatterns = [
    // Standard formats
    /(?:use\s+)?code:?\s*["']?([A-Z0-9]{3,20})["']?/gi,
    /(?:use\s+|with\s+)?(?:promo\s+)?code\s+([A-Z0-9]{3,20})/gi,
    /get\s+\d+%?\s*off\s+with\s+([A-Z0-9]{3,20})/gi,
    /discount\s+code:?\s*([A-Z0-9]{3,20})/gi,
    /save\s+\d+%?\s+with\s+([A-Z0-9]{3,20})/gi,
    
    // Social media specific
    /swipe\s+up.*code\s+([A-Z0-9]{3,20})/gi,
    /link\s+in\s+bio.*code\s+([A-Z0-9]{3,20})/gi,
    
    // Emoji variations
    /💸.*code\s+([A-Z0-9]{3,20})/gi,
    /🛍️.*code\s+([A-Z0-9]{3,20})/gi,
    /🔥.*code\s+([A-Z0-9]{3,20})/gi
  ];

  private linkInBioPatterns = [
    // English variations
    /link\s*in\s*bio/gi,
    /check\s*(?:my\s*)?bio/gi,
    /bio\s*link/gi,
    /shop\s*(?:via\s*)?(?:link\s*)?(?:in\s*)?(?:my\s*)?bio/gi,
    /tap\s*(?:the\s*)?link\s*(?:in\s*)?(?:my\s*)?bio/gi,
    /click\s*(?:the\s*)?link\s*(?:in\s*)?(?:my\s*)?bio/gi,
    
    // Emoji indicators
    /👆.*bio/gi,
    /⬆️.*bio/gi,
    /☝️.*bio/gi,
    /🔗.*bio/gi,
    /💻.*bio/gi,
    
    // Shopping emojis
    /🛍️/g,
    /🛒/g,
    /💳/g,
    /💸/g,
    
    // Arrow emojis pointing up
    /⬆️/g,
    /👆/g,
    /☝️/g,
    
    // Spanish
    /enlace\s*en\s*bio/gi,
    /link\s*en\s*bio/gi,
    
    // Other languages
    /lien\s*dans\s*bio/gi, // French
    /link\s*no\s*perfil/gi // Portuguese
  ];

  async detectInPost(post: { caption: string; url?: string }): Promise<AffiliateInfo[]> {
    const affiliates: AffiliateInfo[] = [];
    const caption = post.caption;
    
    if (!caption) return affiliates;

    // 1. Direct affiliate link detection
    const directLinks = await this.detectDirectLinks(caption);
    affiliates.push(...directLinks);

    // 2. Discount code detection
    const discountCodes = this.detectDiscountCodes(caption);
    affiliates.push(...discountCodes);

    // 3. Link in bio mentions
    const linkInBioMentions = this.detectLinkInBio(caption);
    affiliates.push(...linkInBioMentions);

    // 4. Brand partnership indicators
    const brandPartnerships = this.detectBrandPartnerships(caption);
    affiliates.push(...brandPartnerships);

    return affiliates;
  }

  async detectInProfile(bio: string, bioLink?: string): Promise<AffiliateInfo[]> {
    const affiliates: AffiliateInfo[] = [];

    // Check bio text for patterns
    if (bio) {
      const bioAffiliates = await this.detectDirectLinks(bio);
      bioAffiliates.forEach(aff => {
        aff.source = 'bio';
        affiliates.push(aff);
      });
    }

    // Check bio link
    if (bioLink) {
      const expanded = await this.expandUrl(bioLink);
      const classified = this.classifyUrl(expanded);
      if (classified && classified.type) {
        affiliates.push({
          type: classified.type,
          url: expanded,
          confidence: classified.confidence || 0.5,
          source: 'bio',
          brand: classified.brand,
          description: classified.description
        });
      }
    }

    return affiliates;
  }

  private async detectDirectLinks(text: string): Promise<AffiliateInfo[]> {
    const affiliates: AffiliateInfo[] = [];
    
    // Extract all URLs from text
    const urlRegex = /(https?:\/\/[^\s\)]+)/gi;
    const urls = text.match(urlRegex) || [];
    
    for (const url of urls) {
      try {
        const expandedUrl = await this.expandUrl(url.replace(/[,\.!]+$/, '')); // Clean trailing punctuation
        const classified = this.classifyUrl(expandedUrl);
        
        if (classified && classified.type) {
          affiliates.push({
            type: classified.type,
            url: expandedUrl,
            confidence: classified.confidence || 0.5,
            source: 'caption',
            brand: classified.brand,
            description: classified.description
          });
        }
      } catch (error) {
        // URL expansion failed, still try to classify original
        const classified = this.classifyUrl(url);
        if (classified && classified.type) {
          affiliates.push({
            type: classified.type,
            url,
            confidence: classified.confidence || 0.5,
            source: 'caption',
            brand: classified.brand,
            description: classified.description
          });
        }
      }
    }

    // Check against known patterns even without URLs
    for (const [type, pattern] of Object.entries(this.patterns)) {
      const matches = text.match(pattern.regex);
      if (matches) {
        matches.forEach(match => {
          affiliates.push({
            type: type as any,
            url: match,
            confidence: pattern.confidence,
            source: 'caption',
            brand: pattern.brand
          });
        });
      }
    }

    return affiliates;
  }

  private detectDiscountCodes(text: string): AffiliateInfo[] {
    const affiliates: AffiliateInfo[] = [];
    const foundCodes = new Set<string>(); // Prevent duplicates
    
    for (const pattern of this.discountCodePatterns) {
      const matches = [...text.matchAll(pattern)];
      
      matches.forEach(match => {
        const code = match[1];
        if (code && this.isValidDiscountCode(code) && !foundCodes.has(code.toUpperCase())) {
          foundCodes.add(code.toUpperCase());
          affiliates.push({
            type: 'discount_code',
            code: code.toUpperCase(),
            confidence: this.calculateCodeConfidence(code, text),
            source: 'caption',
            description: `Discount code: ${code}`
          });
        }
      });
    }

    return affiliates;
  }

  private detectLinkInBio(text: string): AffiliateInfo[] {
    const affiliates: AffiliateInfo[] = [];
    
    for (const pattern of this.linkInBioPatterns) {
      if (pattern.test(text)) {
        affiliates.push({
          type: 'link_in_bio',
          confidence: this.calculateLinkInBioConfidence(text),
          source: 'caption',
          description: 'Link in bio mention detected'
        });
        break; // Only add one link-in-bio mention per post
      }
    }

    return affiliates;
  }

  private detectBrandPartnerships(text: string): AffiliateInfo[] {
    const affiliates: AffiliateInfo[] = [];
    
    // Brand partnership indicators
    const partnershipPatterns = [
      /#(?:ad|sponsored|partnership|collab|gifted)/gi,
      /in\s+partnership\s+with/gi,
      /sponsored\s+by/gi,
      /thanks\s+to\s+@[\w\.]+/gi,
      /@[\w\.]+\s+for\s+(?:gifting|sending)/gi,
      // Subtle brand mentions
      /(?:our|my|the)\s+@[\w\.]+/gi,
      /check\s+out\s+@[\w\.]+/gi,
      /love\s+(?:my|our|the)?\s*@[\w\.]+/gi,
      /wearing\s+@[\w\.]+/gi,
      /using\s+@[\w\.]+/gi
    ];

    for (const pattern of partnershipPatterns) {
      const matches = [...text.matchAll(pattern)];
      
      matches.forEach(match => {
        // Extract all brand mentions from the text
        const brandMentions = [...text.matchAll(/@([\w\.]+)/gi)];
        
        brandMentions.forEach(brandMatch => {
          const brand = brandMatch[1];
          
          // Skip common accounts that aren't brands
          const skipAccounts = ['instagram', 'facebook', 'twitter', 'tiktok', 'youtube'];
          if (!skipAccounts.includes(brand.toLowerCase())) {
            affiliates.push({
              type: 'brand_partnership',
              confidence: this.calculateBrandPartnershipConfidence(text, brand),
              source: 'caption',
              brand,
              description: `Brand mention: @${brand}`
            });
          }
        });
      });
      
      if (matches.length > 0) break; // Only process once per post
    }

    return affiliates;
  }

  private calculateBrandPartnershipConfidence(text: string, brand: string): number {
    let confidence = 0.3; // Base confidence for brand mention
    
    // Higher confidence indicators
    if (/#(?:ad|sponsored|partnership)/gi.test(text)) confidence = 0.9;
    if (/gifted|sent|thanks/gi.test(text)) confidence += 0.3;
    if (/our\s+@|my\s+@/gi.test(text)) confidence += 0.2;
    if (/love|amazing|excited/gi.test(text)) confidence += 0.1;
    if (/check\s+out|shop/gi.test(text)) confidence += 0.2;
    
    return Math.min(confidence, 1.0);
  }

  private classifyUrl(url: string): Partial<AffiliateInfo> | null {
    const lowerUrl = url.toLowerCase();
    
    // Amazon detection
    if (/amzn\.to|amazon\.com.*[?&]tag=|a\.co\//.test(lowerUrl)) {
      const tagMatch = url.match(/[?&]tag=([^&]+)/);
      return {
        type: 'amazon',
        confidence: 0.95,
        brand: 'Amazon',
        description: `Amazon affiliate link${tagMatch ? ` (tag: ${tagMatch[1]})` : ''}`
      };
    }

    // Shopify detection
    if (/\.myshopify\.com/.test(lowerUrl)) {
      const shopMatch = url.match(/https?:\/\/([\w-]+)\.myshopify\.com/);
      return {
        type: 'shopify',
        confidence: 0.9,
        brand: shopMatch ? shopMatch[1] : 'Shopify Store',
        description: 'Shopify store link'
      };
    }

    // LTK detection
    if (/liketoknow\.it|ltk\.app|shop\.ltk/.test(lowerUrl)) {
      return {
        type: 'ltk',
        confidence: 0.95,
        brand: 'LikeToKnow.it',
        description: 'LTK affiliate link'
      };
    }

    // Affiliate network detection
    if (/shareasale\.com|sas\.fyi/.test(lowerUrl)) {
      return {
        type: 'shareasale',
        confidence: 0.9,
        brand: 'ShareASale',
        description: 'ShareASale affiliate network'
      };
    }

    if (/clickbank\.net|cb\.run/.test(lowerUrl)) {
      return {
        type: 'clickbank',
        confidence: 0.9,
        brand: 'ClickBank',
        description: 'ClickBank affiliate link'
      };
    }

    if (/rakuten\.com|linkshare\.com|shop\.rakuten/.test(lowerUrl)) {
      return {
        type: 'rakuten',
        confidence: 0.9,
        brand: 'Rakuten',
        description: 'Rakuten affiliate network'
      };
    }

    // Generic affiliate indicators
    if (/[?&](?:ref|affiliate|aff|utm_source|partner|referral)=/.test(lowerUrl)) {
      return {
        type: 'generic_affiliate',
        confidence: 0.7,
        description: 'Generic affiliate parameters detected'
      };
    }

    return null;
  }

  private async expandUrl(url: string): Promise<string> {
    // Don't expand already long URLs
    if (url.length > 50 && !this.isKnownShortener(url)) {
      return url;
    }

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.6.1 Mobile/15E148 Safari/604.1'
        }
      });

      // Follow redirects manually to get final URL
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        if (location) {
          // Recursively expand if it's another shortener
          return this.isKnownShortener(location) ? 
            await this.expandUrl(location) : 
            location;
        }
      }

      return url;
    } catch (error) {
      // If expansion fails, return original URL
      console.log(`⚠️ Failed to expand URL ${url}: ${error instanceof Error ? error.message : String(error)}`);
      return url;
    }
  }

  private isKnownShortener(url: string): boolean {
    const shorteners = [
      'bit.ly', 'tinyurl.com', 'short.link', 'ow.ly', 't.co', 
      'goo.gl', 'buff.ly', 'rebrand.ly', 'cutt.ly', 'is.gd',
      'linktr.ee', 'beacons.ai', 'tap.link', 'lnk.bio'
    ];
    
    return shorteners.some(shortener => url.includes(shortener));
  }

  private isValidDiscountCode(code: string): boolean {
    // Filter out common false positives
    const falsePositives = ['THE', 'AND', 'FOR', 'YOU', 'GET', 'NOW', 'ALL', 'NEW', 'OFF'];
    
    return (
      code.length >= 3 && 
      code.length <= 20 && 
      !falsePositives.includes(code.toUpperCase()) &&
      /^[A-Z0-9]+$/.test(code) // Only alphanumeric
    );
  }

  private calculateCodeConfidence(code: string, text: string): number {
    let confidence = 0.6; // Base confidence
    
    // Higher confidence indicators
    if (/\d+%\s*off/.test(text)) confidence += 0.2;
    if (/save|discount|promo/gi.test(text)) confidence += 0.1;
    if (code.includes('SAVE') || code.includes('OFF')) confidence += 0.1;
    if (/\d+/.test(code)) confidence += 0.1; // Codes with numbers are more likely
    
    return Math.min(confidence, 1.0);
  }

  private calculateLinkInBioConfidence(text: string): number {
    let confidence = 0.7; // Base confidence
    
    // Higher confidence indicators
    if (/shop|buy|purchase/gi.test(text)) confidence += 0.1;
    if (/🛍️|🛒|💳|💸/.test(text)) confidence += 0.1;
    if (/swipe\s*up/gi.test(text)) confidence += 0.1;
    if (/👆|⬆️|☝️/.test(text)) confidence += 0.1;
    
    return Math.min(confidence, 1.0);
  }

  async analyzeProfile(posts: Array<{ caption: string; url?: string }>, bio?: string, bioLink?: string): Promise<AffiliateDetectionResult> {
    const allAffiliates: AffiliateInfo[] = [];
    
    // Analyze bio if provided
    if (bio || bioLink) {
      const bioAffiliates = await this.detectInProfile(bio || '', bioLink);
      allAffiliates.push(...bioAffiliates);
    }
    
    // Analyze all posts
    for (const post of posts) {
      const postAffiliates = await this.detectInPost(post);
      allAffiliates.push(...postAffiliates);
    }

    // Generate summary statistics
    return this.generateSummary(allAffiliates);
  }

  private generateSummary(affiliates: AffiliateInfo[]): AffiliateDetectionResult {
    const typeBreakdown: Record<string, number> = {};
    const brandCounts: Record<string, number> = {};
    
    affiliates.forEach(affiliate => {
      // Count by type
      typeBreakdown[affiliate.type] = (typeBreakdown[affiliate.type] || 0) + 1;
      
      // Count by brand
      if (affiliate.brand) {
        brandCounts[affiliate.brand] = (brandCounts[affiliate.brand] || 0) + 1;
      }
    });

    const mostMentionedBrands = Object.entries(brandCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([brand, count]) => ({ brand, count }));

    const averageConfidence = affiliates.length > 0 
      ? affiliates.reduce((sum, aff) => sum + aff.confidence, 0) / affiliates.length 
      : 0;

    return {
      totalAffiliates: affiliates.length,
      typeBreakdown,
      averageConfidence,
      mostMentionedBrands,
      affiliates
    };
  }
}

// Test function
async function testAffiliateDetector() {
  const detector = new AffiliateDetector();
  
  const testCaptions = [
    "Get 20% off with code SAVE20! Check my bio for the link 🛍️",
    "Loving this new skincare routine! Use code GLOWING for 15% off at checkout. Link in bio! ✨",
    "Just found this amazing dress on Amazon! https://amzn.to/3xyz123 #affiliate",
    "Swipe up to shop or check the link in my bio 👆 Use EXCLUSIVE for 25% off!",
    "Partnership with @shopifystore - love their new collection! Shop via link in bio 💸",
    "New YouTube video is live! Link in bio to watch 🔗 Also don't forget to use YOUTUBE20 for discount!",
    "#ad Excited to partner with @brandname for this amazing product! Get yours with code INSTAGRAM15"
  ];

  console.log('🧪 Testing Affiliate Detector\n');

  for (let i = 0; i < testCaptions.length; i++) {
    const caption = testCaptions[i];
    console.log(`Test ${i + 1}: "${caption.substring(0, 60)}..."`);
    
    const affiliates = await detector.detectInPost({ caption });
    
    if (affiliates.length > 0) {
      console.log(`  ✅ Found ${affiliates.length} affiliate(s):`);
      affiliates.forEach(aff => {
        console.log(`    - ${aff.type} (${(aff.confidence * 100).toFixed(0)}% confidence)`);
        if (aff.code) console.log(`      Code: ${aff.code}`);
        if (aff.brand) console.log(`      Brand: ${aff.brand}`);
        if (aff.url) console.log(`      URL: ${aff.url.substring(0, 50)}...`);
      });
    } else {
      console.log(`  ❌ No affiliates detected`);
    }
    console.log('');
  }

  // Test profile analysis
  console.log('🧪 Testing Profile Analysis\n');
  const testProfile = {
    bio: "Fashion & lifestyle blogger. Use code BLOG15 for 15% off my favorites!",
    bioLink: "https://linktr.ee/fashionblogger",
    posts: testCaptions.map(caption => ({ caption }))
  };

  const analysis = await detector.analyzeProfile(testProfile.posts, testProfile.bio, testProfile.bioLink);
  
  console.log('📊 Profile Analysis Results:');
  console.log(`  Total Affiliates: ${analysis.totalAffiliates}`);
  console.log(`  Average Confidence: ${(analysis.averageConfidence * 100).toFixed(1)}%`);
  console.log(`  Type Breakdown:`, analysis.typeBreakdown);
  console.log(`  Top Brands:`, analysis.mostMentionedBrands);
}

// Export test function
export { testAffiliateDetector };

// Run test if executed directly
if (require.main === module) {
  testAffiliateDetector().catch(console.error);
}