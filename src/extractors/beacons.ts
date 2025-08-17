import puppeteer, { Browser, Page } from 'puppeteer';

export interface ExtractedLink {
  title: string;
  originalUrl: string;
  source: 'beacons';
  position: number;
}

export class BeaconsExtractor {
  private browser: Browser | null = null;
  
  async initialize(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors',
        '--ignore-ssl-errors',
        '--disable-web-security'
      ]
    });
  }
  
  async extractLinks(beaconsUrl: string): Promise<ExtractedLink[]> {
    if (!this.browser) await this.initialize();
    
    const page = await this.browser!.newPage();
    const links: ExtractedLink[] = [];
    
    try {
      console.log(`🎯 Extracting from: ${beaconsUrl}`);
      
      // Navigate to Beacons page
      await page.goto(beaconsUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait for React app to load
      console.log('⚡ Waiting for React app to load...');
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
      await page.close();
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
        // Link blocks
        '[data-testid*="link"] a',
        '[data-testid*="Link"] a',
        '.link-block a',
        '.LinkBlock a',
        
        // Store blocks
        '[data-testid*="store"] a',
        '[data-testid*="Store"] a',
        '.store-block a',
        '.StoreBlock a',
        
        // General blocks with links
        '[data-testid*="block"] a',
        '[data-testid*="Block"] a',
        '.block a',
        '.Block a',
        
        // Card-based layouts
        '.card a',
        '.Card a',
        '[data-testid*="card"] a',
        '[data-testid*="Card"] a',
        
        // Direct link elements
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
      
      // Also check for links in nested structures (Beacons sometimes nests deeply)
      if (extractedLinks.length === 0) {
        const nestedLinks = document.querySelectorAll('div[data-testid] a, section a, article a');
        Array.from(nestedLinks).forEach(el => {
          const anchor = el as HTMLAnchorElement;
          const title = anchor.textContent?.trim() || anchor.getAttribute('aria-label') || '';
          const url = anchor.href;
          
          if (url && title && url.startsWith('http')) {
            extractedLinks.push({ title, url });
          }
        });
      }
      
      return extractedLinks;
    });
  }
  
  private async fallbackLinkExtraction(page: Page): Promise<{title: string, url: string}[]> {
    return await page.evaluate(() => {
      // Last resort: get all external links
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
          // Filter for external links that look like product/affiliate links
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
    // Filter out invalid or irrelevant links
    if (!url || !title || title.length < 2) return false;
    
    // Must be HTTP/HTTPS
    if (!url.startsWith('http')) return false;
    
    // Exclude social media and internal links
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
    // Clean up title text
    return title
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s\-.,!?()]/g, '') // Remove special characters
      .trim();
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
    const extractor = new BeaconsExtractor();
    
    try {
      // Test with a known Beacons profile (you can change this)
      const testUrl = 'https://beacons.ai/test'; // Replace with actual Beacons profile
      const links = await extractor.extractLinks(testUrl);
      
      console.log(`\n📊 Beacons Extraction Summary:`);
      console.log(`Found ${links.length} affiliate links`);
      
      links.forEach(link => {
        console.log(`${link.position}. ${link.title} -> ${link.originalUrl}`);
      });
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await extractor.close();
    }
  }
  
  test();
}