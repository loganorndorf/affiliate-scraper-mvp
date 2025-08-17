/**
 * FIXED Linktree Extractor - No Shared State
 * 
 * Creates fresh browser context for each extraction to prevent
 * link reuse and caching issues.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

export interface ExtractedLink {
  title: string;
  originalUrl: string;
  source: 'linktree';
  position: number;
}

export class FixedLinktreeExtractor {
  // ✅ NO SHARED STATE - fresh browser for each extraction
  
  async extractLinks(linktreeUrl: string): Promise<ExtractedLink[]> {
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
      console.log(`🔗 Extracting from: ${linktreeUrl}`);
      
      // ✅ Fresh page with no cached data
      page = await browser.newPage();
      
      // Clear any existing data
      await page.deleteCookie();
      await page.evaluateOnNewDocument(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      
      // Navigate to Linktree
      await page.goto(linktreeUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Handle cookie consent if present
      await this.handleCookieConsent(page);
      
      // Wait a bit more for links to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Extract links using multiple strategies
      const rawLinks = await this.extractLinksFromPage(page);
      
      if (rawLinks.length === 0) {
        console.log('⚠️ No links found, trying fallback extraction...');
        const fallbackLinks = await this.fallbackLinkExtraction(page);
        rawLinks.push(...fallbackLinks);
      }
      
      // Process and structure the extracted links
      rawLinks.forEach((link, index) => {
        if (this.isValidLink(link.url, link.title)) {
          links.push({
            title: this.cleanTitle(link.title),
            originalUrl: link.url,
            source: 'linktree',
            position: index + 1
          });
        }
      });
      
      console.log(`✅ Successfully extracted ${links.length} links from ${linktreeUrl}`);
      
    } catch (error) {
      console.error('❌ Linktree extraction failed:', error);
      throw new Error(`Failed to extract from ${linktreeUrl}: ${error}`);
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
  
  private async extractLinksFromPage(page: Page): Promise<{title: string, url: string}[]> {
    return await page.evaluate(() => {
      // Primary selectors for Linktree link buttons
      const primarySelectors = [
        'a[data-testid="LinkButton"]',
        'a[data-testid*="link"]',
        'a[role="button"]',
        'div[data-testid*="LinkButton"] a',
        '.styled__LinkButtonContainer a',
        '[data-testid*="Link"] a'
      ];
      
      let elements: NodeListOf<Element> | null = null;
      
      // Try each selector until we find links
      for (const selector of primarySelectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }
      
      if (!elements || elements.length === 0) {
        console.log('No links found with primary selectors');
        return [];
      }
      
      return Array.from(elements).map(el => ({
        title: el.textContent?.trim() || '',
        url: (el as HTMLAnchorElement).href
      }));
    });
  }
  
  private async fallbackLinkExtraction(page: Page): Promise<{title: string, url: string}[]> {
    return await page.evaluate(() => {
      // Fallback: Get all links and filter for external ones
      const allLinks = document.querySelectorAll('a[href]');
      
      return Array.from(allLinks)
        .map(el => ({
          title: el.textContent?.trim() || '',
          url: (el as HTMLAnchorElement).href
        }))
        .filter(link => {
          // Filter for external links that look like affiliate/product links
          return link.url && 
                 !link.url.includes('linktr.ee') && 
                 !link.url.includes('cookiepedia') &&
                 !link.url.includes('onetrust') &&
                 !link.url.includes('twitter.com') &&
                 !link.url.includes('instagram.com') &&
                 !link.url.includes('facebook.com') &&
                 link.url.startsWith('http') &&
                 link.title.length > 0;
        });
    });
  }
  
  private isValidLink(url: string, title: string): boolean {
    if (!url || !title || title.length < 2) return false;
    if (!url.startsWith('http')) return false;
    
    const excludePatterns = [
      'linktr.ee',
      'cookiepedia',
      'onetrust',
      'privacy-policy',
      'terms-of-service'
    ];
    
    return !excludePatterns.some(pattern => 
      url.toLowerCase().includes(pattern) || 
      title.toLowerCase().includes(pattern)
    );
  }
  
  private cleanTitle(title: string): string {
    return title
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}