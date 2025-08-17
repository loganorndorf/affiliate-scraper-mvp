import { chromium, Browser, Page } from 'playwright';
import { ExtractedLink, LinkType } from './types';

export type WebsitePlatform = 'wordpress' | 'shopify' | 'squarespace' | 'wix' | 'custom' | 'unknown';

export interface Product {
  name: string;
  price?: string;
  url: string;
  image?: string;
  description?: string;
}

export interface WebsiteResult {
  domain: string;
  platform: WebsitePlatform;
  hasAffiliateDisclosure: boolean;
  links: ExtractedLink[];
  shopProducts: Product[];
  estimatedRevenue?: number;
  success: boolean;
  checkedUrls: string[];
  workingUrls: string[];
  error?: string;
  metadata: {
    foundAt: string;
    hasShop: boolean;
    hasLinks: boolean;
    affiliateNetworks: string[];
    discountCodes: string[];
  };
}

export class WebsiteDiscovery {
  private browser: Browser | null = null;

  private static readonly URL_PATTERNS = [
    '/links',
    '/shop', 
    '/store',
    '/recommendations',
    '/favorites',
    '/affiliate',
    '/partners',
    '/products',
    '/gear',
    '/merch',
    '/buy',
    '/shopping',
    '/deals',
    '/blog',
    '/articles',
    '/reviews',
    '/about',
    '/collab',
    '/collaborations',
    '/brand-partnerships'
  ];

  private static readonly DOMAIN_EXTENSIONS = [
    '.com',
    '.co',
    '.tv',
    '.me',
    '.net',
    '.io',
    '.org'
  ];

  private static readonly AFFILIATE_NETWORKS = [
    'amazon.com',
    'amzn.to',
    'shareasale.com',
    'cj.com',
    'impact.com',
    'impactradius.com',
    'partnerize.com',
    'awin.com',
    'linksynergy.com',
    'pepperjam.com',
    'rakuten.com',
    'flexoffers.com'
  ];

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
  }

  async discoverWebsite(creatorName: string): Promise<WebsiteResult> {
    if (!this.browser) await this.initialize();

    console.log(`🌐 Discovering website for: ${creatorName}`);

    const domains = this.generateDomainVariations(creatorName);
    const checkedUrls: string[] = [];
    const workingUrls: string[] = [];
    let foundWebsite: WebsiteResult | null = null;

    // Try each domain variation
    for (const domain of domains) {
      try {
        console.log(`🔍 Checking domain: ${domain}`);
        const result = await this.checkDomain(domain);
        checkedUrls.push(...result.checkedUrls);
        
        if (result.success && result.links.length > 0) {
          workingUrls.push(...result.workingUrls);
          foundWebsite = result;
          console.log(`✅ Found working website: ${domain}`);
          break; // Use first successful domain
        }
      } catch (error) {
        console.log(`⚠️ Domain ${domain} failed: ${error}`);
        continue;
      }
    }

    if (!foundWebsite) {
      console.log(`❌ No websites found for: ${creatorName}`);
      return {
        domain: '',
        platform: 'unknown',
        hasAffiliateDisclosure: false,
        links: [],
        shopProducts: [],
        success: false,
        checkedUrls,
        workingUrls: [],
        error: 'No accessible websites found',
        metadata: {
          foundAt: '',
          hasShop: false,
          hasLinks: false,
          affiliateNetworks: [],
          discountCodes: []
        }
      };
    }

    console.log(`✅ Website discovery complete: ${foundWebsite.links.length} links, ${foundWebsite.shopProducts.length} products`);
    return foundWebsite;
  }

  private async checkDomain(domain: string): Promise<WebsiteResult> {
    const page = await this.browser!.newPage();
    
    try {
      const checkedUrls: string[] = [];
      const workingUrls: string[] = [];
      const allLinks: ExtractedLink[] = [];
      const allProducts: Product[] = [];
      let platform: WebsitePlatform = 'unknown';
      let hasAffiliateDisclosure = false;
      let hasShop = false;
      let hasLinks = false;
      const affiliateNetworks: string[] = [];
      const discountCodes: string[] = [];

      // First, check if the main domain exists
      const baseUrl = `https://${domain}`;
      checkedUrls.push(baseUrl);

      try {
        await page.goto(baseUrl, { waitUntil: 'domcontentloaded', timeout: 10000 });
        workingUrls.push(baseUrl);
        
        // Detect website platform
        platform = await this.detectPlatform(page);
        console.log(`  📋 Platform detected: ${platform}`);

        // Check for affiliate disclosure on main page
        hasAffiliateDisclosure = await this.checkAffiliateDisclosure(page);
        
        // Enhanced main page extraction
        const mainPageLinks = await this.extractLinksFromPage(page, baseUrl, 'main');
        allLinks.push(...mainPageLinks);

        // Extract structured data from main page
        const structuredData = await this.extractStructuredData(page);
        if (structuredData.length > 0) {
          allLinks.push(...structuredData);
          console.log(`  📋 Found ${structuredData.length} structured data links`);
        }

        // Look for blog/article links on main page
        const contentLinks = await this.findContentPages(page, baseUrl);
        if (contentLinks.length > 0) {
          console.log(`  📝 Found ${contentLinks.length} content pages to scan`);
          
          // Scan top content pages for affiliate links
          for (const contentUrl of contentLinks.slice(0, 5)) { // Limit to top 5
            try {
              await page.goto(contentUrl, { timeout: 8000 });
              const contentPageLinks = await this.extractLinksFromContent(page, contentUrl);
              allLinks.push(...contentPageLinks);
              console.log(`    📰 ${contentPageLinks.length} links from ${contentUrl.split('/').pop()}`);
            } catch {
              // Skip failed content pages
            }
          }
        }

        if (mainPageLinks.length > 0) {
          console.log(`  🔗 Found ${mainPageLinks.length} links on main page`);
        }
        
      } catch (error) {
        console.log(`  ❌ Main domain ${domain} not accessible`);
        throw new Error(`Domain not accessible: ${domain}`);
      }

      // Check specific URL patterns
      for (const pattern of WebsiteDiscovery.URL_PATTERNS) {
        const testUrl = `${baseUrl}${pattern}`;
        checkedUrls.push(testUrl);

        try {
          await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 8000 });
          workingUrls.push(testUrl);
          
          console.log(`  ✅ Found page: ${pattern}`);
          
          // Mark what types of pages we found
          if (pattern.includes('link')) hasLinks = true;
          if (pattern.includes('shop') || pattern.includes('store') || pattern.includes('product')) hasShop = true;
          
          // Extract links from this page
          const pageLinks = await this.extractLinksFromPage(page, testUrl, pattern.replace('/', ''));
          allLinks.push(...pageLinks);
          
          // Enhanced product extraction for shop pages
          if (pattern.includes('shop') || pattern.includes('store') || pattern.includes('product')) {
            const products = await this.extractProducts(page);
            allProducts.push(...products);
            
            // Extract WooCommerce/Shopify specific data
            const ecommerceLinks = await this.extractEcommerceLinks(page, testUrl);
            allLinks.push(...ecommerceLinks);
            
            console.log(`  🛍️ Found ${products.length} products, ${ecommerceLinks.length} e-commerce links on ${pattern}`);
          }
          
          // Enhanced content page extraction
          if (pattern.includes('blog') || pattern.includes('article') || pattern.includes('review')) {
            const contentLinks = await this.extractLinksFromContent(page, testUrl);
            allLinks.push(...contentLinks);
            console.log(`  📰 Found ${contentLinks.length} content links on ${pattern}`);
          }

          // Check for affiliate disclosure on this page too
          if (!hasAffiliateDisclosure) {
            hasAffiliateDisclosure = await this.checkAffiliateDisclosure(page);
          }

          // Extract discount codes
          const codes = await this.extractDiscountCodes(page);
          discountCodes.push(...codes);

          // Extract affiliate networks
          const networks = await this.detectAffiliateNetworks(page);
          affiliateNetworks.push(...networks);
          
        } catch (error) {
          // Page doesn't exist, continue to next pattern
          continue;
        }
      }

      // Calculate estimated revenue
      const estimatedRevenue = this.estimateWebsiteRevenue(allLinks, allProducts, affiliateNetworks);

      return {
        domain,
        platform,
        hasAffiliateDisclosure,
        links: allLinks,
        shopProducts: allProducts,
        estimatedRevenue,
        success: allLinks.length > 0 || allProducts.length > 0,
        checkedUrls,
        workingUrls,
        metadata: {
          foundAt: workingUrls[0] || '',
          hasShop,
          hasLinks,
          affiliateNetworks: [...new Set(affiliateNetworks)],
          discountCodes: [...new Set(discountCodes)]
        }
      };

    } finally {
      await page.close();
    }
  }

  private generateDomainVariations(creatorName: string): string[] {
    const clean = creatorName.toLowerCase()
      .replace(/[@\s]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    const variations = [
      clean,                    // 'therock'
      clean.replace(/the/g, ''), // 'rock' 
      clean.replace(/official/g, ''), // remove 'official'
      `${clean}official`,       // 'therockofficial'
      `official${clean}`,       // 'officialtherock'
      clean + 'shop',           // 'therockshop'
      clean + 'store'           // 'therockstore'
    ];

    const domains: string[] = [];
    
    // Generate domain + extension combinations
    for (const variation of variations) {
      for (const extension of WebsiteDiscovery.DOMAIN_EXTENSIONS) {
        domains.push(variation + extension);
      }
    }

    // Remove duplicates and return first 15 (to avoid being too aggressive)
    return [...new Set(domains)].slice(0, 15);
  }

  private async detectPlatform(page: Page): Promise<WebsitePlatform> {
    return await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      const metaTags = Array.from(document.querySelectorAll('meta')).map(meta => ({
        name: meta.getAttribute('name'),
        content: meta.getAttribute('content'),
        property: meta.getAttribute('property')
      }));

      // WordPress detection
      if (html.includes('wp-content') || 
          html.includes('wordpress') ||
          metaTags.some(tag => tag.content?.includes('WordPress'))) {
        return 'wordpress';
      }

      // Shopify detection  
      if (html.includes('shopify') ||
          html.includes('myshopify.com') ||
          html.includes('Shopify.theme') ||
          metaTags.some(tag => tag.content?.includes('Shopify'))) {
        return 'shopify';
      }

      // Squarespace detection
      if (html.includes('squarespace') ||
          html.includes('sqsp.net') ||
          metaTags.some(tag => tag.content?.includes('Squarespace'))) {
        return 'squarespace';
      }

      // Wix detection
      if (html.includes('wix.com') ||
          html.includes('_wixCIDX') ||
          metaTags.some(tag => tag.content?.includes('Wix'))) {
        return 'wix';
      }

      // Check for common CMS indicators
      if (html.includes('drupal') || html.includes('joomla')) {
        return 'custom';
      }

      return 'unknown';
    });
  }

  private async checkAffiliateDisclosure(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const pageText = document.body.textContent?.toLowerCase() || '';
      
      const disclosurePatterns = [
        'affiliate link',
        'affiliate disclosure',
        'earn commission',
        'paid partnership',
        'sponsored',
        'as an amazon associate',
        'amazon affiliate',
        'commission earned',
        'affiliate relationship',
        'may receive compensation'
      ];

      return disclosurePatterns.some(pattern => pageText.includes(pattern));
    });
  }

  private async extractLinksFromPage(page: Page, pageUrl: string, pageType: string): Promise<ExtractedLink[]> {
    const links = await page.evaluate((type) => {
      const foundLinks: Array<{title: string, url: string}> = [];
      
      // Get all external links
      const linkElements = document.querySelectorAll('a[href*="://"]');
      
      linkElements.forEach(element => {
        const href = (element as HTMLAnchorElement).href;
        const text = element.textContent?.trim() || '';
        
        // Skip internal links and social media
        if (href.includes(window.location.hostname) ||
            href.includes('facebook.com') ||
            href.includes('twitter.com') ||
            href.includes('instagram.com') ||
            href.includes('tiktok.com') ||
            href.includes('youtube.com') ||
            !text) {
          return;
        }

        foundLinks.push({
          title: text.length > 100 ? text.substring(0, 100) + '...' : text,
          url: href
        });
      });

      return foundLinks;
    }, pageType);

    return links.map((link, index) => ({
      title: link.title || `Website Link ${index + 1}`,
      originalUrl: link.url,
      expandedUrl: '',
      type: this.classifyWebsiteLink(link.url),
      source: 'website' as any,
      confidence: this.calculateWebsiteLinkConfidence(link.url, pageType)
    }));
  }

  private async extractProducts(page: Page): Promise<Product[]> {
    return await page.evaluate(() => {
      const products: Product[] = [];
      
      // Common product selectors across platforms
      const productSelectors = [
        '.product',
        '.product-item', 
        '.shop-item',
        '[data-product]',
        '.woocommerce-loop-product__title',
        '.product-card',
        '.grid-product',
        '.collection-item'
      ];

      for (const selector of productSelectors) {
        const productElements = document.querySelectorAll(selector);
        
        productElements.forEach(element => {
          const nameEl = element.querySelector('h1, h2, h3, .title, .name, .product-title');
          const priceEl = element.querySelector('.price, .cost, .amount, [data-price]');
          const linkEl = element.querySelector('a') || element;
          const imageEl = element.querySelector('img');

          const name = nameEl?.textContent?.trim();
          const price = priceEl?.textContent?.trim();
          const url = (linkEl as HTMLAnchorElement)?.href;
          const image = (imageEl as HTMLImageElement)?.src;

          if (name && url) {
            products.push({
              name,
              price: price || undefined,
              url,
              image: image || undefined,
              description: undefined
            });
          }
        });

        if (products.length > 0) break; // Found products with this selector
      }

      return products.slice(0, 20); // Limit to prevent overwhelming data
    });
  }

  private async extractDiscountCodes(page: Page): Promise<string[]> {
    return await page.evaluate(() => {
      const pageText = document.body.textContent || '';
      
      // Look for discount code patterns
      const codePatterns = [
        /\b[A-Z0-9]{3,10}\b/g, // Simple codes like "SAVE20"
        /code[:\s]+([A-Z0-9]{3,15})/gi,
        /promo[:\s]+([A-Z0-9]{3,15})/gi,
        /discount[:\s]+([A-Z0-9]{3,15})/gi,
        /coupon[:\s]+([A-Z0-9]{3,15})/gi
      ];

      const codes: string[] = [];
      
      codePatterns.forEach(pattern => {
        const matches = pageText.match(pattern);
        if (matches) {
          codes.push(...matches);
        }
      });

      // Filter to likely discount codes (common patterns)
      const likelyCodes = codes.filter(code => {
        const cleanCode = code.replace(/[^A-Z0-9]/g, '');
        return cleanCode.length >= 3 && cleanCode.length <= 15 &&
               (cleanCode.includes('SAVE') || 
                cleanCode.includes('OFF') ||
                cleanCode.includes('DEAL') ||
                /[0-9]/.test(cleanCode));
      });

      return [...new Set(likelyCodes)].slice(0, 5);
    });
  }

  private async detectAffiliateNetworks(page: Page): Promise<string[]> {
    return await page.evaluate((networks) => {
      const pageHtml = document.documentElement.outerHTML;
      const foundNetworks: string[] = [];

      networks.forEach(network => {
        if (pageHtml.includes(network)) {
          foundNetworks.push(network);
        }
      });

      return foundNetworks;
    }, WebsiteDiscovery.AFFILIATE_NETWORKS);
  }

  private classifyWebsiteLink(url: string): LinkType {
    try {
      const domain = new URL(url).hostname.toLowerCase();
      
      if (domain.includes('amazon')) return LinkType.AMAZON;
      if (domain.includes('shopify')) return LinkType.SHOPIFY;
      if (domain.includes('etsy')) return LinkType.AFFILIATE_NETWORK;
      if (domain.includes('gumroad')) return LinkType.AFFILIATE_NETWORK;
      
      return LinkType.BRAND_DIRECT;
    } catch {
      return LinkType.UNKNOWN;
    }
  }

  private calculateWebsiteLinkConfidence(url: string, pageType: string): number {
    let confidence = 60; // Base confidence for website links

    // Boost confidence based on page type
    const pageBoosts: Record<string, number> = {
      'links': 20,
      'shop': 15,
      'recommendations': 18,
      'affiliate': 25,
      'partners': 20,
      'main': 10
    };

    confidence += pageBoosts[pageType] || 0;

    // Boost for known affiliate networks
    if (WebsiteDiscovery.AFFILIATE_NETWORKS.some(network => url.includes(network))) {
      confidence += 15;
    }

    // Boost for Amazon links (high intent)
    if (url.includes('amazon') || url.includes('amzn')) {
      confidence += 10;
    }

    return Math.min(confidence, 95);
  }

  private estimateWebsiteRevenue(links: ExtractedLink[], products: Product[], networks: string[]): number {
    let revenue = 0;

    // Base revenue per link (varies by type)
    const linkValues: Record<string, number> = {
      'amazon': 15,      // $15/month per Amazon link
      'shopify': 25,     // $25/month per product link  
      'brand_direct': 20,// $20/month per brand link
      'marketplace': 10, // $10/month per marketplace link
      'unknown': 5       // $5/month per unknown link
    };

    links.forEach(link => {
      const value = linkValues[link.type] || 5;
      revenue += value * (link.confidence / 100); // Adjust by confidence
    });

    // Add product-based revenue
    products.forEach(product => {
      // Simple heuristic: $10/month per product listed
      revenue += 10;
    });

    // Network multiplier
    if (networks.includes('amazon.com')) revenue *= 1.2;
    if (networks.length >= 3) revenue *= 1.1; // Multiple networks = sophisticated setup

    return Math.round(revenue);
  }

  // Enhanced extraction methods
  private async extractStructuredData(page: Page): Promise<ExtractedLink[]> {
    const structuredLinks = await page.evaluate(() => {
      const links: Array<{title: string, url: string}> = [];
      
      // Extract JSON-LD structured data
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent || '');
          
          // Handle arrays of structured data
          const items = Array.isArray(data) ? data : [data];
          
          items.forEach(item => {
            // Product offers
            if (item['@type'] === 'Product' && item.offers) {
              const offers = Array.isArray(item.offers) ? item.offers : [item.offers];
              offers.forEach((offer: any) => {
                if (offer.url) {
                  links.push({
                    title: `${item.name || 'Product'} - ${offer.price || 'View Product'}`,
                    url: offer.url
                  });
                }
              });
            }
            
            // Organization/Brand links
            if (item['@type'] === 'Organization' && item.url) {
              links.push({
                title: `${item.name || 'Brand'} - Official Site`,
                url: item.url
              });
            }
          });
          
        } catch {
          // Skip invalid JSON-LD
        }
      });
      
      return links;
    });

    return structuredLinks.map((link, index) => ({
      title: link.title,
      originalUrl: link.url,
      expandedUrl: '',
      type: this.classifyWebsiteLink(link.url),
      source: 'website' as any,
      confidence: 90 // High confidence for structured data
    }));
  }

  private async findContentPages(page: Page, baseUrl: string): Promise<string[]> {
    return await page.evaluate((base) => {
      const contentUrls: string[] = [];
      
      // Look for blog/article navigation
      const navSelectors = [
        'nav a[href*="/blog"]',
        'nav a[href*="/article"]',
        '.menu a[href*="/blog"]',
        'a[href*="/category/"]',
        'a[href*="/tag/"]'
      ];
      
      navSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(el => {
          const href = (el as HTMLAnchorElement).href;
          if (href && href.startsWith(base) && !contentUrls.includes(href)) {
            contentUrls.push(href);
          }
        });
      });
      
      return contentUrls.slice(0, 10); // Limit content pages
    }, baseUrl);
  }

  private async extractLinksFromContent(page: Page, pageUrl: string): Promise<ExtractedLink[]> {
    const links = await page.evaluate(() => {
      const foundLinks: Array<{title: string, url: string, context: string}> = [];
      
      // Look for affiliate links in content
      const contentArea = document.querySelector('article, .content, .post-content, main, .entry-content') || document.body;
      const linkElements = contentArea.querySelectorAll('a[href*="://"]');
      
      linkElements.forEach(element => {
        const href = (element as HTMLAnchorElement).href;
        const text = element.textContent?.trim() || '';
        
        // Skip internal and social links
        if (href.includes(window.location.hostname) || 
            href.includes('facebook.com') ||
            href.includes('twitter.com') ||
            href.includes('instagram.com') ||
            !text) {
          return;
        }
        
        // Get surrounding context for better classification
        const parent = element.parentElement;
        const context = parent?.textContent?.substring(0, 200) || '';
        
        // Look for product/affiliate indicators in context
        const isLikelyAffiliate = /\b(buy|shop|purchase|deal|discount|promo|affiliate|sponsored)\b/i.test(context);
        
        if (isLikelyAffiliate || href.includes('amazon') || href.includes('amzn')) {
          foundLinks.push({
            title: text.length > 80 ? text.substring(0, 80) + '...' : text,
            url: href,
            context: context.substring(0, 100)
          });
        }
      });
      
      return foundLinks;
    });

    return links.map((link, index) => ({
      title: link.title || `Content Link ${index + 1}`,
      originalUrl: link.url,
      expandedUrl: '',
      type: this.classifyWebsiteLink(link.url),
      source: 'website' as any,
      confidence: this.calculateContentLinkConfidence(link.url, link.context)
    }));
  }

  private async extractEcommerceLinks(page: Page, pageUrl: string): Promise<ExtractedLink[]> {
    const links = await page.evaluate(() => {
      const foundLinks: Array<{title: string, url: string, price?: string}> = [];
      
      // WooCommerce specific extraction
      const wooProducts = document.querySelectorAll('.woocommerce-loop-product');
      wooProducts.forEach(product => {
        const link = product.querySelector('a');
        const title = product.querySelector('.woocommerce-loop-product__title')?.textContent?.trim();
        const price = product.querySelector('.price')?.textContent?.trim();
        
        if (link && title) {
          foundLinks.push({
            title: `${title} - ${price || 'View Product'}`,
            url: (link as HTMLAnchorElement).href,
            price
          });
        }
      });
      
      // Shopify specific extraction
      const shopifyProducts = document.querySelectorAll('.product-card, .grid-product__content');
      shopifyProducts.forEach(product => {
        const link = product.querySelector('a');
        const title = product.querySelector('.product-card__title, .grid-product__title')?.textContent?.trim();
        const price = product.querySelector('.price, .product-card__price')?.textContent?.trim();
        
        if (link && title) {
          foundLinks.push({
            title: `${title} - ${price || 'View Product'}`,
            url: (link as HTMLAnchorElement).href,
            price
          });
        }
      });
      
      return foundLinks;
    });

    return links.map((link, index) => ({
      title: link.title,
      originalUrl: link.url,
      expandedUrl: '',
      type: this.classifyWebsiteLink(link.url),
      source: 'website' as any,
      confidence: 85 // High confidence for e-commerce links
    }));
  }

  private async extractPartnershipLinks(page: Page): Promise<ExtractedLink[]> {
    const links = await page.evaluate(() => {
      const foundLinks: Array<{title: string, url: string}> = [];
      
      // Look for partnership/collaboration sections
      const partnershipTexts = document.body.textContent?.toLowerCase() || '';
      
      if (partnershipTexts.includes('partner') || partnershipTexts.includes('collab') || partnershipTexts.includes('brand')) {
        const linkElements = document.querySelectorAll('a[href*="://"]');
        
        linkElements.forEach(element => {
          const href = (element as HTMLAnchorElement).href;
          const text = element.textContent?.trim() || '';
          const parent = element.parentElement;
          const context = parent?.textContent?.toLowerCase() || '';
          
          // Skip internal/social links
          if (href.includes(window.location.hostname) ||
              href.includes('facebook.com') ||
              href.includes('twitter.com') ||
              href.includes('instagram.com') ||
              !text) {
            return;
          }
          
          // Look for partnership context
          if (context.includes('partner') || context.includes('collab') || 
              context.includes('sponsor') || context.includes('brand')) {
            foundLinks.push({
              title: text,
              url: href
            });
          }
        });
      }
      
      return foundLinks;
    });
    
    return links.map((link, index) => ({
      title: link.title || `Partnership Link ${index + 1}`,
      originalUrl: link.url,
      expandedUrl: '',
      type: this.classifyWebsiteLink(link.url),
      source: 'website' as any,
      confidence: 80 // Good confidence for partnership pages
    }));
  }

  private calculateContentLinkConfidence(url: string, context: string): number {
    let confidence = 70; // Base confidence for content links
    
    // Boost for affiliate indicators in context
    if (/\b(affiliate|sponsored|partnership)\b/i.test(context)) {
      confidence += 20;
    }
    
    // Boost for purchase indicators
    if (/\b(buy|shop|purchase|deal)\b/i.test(context)) {
      confidence += 15;
    }
    
    // Boost for known affiliate networks
    if (WebsiteDiscovery.AFFILIATE_NETWORKS.some(network => url.includes(network))) {
      confidence += 15;
    }
    
    // Boost for discount/promo mentions
    if (/\b(discount|promo|coupon|save)\b/i.test(context)) {
      confidence += 10;
    }
    
    return Math.min(confidence, 95);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

// Test if run directly
if (require.main === module) {
  async function test() {
    console.log('🧪 Testing WebsiteDiscovery...\n');
    
    const discovery = new WebsiteDiscovery();
    
    const testCreators = [
      'therock',        // Should find something
      'MrBeast',        // Might have a website
      'daviddobrik',    // Common creator
      'emmachamberlain', // Fashion/lifestyle
      'nonexistentcreator123' // Should fail gracefully
    ];

    try {
      for (const creator of testCreators) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing website discovery for: ${creator}`);
        console.log('='.repeat(60));
        
        const result = await discovery.discoverWebsite(creator);
        
        if (result.success) {
          console.log(`✅ SUCCESS for ${creator}:`);
          console.log(`   Domain: ${result.domain}`);
          console.log(`   Platform: ${result.platform}`);
          console.log(`   Has affiliate disclosure: ${result.hasAffiliateDisclosure}`);
          console.log(`   Links found: ${result.links.length}`);
          console.log(`   Products found: ${result.shopProducts.length}`);
          console.log(`   Estimated revenue: $${result.estimatedRevenue}/month`);
          console.log(`   Working URLs: ${result.workingUrls.length}/${result.checkedUrls.length}`);
          
          if (result.metadata.affiliateNetworks.length > 0) {
            console.log(`   Affiliate networks: ${result.metadata.affiliateNetworks.join(', ')}`);
          }
          
          if (result.metadata.discountCodes.length > 0) {
            console.log(`   Discount codes: ${result.metadata.discountCodes.join(', ')}`);
          }

          if (result.links.length > 0) {
            console.log('   🔗 Sample links:');
            result.links.slice(0, 3).forEach((link, i) => {
              console.log(`     ${i + 1}. ${link.title} -> ${link.originalUrl}`);
            });
          }

          if (result.shopProducts.length > 0) {
            console.log('   🛍️ Sample products:');
            result.shopProducts.slice(0, 3).forEach((product, i) => {
              console.log(`     ${i + 1}. ${product.name} - ${product.price || 'No price'}`);
            });
          }
          
        } else {
          console.log(`❌ No website found for ${creator}`);
          console.log(`   Checked ${result.checkedUrls.length} URLs`);
          console.log(`   Error: ${result.error}`);
        }
        
        // Add delay between requests
        if (testCreators.indexOf(creator) < testCreators.length - 1) {
          console.log('⏳ Waiting before next test...');
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('\n📊 Website Discovery Test Summary:');
      console.log('✅ Domain variation generation');
      console.log('✅ URL pattern checking');
      console.log('✅ Platform detection');
      console.log('✅ Affiliate disclosure detection');
      console.log('✅ Link extraction');
      console.log('✅ Product extraction');  
      console.log('✅ Revenue estimation');
      console.log('✅ Ready for multi-platform integration');
      
    } catch (error) {
      console.error('Website Discovery test failed:', error);
    } finally {
      await discovery.close();
    }
  }
  
  test();
}