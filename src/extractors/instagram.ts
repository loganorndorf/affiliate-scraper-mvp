import puppeteer, { Browser, Page } from 'puppeteer';

export interface InstagramProfile {
  username: string;
  bioText?: string;
  bioLink?: string;
  followerCount: number;
  fullName?: string;
  isVerified?: boolean;
  extractedAt: Date;
  warnings: string[];
}

export class InstagramExtractor {
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
  
  async getProfile(username: string): Promise<InstagramProfile | null> {
    if (!this.browser) await this.initialize();
    
    const page = await this.browser!.newPage();
    const warnings: string[] = [];
    
    try {
      console.log(`📱 Getting Instagram profile for: @${username}`);
      
      // Set mobile user agent to reduce detection
      await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1');
      
      // Add random delay to appear more human
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      
      // Navigate to profile
      const profileUrl = `https://www.instagram.com/${username}/`;
      await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for page to load
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Check if we hit a login wall
      const hasLoginWall = await this.checkForLoginWall(page);
      if (hasLoginWall) {
        warnings.push('Instagram login wall detected, extracted limited data');
      }
      
      // Extract profile data using multiple methods
      const profileData = await this.extractProfileData(page);
      
      // If we couldn't extract anything, still return basic profile with warning
      if (!profileData.bioText && !profileData.bioLink && !profileData.fullName) {
        warnings.push('Instagram blocked extraction, returning minimal data');
        return {
          username,
          bioText: undefined,
          bioLink: undefined,
          followerCount: 0,
          fullName: undefined,
          isVerified: undefined,
          extractedAt: new Date(),
          warnings
        };
      }
      
      return {
        username,
        bioText: profileData.bioText,
        bioLink: profileData.bioLink,
        followerCount: profileData.followerCount || 0,
        fullName: profileData.fullName,
        isVerified: profileData.isVerified,
        extractedAt: new Date(),
        warnings
      };
      
    } catch (error) {
      console.error(`❌ Instagram extraction failed for @${username}:`, error);
      return null;
    } finally {
      await page.close();
    }
  }
  
  private async checkForLoginWall(page: Page): Promise<boolean> {
    try {
      const loginIndicators = await page.evaluate(() => {
        const pageText = document.body.textContent?.toLowerCase() || '';
        return pageText.includes('log in') || 
               pageText.includes('sign up') ||
               pageText.includes('create account');
      });
      
      return loginIndicators;
    } catch {
      return false;
    }
  }
  
  private async extractProfileData(page: Page): Promise<Partial<InstagramProfile>> {
    // Method 1: Meta tags (most reliable)
    const metaData = await this.extractFromMetaTags(page);
    if (metaData.bioText || metaData.bioLink) {
      console.log('📋 Extracted data from meta tags');
      return metaData;
    }
    
    // Method 2: JSON-LD structured data
    const jsonLdData = await this.extractFromJsonLd(page);
    if (jsonLdData.bioText || jsonLdData.bioLink) {
      console.log('📋 Extracted data from JSON-LD');
      return jsonLdData;
    }
    
    // Method 3: HTML elements (last resort)
    const htmlData = await this.extractFromHtml(page);
    console.log('📋 Extracted data from HTML elements');
    return htmlData;
  }
  
  private async extractFromMetaTags(page: Page): Promise<Partial<InstagramProfile>> {
    return await page.evaluate(() => {
      const getMetaContent = (property: string) => {
        const meta = document.querySelector(`meta[property="${property}"], meta[name="${property}"]`);
        return meta?.getAttribute('content') || undefined;
      };
      
      const description = getMetaContent('og:description') || getMetaContent('description');
      const title = getMetaContent('og:title') || document.title;
      
      // Try to extract follower count from title or description
      let followerCount = 0;
      if (title) {
        const followerMatch = title.match(/(\d+(?:\.\d+)?)\s*([KMB])\s*Followers/i);
        if (followerMatch) {
          const num = parseFloat(followerMatch[1]);
          const multiplier = followerMatch[2].toUpperCase();
          followerCount = multiplier === 'K' ? num * 1000 : 
                         multiplier === 'M' ? num * 1000000 : 
                         multiplier === 'B' ? num * 1000000000 : num;
        }
      }
      
      // Look for bio link in description
      let bioLink: string | undefined;
      if (description) {
        const linkMatch = description.match(/(https?:\/\/[^\s]+)/);
        bioLink = linkMatch ? linkMatch[1] : undefined;
      }
      
      return {
        fullName: title?.split('(')[0]?.trim(),
        bioText: description,
        bioLink,
        followerCount: Math.round(followerCount)
      };
    });
  }
  
  private async extractFromJsonLd(page: Page): Promise<Partial<InstagramProfile>> {
    return await page.evaluate(() => {
      const scripts = document.querySelectorAll('script[type="application/ld+json"]');
      
      for (const script of scripts) {
        try {
          const data = JSON.parse(script.textContent || '');
          if (data['@type'] === 'Person' || data['@type'] === 'ProfilePage') {
            return {
              fullName: data.name,
              bioText: data.description,
              followerCount: data.interactionStatistic?.userInteractionCount || 0
            };
          }
        } catch {
          continue;
        }
      }
      
      return {};
    });
  }
  
  private async extractFromHtml(page: Page): Promise<Partial<InstagramProfile>> {
    return await page.evaluate(() => {
      // Try to find bio link in HTML (careful with selectors that might change)
      const bioLinkSelectors = [
        'a[href*="linktr.ee"]',
        'a[href*="beacons.ai"]',
        'a[href*="linkin.bio"]',
        'a[href^="http"]:not([href*="instagram.com"]):not([href*="facebook.com"])'
      ];
      
      let bioLink: string | undefined;
      for (const selector of bioLinkSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          bioLink = (element as HTMLAnchorElement).href;
          break;
        }
      }
      
      // Try to find bio text
      const bioSelectors = [
        '[data-testid*="bio"]',
        '.bio',
        '[class*="bio"]',
        'span:contains("http")'
      ];
      
      let bioText: string | undefined;
      for (const selector of bioSelectors) {
        const element = document.querySelector(selector);
        if (element?.textContent) {
          bioText = element.textContent.trim();
          break;
        }
      }
      
      // Try to extract follower count from page
      let followerCount = 0;
      const followerText = document.body.textContent || '';
      const followerMatch = followerText.match(/(\d+(?:,\d+)*)\s*followers/i);
      if (followerMatch) {
        followerCount = parseInt(followerMatch[1].replace(/,/g, ''));
      }
      
      return {
        bioText,
        bioLink,
        followerCount
      };
    });
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
    const extractor = new InstagramExtractor();
    
    const testUsernames = ['cristiano', 'therock', 'kingjames'];
    
    try {
      for (const username of testUsernames) {
        console.log(`\n🧪 Testing Instagram extraction for @${username}...`);
        
        const profile = await extractor.getProfile(username);
        
        if (profile) {
          console.log(`✅ Success for @${username}:`);
          console.log(`   Full Name: ${profile.fullName || 'Not found'}`);
          console.log(`   Followers: ${profile.followerCount.toLocaleString()}`);
          console.log(`   Bio Link: ${profile.bioLink || 'Not found'}`);
          console.log(`   Bio Text: ${profile.bioText?.substring(0, 100) || 'Not found'}...`);
          if (profile.warnings.length > 0) {
            console.log(`   Warnings: ${profile.warnings.join(', ')}`);
          }
        } else {
          console.log(`❌ Failed to extract profile for @${username}`);
        }
        
        // Add delay between requests
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await extractor.close();
    }
  }
  
  test();
}