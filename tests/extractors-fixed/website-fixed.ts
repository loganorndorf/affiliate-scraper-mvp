/**
 * FIXED Website Discovery Extractor - No Shared State
 * 
 * Creates fresh browser context for each extraction to prevent
 * website data reuse and caching issues.
 */

import { chromium, Browser, Page } from 'playwright';

export interface WebsiteResult {
  username: string;
  platform: string;
  domain?: string;
  websitePlatform?: string;
  hasAffiliate: boolean;
  hasShop: boolean;
  links: any[];
  products: any[];
  success: boolean;
}

export class FixedWebsiteExtractor {
  // ✅ NO SHARED STATE - fresh browser for each extraction
  
  async discoverWebsite(creatorName: string): Promise<WebsiteResult | null> {
    // ✅ Create fresh browser for EACH extraction
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });
    
    let page: Page | null = null;
    
    try {
      console.log(`🌐 Discovering website for: ${creatorName}`);
      
      // ✅ Fresh page with no cached data
      page = await browser.newPage();
      
      // Clear any existing data
      await page.context().clearCookies();
      
      const domains = this.generateDomainVariations(creatorName);
      let foundWebsite = null;
      
      // Try each domain variation
      for (const domain of domains.slice(0, 5)) { // Limit to 5 domains for testing
        try {
          console.log(`🔍 Checking domain: ${domain}`);
          const result = await this.checkDomain(page, domain, creatorName);
          
          if (result.success) {
            foundWebsite = result;
            console.log(`✅ Found working website: ${domain}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Domain ${domain} failed: ${error}`);
          continue;
        }
      }
      
      if (!foundWebsite) {
        return {
          username: creatorName,
          platform: 'website',
          hasAffiliate: false,
          hasShop: false,
          links: [],
          products: [],
          success: false
        };
      }
      
      return foundWebsite;
      
    } catch (error) {
      console.error(`❌ Website discovery failed for ${creatorName}:`, error);
      return null;
    } finally {
      // ✅ CRITICAL: Always close browser and page
      if (page) await page.close();
      await browser.close();
    }
  }
  
  private generateDomainVariations(creatorName: string): string[] {
    const clean = creatorName.toLowerCase()
      .replace(/[@\s]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '');

    const variations = [
      clean,
      clean.replace(/the/g, ''),
      clean.replace(/official/g, ''),
      `${clean}official`,
      clean + 'shop',
      clean + 'store'
    ];

    const domains: string[] = [];
    const extensions = ['.com', '.co', '.tv', '.me', '.net'];
    
    for (const variation of variations) {
      for (const extension of extensions) {
        domains.push(variation + extension);
      }
    }

    return [...new Set(domains)].slice(0, 15);
  }
  
  private async checkDomain(page: Page, domain: string, creatorName: string): Promise<WebsiteResult> {
    const baseUrl = `https://${domain}`;
    
    try {
      await page.goto(baseUrl, { 
        waitUntil: 'domcontentloaded', 
        timeout: 10000 
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if page exists (not 404)
      const pageExists = await page.evaluate(() => {
        const pageText = document.body.textContent?.toLowerCase() || '';
        return !pageText.includes('404') && 
               !pageText.includes('not found') &&
               !pageText.includes('page not found');
      });
      
      if (!pageExists) {
        throw new Error('Page not found');
      }
      
      // Detect website platform
      const platform = await this.detectPlatform(page);
      
      // Check for affiliate content
      const hasAffiliate = await this.checkAffiliateContent(page);
      
      // Check for shop
      const hasShop = await this.checkShopContent(page);
      
      // Extract basic links
      const links = await this.extractBasicLinks(page);
      
      // Extract basic products if shop detected
      const products = hasShop ? await this.extractBasicProducts(page) : [];
      
      console.log(`✅ Website found: ${domain} (${platform}), ${links.length} links, ${products.length} products`);
      
      return {
        username: creatorName,
        platform: 'website',
        domain,
        websitePlatform: platform,
        hasAffiliate,
        hasShop,
        links,
        products,
        success: true
      };
      
    } catch (error) {
      throw new Error(`Domain check failed: ${error}`);
    }
  }
  
  private async detectPlatform(page: Page): Promise<string> {
    return await page.evaluate(() => {
      const html = document.documentElement.outerHTML;
      
      if (html.includes('wp-content') || html.includes('wordpress')) return 'wordpress';
      if (html.includes('shopify') || html.includes('myshopify.com')) return 'shopify';
      if (html.includes('squarespace') || html.includes('sqsp.net')) return 'squarespace';
      if (html.includes('wix.com') || html.includes('_wixCIDX')) return 'wix';
      
      return 'custom';
    });
  }
  
  private async checkAffiliateContent(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const pageText = document.body.textContent?.toLowerCase() || '';
      
      const disclosurePatterns = [
        'affiliate link',
        'affiliate disclosure',
        'earn commission',
        'paid partnership',
        'sponsored',
        'as an amazon associate'
      ];

      return disclosurePatterns.some(pattern => pageText.includes(pattern));
    });
  }
  
  private async checkShopContent(page: Page): Promise<boolean> {
    return await page.evaluate(() => {
      const shopIndicators = [
        '.product',
        '.shop',
        '.store',
        '[data-product]',
        '.woocommerce',
        '.shopify',
        'add to cart',
        'buy now'
      ];
      
      return shopIndicators.some(indicator => {
        if (indicator.startsWith('.') || indicator.startsWith('[')) {
          return document.querySelector(indicator) !== null;
        } else {
          return document.body.textContent?.toLowerCase().includes(indicator) || false;
        }
      });
    });
  }
  
  private async extractBasicLinks(page: Page): Promise<any[]> {
    const links = await page.evaluate(() => {
      const foundLinks: any[] = [];
      const linkElements = document.querySelectorAll('a[href*="://"]');
      
      linkElements.forEach((element, index) => {
        if (index >= 10) return; // Limit to first 10
        
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
          title: text,
          url: href
        });
      });
      
      return foundLinks;
    });
    
    return links;
  }
  
  private async extractBasicProducts(page: Page): Promise<any[]> {
    return await page.evaluate(() => {
      const products: any[] = [];
      
      const productSelectors = [
        '.product',
        '.product-item', 
        '.shop-item',
        '[data-product]'
      ];

      for (const selector of productSelectors) {
        const productElements = document.querySelectorAll(selector);
        
        productElements.forEach((element, index) => {
          if (index >= 5) return; // Limit to first 5
          
          const nameEl = element.querySelector('h1, h2, h3, .title, .name');
          const priceEl = element.querySelector('.price, .cost');
          const linkEl = element.querySelector('a') || element;

          const name = nameEl?.textContent?.trim();
          const price = priceEl?.textContent?.trim();
          const url = (linkEl as HTMLAnchorElement)?.href;

          if (name && url) {
            products.push({
              name,
              price: price || undefined,
              url
            });
          }
        });

        if (products.length > 0) break;
      }

      return products;
    });
  }
}