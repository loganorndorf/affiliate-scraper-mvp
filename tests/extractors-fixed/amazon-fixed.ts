/**
 * FIXED Amazon Storefront Extractor - No Shared State
 * 
 * Creates fresh browser context for each extraction to prevent
 * storefront data reuse and caching issues.
 */

import { chromium, Browser, Page } from 'playwright';

export interface AmazonProduct {
  title: string;
  asin: string;
  price?: string;
  url: string;
  inStock: boolean;
}

export class FixedAmazonExtractor {
  // ✅ NO SHARED STATE - fresh browser for each extraction
  
  async extractStorefront(creatorHandle: string): Promise<any> {
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
      console.log(`🛒 Checking Amazon Storefront for: ${creatorHandle}`);
      
      // ✅ Fresh page with no cached data
      page = await browser.newPage();
      
      // Clear any existing data
      await page.context().clearCookies();
      
      const storefront = await this.checkStorefront(page, creatorHandle);
      
      if (!storefront) {
        return {
          username: creatorHandle,
          platform: 'amazon',
          products: [],
          totalProducts: 0,
          categories: [],
          hasStorefront: false
        };
      }
      
      return {
        username: creatorHandle,
        platform: 'amazon',
        products: storefront.products,
        totalProducts: storefront.totalProducts,
        categories: storefront.categories,
        hasStorefront: true,
        storeUrl: storefront.storeUrl
      };
      
    } catch (error) {
      console.error(`❌ Amazon extraction failed for ${creatorHandle}:`, error);
      throw new Error(`Failed to extract Amazon storefront: ${error}`);
    } finally {
      // ✅ CRITICAL: Always close browser and page
      if (page) await page.close();
      await browser.close();
    }
  }
  
  private async checkStorefront(page: Page, creatorHandle: string) {
    const storeUrl = `https://www.amazon.com/shop/${creatorHandle.toLowerCase()}`;
    
    try {
      await page.goto(storeUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      // Check if storefront exists
      const hasStorefront = await page.evaluate(() => {
        const pageText = document.body.textContent?.toLowerCase() || '';
        const hasError = pageText.includes('sorry') || 
                        pageText.includes('not found') ||
                        pageText.includes('404');
        
        const hasProducts = document.querySelectorAll('[data-component-type="s-search-result"]').length > 0;
        
        return !hasError && hasProducts;
      });
      
      if (!hasStorefront) {
        return null;
      }
      
      // Extract basic storefront data
      const storefrontData = await page.evaluate(() => {
        const products: any[] = [];
        const categories: string[] = [];
        
        // Extract products
        const productElements = document.querySelectorAll('[data-component-type="s-search-result"]');
        productElements.forEach((element, index) => {
          if (index >= 10) return; // Limit to first 10
          
          const titleEl = element.querySelector('h2 a span, h2 span');
          const priceEl = element.querySelector('.a-price-whole, .a-price .a-offscreen');
          const linkEl = element.querySelector('h2 a');
          
          const title = titleEl?.textContent?.trim();
          const price = priceEl?.textContent?.trim();
          const url = (linkEl as HTMLAnchorElement)?.href;
          
          if (title && url) {
            const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/);
            products.push({
              title,
              asin: asinMatch ? asinMatch[1] : '',
              price: price || undefined,
              url,
              inStock: !element.textContent?.includes('unavailable')
            });
          }
        });
        
        return {
          products,
          totalProducts: productElements.length,
          categories
        };
      });
      
      return {
        ...storefrontData,
        storeUrl
      };
      
    } catch (error) {
      console.log(`⚠️ Could not access Amazon storefront for ${creatorHandle}`);
      return null;
    }
  }
}