/**
 * FIXED Twitter Extractor - No Shared State
 * 
 * Creates fresh browser context for each extraction to prevent
 * profile data reuse and caching issues.
 */

import { chromium, Browser, Page } from 'playwright';

export interface TwitterProfile {
  username: string;
  fullName?: string;
  bioText?: string;
  website?: string;
  followerCount: number;
  isVerified?: boolean;
  extractedAt: Date;
  warnings: string[];
}

export class FixedTwitterExtractor {
  // ✅ NO SHARED STATE - fresh browser for each extraction
  private static readonly NITTER_INSTANCES = [
    'nitter.net',
    'nitter.it',
    'nitter.42l.fr',
    'nitter.fdn.fr'
  ];
  
  async extract(username: string): Promise<TwitterProfile | null> {
    // ✅ Create fresh browser for EACH extraction
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--ignore-certificate-errors'
      ]
    });
    
    let page: Page | null = null;
    const warnings: string[] = [];
    
    try {
      console.log(`🐦 Extracting Twitter profile: @${username}`);
      
      // ✅ Fresh page with no cached data
      page = await browser.newPage();
      
      // Clear any existing data
      await page.context().clearCookies();
      
      // Try multiple Nitter instances
      let profileData = null;
      let workingInstance = null;
      
      for (const instance of FixedTwitterExtractor.NITTER_INSTANCES) {
        try {
          console.log(`🔍 Trying Nitter instance: ${instance}`);
          profileData = await this.extractFromNitter(page, username, instance);
          workingInstance = instance;
          break;
        } catch (error) {
          console.log(`⚠️ ${instance} failed, trying next...`);
          warnings.push(`${instance} unavailable`);
          continue;
        }
      }
      
      if (!profileData) {
        throw new Error('All Nitter instances failed');
      }
      
      console.log(`✅ Successfully used: ${workingInstance}`);
      
      return {
        username,
        fullName: profileData.fullName,
        bioText: profileData.bioText,
        website: profileData.website ? this.cleanNitterUrl(profileData.website) : undefined,
        followerCount: profileData.followerCount || 0,
        isVerified: profileData.isVerified,
        extractedAt: new Date(),
        warnings
      };
      
    } catch (error) {
      console.error(`❌ Twitter extraction failed for @${username}:`, error);
      return null;
    } finally {
      // ✅ CRITICAL: Always close browser and page
      if (page) await page.close();
      await browser.close();
    }
  }
  
  private async extractFromNitter(page: Page, username: string, instance: string) {
    const url = `https://${instance}/${username}`;
    
    await page.goto(url, { 
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    // Wait for profile to load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Check if profile exists
    const profileExists = await page.evaluate(() => {
      return !document.body.textContent?.includes('User not found') &&
             !document.body.textContent?.includes('This account doesn\'t exist');
    });
    
    if (!profileExists) {
      throw new Error('Twitter account not found');
    }
    
    // Extract profile data
    return await page.evaluate(() => {
      // Get bio text
      const getBioText = (): string | undefined => {
        const bioElement = document.querySelector('.profile-bio');
        return bioElement?.textContent?.trim() || undefined;
      };
      
      // Get website
      const getWebsite = (): string | undefined => {
        const websiteElement = document.querySelector('.profile-website a');
        return websiteElement ? (websiteElement as HTMLAnchorElement).href : undefined;
      };
      
      // Get full name
      const getFullName = (): string | undefined => {
        const nameElement = document.querySelector('.profile-fullname');
        return nameElement?.textContent?.trim() || undefined;
      };
      
      // Get follower count
      const getFollowerCount = (): number => {
        const statElements = document.querySelectorAll('.profile-stat-num');
        
        // Followers is typically the second stat (following, followers, likes)
        if (statElements.length >= 2) {
          const followerText = statElements[1]?.textContent?.trim() || '0';
          return parseFollowerCount(followerText);
        }
        
        return 0;
      };
      
      // Check if verified
      const getIsVerified = (): boolean => {
        return document.querySelector('.profile-verified') !== null;
      };
      
      // Parse follower count with K/M notation
      function parseFollowerCount(text: string): number {
        const cleanText = text.replace(/,/g, '');
        const match = cleanText.match(/(\d+(?:\.\d+)?)\s*([KMB]?)/i);
        
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
      
      return {
        bioText: getBioText(),
        website: getWebsite(),
        fullName: getFullName(),
        followerCount: getFollowerCount(),
        isVerified: getIsVerified()
      };
    });
  }
  
  private cleanNitterUrl(nitterUrl: string): string {
    // Nitter sometimes wraps URLs, extract the original
    try {
      const url = new URL(nitterUrl);
      
      // If it's a Nitter redirect, get the original URL
      if (url.hostname.includes('nitter')) {
        const originalUrl = url.searchParams.get('url') || url.searchParams.get('q');
        if (originalUrl) {
          return originalUrl;
        }
      }
      
      return nitterUrl;
    } catch {
      return nitterUrl;
    }
  }
}