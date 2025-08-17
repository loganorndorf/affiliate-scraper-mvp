/**
 * FIXED TikTok Extractor - No Shared State
 * 
 * Creates fresh browser context for each extraction to prevent
 * profile data reuse and caching issues.
 */

import { chromium, Browser, Page } from 'playwright';

export interface TikTokProfile {
  username: string;
  bioText?: string;
  bioLink?: string;
  followerCount: number;
  fullName?: string;
  isVerified?: boolean;
  extractedAt: Date;
  warnings: string[];
}

export class FixedTikTokExtractor {
  // ✅ NO SHARED STATE - fresh browser for each extraction
  
  async extract(username: string): Promise<TikTokProfile | null> {
    // ✅ Create fresh browser for EACH extraction
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
    
    let page: Page | null = null;
    const warnings: string[] = [];
    
    try {
      console.log(`🎵 Extracting TikTok profile: @${username}`);
      
      // ✅ Fresh page with no cached data
      page = await browser.newPage();
      
      // Clear any existing data
      await page.context().clearCookies();
      
      // Configure mobile viewport and user agent
      await page.setViewportSize({ width: 375, height: 812 });
      await page.setExtraHTTPHeaders({
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1'
      });
      
      // Add random delay to appear human
      await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000));
      
      // Navigate to TikTok profile
      const profileUrl = `https://www.tiktok.com/@${username}`;
      await page.goto(profileUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000
      });
      
      // Wait for profile to load
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      // Check for login redirect
      const currentUrl = page.url();
      if (currentUrl.includes('/login') || currentUrl.includes('/signin')) {
        warnings.push('TikTok redirected to login, partial data only');
      }
      
      // Extract profile data
      const profileData = await this.extractProfileData(page, username);
      
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
      console.error(`❌ TikTok extraction failed for @${username}:`, error);
      return null;
    } finally {
      // ✅ CRITICAL: Always close browser and page
      if (page) await page.close();
      await browser.close();
    }
  }
  
  private async extractProfileData(page: Page, username: string): Promise<Partial<TikTokProfile>> {
    console.log(`🔍 Extracting profile data for: @${username}`);
    
    return await page.evaluate(() => {
      // Try multiple selectors for bio
      const getBioText = (): string | undefined => {
        const bioSelectors = [
          '[data-e2e="user-bio"]',
          '.share-desc',
          'div[class*="InfoContainer"]',
          '[data-testid="user-bio"]',
          '.bio-text'
        ];
        
        for (const selector of bioSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }
        return undefined;
      };
      
      // Extract bio link
      const getBioLink = (): string | undefined => {
        const bioText = getBioText();
        if (!bioText) return undefined;
        
        // Look for links within bio area
        const linkSelectors = [
          'a[href*="link"]',
          'a[target="_blank"]',
          'a[href^="http"]'
        ];
        
        for (const selector of linkSelectors) {
          const linkElement = document.querySelector(selector);
          if (linkElement) {
            const href = (linkElement as HTMLAnchorElement).href;
            if (href && !href.includes('tiktok.com') && href.startsWith('http')) {
              return href;
            }
          }
        }
        
        // Fallback: extract URL from bio text
        const urlMatch = bioText.match(/(https?:\/\/[^\s]+)/);
        return urlMatch ? urlMatch[1] : undefined;
      };
      
      // Get follower count
      const getFollowerCount = (): number => {
        const followerSelectors = [
          '[data-e2e="followers-count"]',
          'span[class*="follower"]',
          '[data-testid="followers-count"]'
        ];
        
        for (const selector of followerSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent) {
            return parseFollowerCount(element.textContent);
          }
        }
        
        // Fallback: look for follower text in page
        const pageText = document.body.textContent || '';
        const followerMatch = pageText.match(/(\d+(?:\.\d+)?)\s*([KMB]?)\s*Followers/i);
        if (followerMatch) {
          return parseFollowerCount(followerMatch[0]);
        }
        
        return 0;
      };
      
      // Parse follower count with K/M/B notation
      function parseFollowerCount(text: string): number {
        const match = text.match(/(\d+(?:\.\d+)?)\s*([KMB]?)/i);
        if (!match) return 0;
        
        const num = parseFloat(match[1]);
        const multiplier = match[2]?.toUpperCase();
        
        switch (multiplier) {
          case 'K': return Math.round(num * 1000);
          case 'M': return Math.round(num * 1000000);
          case 'B': return Math.round(num * 1000000000);
          default: return Math.round(num);
        }
      }
      
      // Get full name/display name
      const getFullName = (): string | undefined => {
        const nameSelectors = [
          'h1',
          '[data-e2e="user-title"]',
          '.share-title',
          'h2'
        ];
        
        for (const selector of nameSelectors) {
          const element = document.querySelector(selector);
          if (element?.textContent?.trim()) {
            return element.textContent.trim();
          }
        }
        return undefined;
      };
      
      // Check if verified
      const getIsVerified = (): boolean => {
        const verifiedSelectors = [
          '[data-e2e="user-verified"]',
          '.verified-icon',
          'svg[data-e2e="verified-icon"]'
        ];
        
        return verifiedSelectors.some(selector => 
          document.querySelector(selector) !== null
        );
      };
      
      return {
        bioText: getBioText(),
        bioLink: getBioLink(),
        followerCount: getFollowerCount(),
        fullName: getFullName(),
        isVerified: getIsVerified()
      };
    });
  }
}