import { chromium, Browser, Page } from 'playwright';
import { ExtractedLink } from '../types';

export interface TikTokProfile {
  username: string;
  bioText?: string;
  bioLink?: string;
  followerCount: number;
  fullName?: string;
  extractedAt: Date;
  warnings: string[];
}

export interface TikTokResult {
  profile: TikTokProfile;
  links: ExtractedLink[];
  success: boolean;
  error?: string;
}

export class TikTokExtractor {
  private browser: Browser | null = null;
  
  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox'
      ]
    });
  }
  
  async extract(username: string): Promise<TikTokResult> {
    if (!this.browser) await this.initialize();
    
    const page = await this.browser!.newPage();
    const warnings: string[] = [];
    
    try {
      console.log(`🎵 Extracting TikTok profile: @${username}`);
      
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
      const profileData = await this.extractProfileData(page);
      
      // Try to extract video links (optional, might fail)
      let videoLinks: ExtractedLink[] = [];
      try {
        videoLinks = await this.extractVideoLinks(page, username);
      } catch (error) {
        warnings.push('Could not extract video links');
        console.log('⚠️ Video extraction failed, continuing with bio only...');
      }
      
      // Combine bio link and video links
      const allLinks: ExtractedLink[] = [];
      
      // Add bio link if found
      if (profileData.bioLink) {
        allLinks.push({
          title: 'TikTok Bio Link',
          originalUrl: profileData.bioLink,
          expandedUrl: '',
          type: 'unknown' as any,
          source: 'bio',
          confidence: 95
        });
      }
      
      // Add video links
      allLinks.push(...videoLinks);
      
      const profile: TikTokProfile = {
        username,
        bioText: profileData.bioText,
        bioLink: profileData.bioLink,
        followerCount: profileData.followerCount || 0,
        fullName: profileData.fullName,
        extractedAt: new Date(),
        warnings
      };
      
      console.log(`✅ TikTok extraction complete: ${allLinks.length} links found`);
      
      return {
        profile,
        links: allLinks,
        success: true
      };
      
    } catch (error) {
      console.error(`❌ TikTok extraction failed for @${username}:`, error);
      
      return {
        profile: {
          username,
          followerCount: 0,
          extractedAt: new Date(),
          warnings: [`Extraction failed: ${error}`]
        },
        links: [],
        success: false,
        error: String(error)
      };
    } finally {
      await page.close();
    }
  }
  
  private async extractProfileData(page: Page): Promise<Partial<TikTokProfile>> {
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
            // Make sure it's not a TikTok internal link
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
      
      return {
        bioText: getBioText(),
        bioLink: getBioLink(),
        followerCount: getFollowerCount(),
        fullName: getFullName()
      };
    });
  }
  
  private async extractVideoLinks(page: Page, username: string): Promise<ExtractedLink[]> {
    const links: ExtractedLink[] = [];
    
    try {
      console.log('🎬 Attempting to extract video links...');
      
      // Look for video items
      const videoSelectors = [
        '[data-e2e="user-post-item"]',
        '[data-testid="user-post-item"]',
        '.video-feed-item',
        'div[class*="video"]'
      ];
      
      let videoElements = null;
      for (const selector of videoSelectors) {
        videoElements = await page.$$(selector);
        if (videoElements.length > 0) {
          console.log(`Found ${videoElements.length} videos with selector: ${selector}`);
          break;
        }
      }
      
      if (!videoElements || videoElements.length === 0) {
        console.log('No videos found to extract from');
        return links;
      }
      
      // Try to extract from first 3 videos max
      const maxVideos = Math.min(3, videoElements.length);
      
      for (let i = 0; i < maxVideos; i++) {
        try {
          // Click on video
          await videoElements[i].click();
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Try to find description
          const description = await page.evaluate(() => {
            const descSelectors = [
              '[data-e2e="browse-video-desc"]',
              '.video-meta-caption',
              '[data-testid="video-description"]'
            ];
            
            for (const selector of descSelectors) {
              const element = document.querySelector(selector);
              if (element?.textContent) {
                return element.textContent.trim();
              }
            }
            return '';
          });
          
          // Extract URLs from description
          if (description) {
            const urlMatches = description.match(/https?:\/\/[^\s]+/g) || [];
            
            urlMatches.forEach((url, urlIndex) => {
              links.push({
                title: `TikTok Video ${i + 1} Link ${urlIndex + 1}`,
                originalUrl: url.trim(),
                expandedUrl: '',
                type: 'unknown' as any,
                source: 'post',
                confidence: 75
              });
            });
          }
          
          // Go back or to next video (try arrow key)
          if (i < maxVideos - 1) {
            await page.keyboard.press('ArrowDown');
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
          
        } catch (videoError) {
          console.log(`⚠️ Could not extract from video ${i + 1}:`, videoError);
          continue;
        }
      }
      
    } catch (error) {
      console.log('⚠️ Video link extraction failed:', error);
    }
    
    return links;
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
    const extractor = new TikTokExtractor();
    
    const testUsernames = ['therock', 'mrbeast', 'gordonramsay'];
    
    try {
      for (const username of testUsernames) {
        console.log(`\n${'='.repeat(50)}`);
        console.log(`Testing TikTok extraction for @${username}`);
        console.log('='.repeat(50));
        
        const result = await extractor.extract(username);
        
        if (result.success) {
          console.log(`✅ Success for @${username}:`);
          console.log(`   Full Name: ${result.profile.fullName || 'Not found'}`);
          console.log(`   Followers: ${result.profile.followerCount.toLocaleString()}`);
          console.log(`   Bio: ${result.profile.bioText?.substring(0, 100) || 'Not found'}...`);
          console.log(`   Bio Link: ${result.profile.bioLink || 'Not found'}`);
          console.log(`   Links Found: ${result.links.length}`);
          
          if (result.links.length > 0) {
            console.log('   Links:');
            result.links.forEach((link, i) => {
              console.log(`     ${i + 1}. ${link.title} -> ${link.originalUrl}`);
            });
          }
          
          if (result.profile.warnings.length > 0) {
            console.log(`   Warnings: ${result.profile.warnings.join(', ')}`);
          }
        } else {
          console.log(`❌ Failed for @${username}: ${result.error}`);
        }
        
        // Add delay between requests to avoid rate limiting
        if (testUsernames.indexOf(username) < testUsernames.length - 1) {
          console.log('⏳ Waiting before next extraction...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }
      
    } catch (error) {
      console.error('Test failed:', error);
    } finally {
      await extractor.close();
    }
  }
  
  test();
}