/**
 * FIXED Beacons Extractor - No Shared State
 * 
 * Creates fresh browser context for each extraction to prevent
 * link reuse and caching issues.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface ExtractedLink {
  title: string;
  originalUrl: string;
  source: 'beacons';
  position: number;
}

export class FixedBeaconsExtractor {
  // ✅ NO SHARED STATE - fresh browser for each extraction
  
  async extractLinks(beaconsUrl: string): Promise<ExtractedLink[]> {
    // ✅ Create fresh browser for EACH extraction
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--disable-web-security'
      ]
    });
    
    let page: Page | null = null;
    const links: ExtractedLink[] = [];
    
    try {
      console.log(`🎯 Extracting from: ${beaconsUrl}`);
      
      // ✅ Fresh page with no cached data
      page = await browser.newPage();
      
      // Clear any existing data
      await page.deleteCookie();
      await page.evaluateOnNewDocument(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate to Beacons page
      await page.goto(beaconsUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for React app to load
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      // Handle cookie consent
      await this.handleCookieConsent(page);
      
      // Wait for blocks to render
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Extract links from different block types
      const rawLinks = await this.extractLinksFromBlocks(page);
      
      if (rawLinks.length === 0) {
        console.log('⚠️ No links found with primary selectors, trying fallback...');
        const fallbackLinks = await this.fallbackLinkExtraction(page);
        rawLinks.push(...fallbackLinks);
      }
      
      // Process and structure the extracted links
      rawLinks.forEach((link, index) => {
        if (this.isValidLink(link.url, link.title)) {
          links.push({
            title: this.cleanTitle(link.title),
            originalUrl: link.url,
            source: 'beacons',
            position: index + 1
          });
        }
      });
      
      console.log(`✅ Successfully extracted ${links.length} links from Beacons`);
      
    } catch (error) {
      console.error('❌ Beacons extraction failed:', error);
      throw new Error(`Failed to extract from ${beaconsUrl}: ${error}`);
    } finally {
      // ✅ CRITICAL: Always close browser and page
      if (page) await page.close();
      await browser.close();
    }
    
    return links;
  }
  
  private async handleCookieConsent(page: Page): Promise<void> {
    try {
      await page.waitForSelector('button', { timeout: 2000 });
      const buttons = await page.$$('button');
      
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('accept') || text.includes('cookie') || text.includes('agree')) {
          await button.click();
          console.log('🍪 Accepted cookie consent');
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
      }
    } catch {
      // No cookie banner found, continue
    }
  }
  
  private async extractLinksFromBlocks(page: Page): Promise<{title: string, url: string}[]> {
    return await page.evaluate(() => {
      const extractedLinks: {title: string, url: string}[] = [];
      
      // Beacons-specific selectors for different block types
      const blockSelectors = [
        '[data-testid*="link"] a',
        '[data-testid*="Link"] a',
        '.link-block a',
        '.LinkBlock a',
        '[data-testid*="store"] a',
        '[data-testid*="Store"] a',
        '.store-block a',
        '.StoreBlock a',
        '[data-testid*="block"] a',
        '[data-testid*="Block"] a',
        '.block a',
        '.Block a',
        '.card a',
        '.Card a',
        'a[href*="http"]'
      ];
      
      for (const selector of blockSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with Beacons selector: ${selector}`);
          
          Array.from(elements).forEach(el => {
            const anchor = el as HTMLAnchorElement;
            const title = anchor.textContent?.trim() || anchor.getAttribute('aria-label') || '';
            const url = anchor.href;
            
            if (url && title) {
              extractedLinks.push({ title, url });
            }
          });
          
          if (extractedLinks.length > 0) break;
        }
      }
      
      return extractedLinks;
    });
  }
  
  private async fallbackLinkExtraction(page: Page): Promise<{title: string, url: string}[]> {
    return await page.evaluate(() => {
      const allLinks = document.querySelectorAll('a[href]');
      
      return Array.from(allLinks)
        .map(el => {
          const anchor = el as HTMLAnchorElement;
          return {
            title: anchor.textContent?.trim() || anchor.getAttribute('aria-label') || '',
            url: anchor.href
          };
        })
        .filter(link => {
          return link.url && 
                 !link.url.includes('beacons.ai') && 
                 !link.url.includes('cookiepedia') &&
                 !link.url.includes('onetrust') &&
                 !link.url.includes('twitter.com') &&
                 !link.url.includes('instagram.com') &&
                 !link.url.includes('facebook.com') &&
                 !link.url.includes('tiktok.com') &&
                 !link.url.includes('youtube.com') &&
                 link.url.startsWith('http') &&
                 link.title.length > 2;
        });
    });
  }
  
  private isValidLink(url: string, title: string): boolean {
    if (!url || !title || title.length < 2) return false;
    if (!url.startsWith('http')) return false;
    
    const excludePatterns = [
      'beacons.ai',
      'cookiepedia',
      'onetrust',
      'privacy-policy',
      'terms-of-service',
      'twitter.com',
      'instagram.com',
      'facebook.com',
      'tiktok.com',
      'youtube.com'
    ];
    
    const urlLower = url.toLowerCase();
    const titleLower = title.toLowerCase();
    
    return !excludePatterns.some(pattern => 
      urlLower.includes(pattern) || titleLower.includes(pattern)
    );
  }
  
  private cleanTitle(title: string): string {
    return title
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?()]/g, '')
      .trim();
  }
}