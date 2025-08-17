import { LinktreeExtractor } from './extractors/linktree';
import { BeaconsExtractor } from './extractors/beacons';
import { InstagramExtractor } from './extractors/instagram';
import { LinkExpander } from './processors/linkExpander';
import { LinkType } from './extractors/types';
import { promises as fs } from 'fs';

export interface AthleteResult {
  athlete: {
    username: string;
    platform: 'instagram';
    followerCount: number;
    bioLink?: string;
    fullName?: string;
  };
  affiliates: Array<{
    title: string;
    originalUrl: string;
    expandedUrl: string;
    type: LinkType;
    isAffiliate: boolean;
    affiliateId?: string;
    brand?: string;
    position: number;
    source: string;
  }>;
  summary: {
    totalLinks: number;
    affiliateLinks: number;
    platforms: string[];
    brands: string[];
  };
  metadata: {
    processingTime: number;
    warnings: string[];
    extractedAt: string;
    version: string;
  };
}

export class AthleteOnboardingAutomation {
  private linktreeExtractor = new LinktreeExtractor();
  private beaconsExtractor = new BeaconsExtractor();
  private instagramExtractor = new InstagramExtractor();
  private linkExpander = new LinkExpander();
  
  async processAthlete(username: string, manualBioLink?: string): Promise<AthleteResult> {
    const startTime = Date.now();
    const warnings: string[] = [];
    
    console.log(`\n🚀 Processing athlete: @${username}`);
    console.log('=' .repeat(50));
    
    try {
      // Step 1: Try to get Instagram profile
      console.log('\n📱 Step 1: Getting Instagram profile...');
      let profile = await this.tryInstagramExtraction(username);
      
      if (!profile) {
        warnings.push('Instagram extraction failed, using minimal data');
        profile = {
          username,
          bioText: undefined,
          bioLink: manualBioLink,
          followerCount: 0,
          fullName: undefined,
          isVerified: undefined,
          extractedAt: new Date(),
          warnings: ['Instagram unavailable']
        };
      }
      
      // Step 2: Get bio link (Instagram or manual)
      console.log('\n🔗 Step 2: Finding bio link...');
      let bioLink = profile.bioLink || manualBioLink;
      
      if (!bioLink) {
        warnings.push('No bio link found - manual input required');
        console.log('⚠️ No bio link found. Please provide Linktree/Beacons URL manually.');
        
        // For now, we'll stop here, but in production could prompt user
        return this.createEmptyResult(username, profile, warnings, startTime);
      }
      
      console.log(`✅ Found bio link: ${bioLink}`);
      
      // Step 3: Extract links from bio link platform
      console.log('\n🎯 Step 3: Extracting affiliate links...');
      const affiliateLinks = await this.extractFromBioLink(bioLink);
      
      if (affiliateLinks.length === 0) {
        warnings.push('No affiliate links found on bio link platform');
      }
      
      // Step 4: Expand and analyze all links in parallel
      console.log('\n🔄 Step 4: Expanding and analyzing links...');
      const processedLinks = await this.processLinks(affiliateLinks);
      
      // Step 5: Generate final result
      console.log('\n📊 Step 5: Generating summary...');
      const result = await this.generateResult(username, profile, processedLinks, warnings, startTime);
      
      // Step 6: Save to file
      await this.saveResult(username, result);
      
      console.log('\n✅ Processing complete!');
      return result;
      
    } catch (error) {
      console.error('❌ Critical error during processing:', error);
      warnings.push(`Critical error: ${error}`);
      
      // Return partial result even on error
      return this.createEmptyResult(username, null, warnings, startTime);
    }
  }
  
  private async tryInstagramExtraction(username: string) {
    try {
      const profile = await this.instagramExtractor.getProfile(username);
      if (profile && profile.warnings.length === 0) {
        console.log('✅ Instagram extraction successful');
        return profile;
      } else if (profile) {
        console.log(`⚠️ Instagram extraction partial: ${profile.warnings.join(', ')}`);
        return profile;
      }
    } catch (error) {
      console.log('❌ Instagram extraction failed, continuing...');
    }
    
    return null;
  }
  
  private async extractFromBioLink(bioLink: string): Promise<any[]> {
    const linkLower = bioLink.toLowerCase();
    
    try {
      if (linkLower.includes('linktr.ee')) {
        console.log('🎯 Detected Linktree, extracting...');
        return await this.linktreeExtractor.extractLinks(bioLink);
      } else if (linkLower.includes('beacons.ai')) {
        console.log('🎯 Detected Beacons, extracting...');
        return await this.beaconsExtractor.extractLinks(bioLink);
      } else {
        console.log('⚠️ Unknown bio link platform, skipping extraction');
        return [];
      }
    } catch (error) {
      console.error('❌ Bio link extraction failed:', error);
      return [];
    }
  }
  
  private async processLinks(links: any[]): Promise<any[]> {
    if (links.length === 0) return [];
    
    console.log(`🔄 Processing ${links.length} links...`);
    
    // Expand URLs in parallel for speed
    const urls = links.map(link => link.originalUrl);
    const expandedUrls = await this.linkExpander.expandMultipleUrls(urls);
    
    // Process each link with expanded data
    const processedLinks = links.map(link => {
      const expandedUrl = expandedUrls[link.originalUrl] || link.originalUrl;
      const affiliateInfo = this.linkExpander.detectAffiliateParams(expandedUrl);
      const linkType = this.linkExpander.classifyLinkType(expandedUrl);
      const brand = this.linkExpander.extractBrandFromUrl(expandedUrl);
      
      return {
        title: link.title,
        originalUrl: link.originalUrl,
        expandedUrl,
        type: linkType,
        isAffiliate: affiliateInfo.isAffiliate,
        affiliateId: affiliateInfo.affiliateId,
        brand,
        position: link.position,
        source: link.source
      };
    });
    
    console.log(`✅ Processed ${processedLinks.length} links`);
    return processedLinks;
  }
  
  private async generateResult(
    username: string, 
    profile: any, 
    affiliates: any[], 
    warnings: string[], 
    startTime: number
  ): Promise<AthleteResult> {
    
    const affiliateLinks = affiliates.filter(link => link.isAffiliate);
    const brands = [...new Set(affiliates.map(link => link.brand).filter(Boolean))];
    const platforms = [...new Set(affiliates.map(link => link.source))];
    
    return {
      athlete: {
        username,
        platform: 'instagram',
        followerCount: profile?.followerCount || 0,
        bioLink: profile?.bioLink,
        fullName: profile?.fullName
      },
      affiliates,
      summary: {
        totalLinks: affiliates.length,
        affiliateLinks: affiliateLinks.length,
        platforms,
        brands
      },
      metadata: {
        processingTime: Date.now() - startTime,
        warnings,
        extractedAt: new Date().toISOString(),
        version: '0.1.0'
      }
    };
  }
  
  private createEmptyResult(username: string, profile: any, warnings: string[], startTime: number): AthleteResult {
    return {
      athlete: {
        username,
        platform: 'instagram',
        followerCount: profile?.followerCount || 0,
        bioLink: profile?.bioLink,
        fullName: profile?.fullName
      },
      affiliates: [],
      summary: {
        totalLinks: 0,
        affiliateLinks: 0,
        platforms: [],
        brands: []
      },
      metadata: {
        processingTime: Date.now() - startTime,
        warnings,
        extractedAt: new Date().toISOString(),
        version: '0.1.0'
      }
    };
  }
  
  private async saveResult(username: string, result: AthleteResult): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${username}_${timestamp}.json`;
      const filepath = `./output/${filename}`;
      
      await fs.writeFile(filepath, JSON.stringify(result, null, 2));
      console.log(`💾 Saved results to: ${filepath}`);
    } catch (error) {
      console.error('❌ Failed to save results:', error);
    }
  }
  
  async cleanup(): Promise<void> {
    await Promise.all([
      this.linktreeExtractor.close(),
      this.beaconsExtractor.close(),
      this.instagramExtractor.close()
    ]);
  }
}

// CLI Interface
async function main() {
  const username = process.argv[2];
  const manualBioLink = process.argv[3];
  
  if (!username) {
    console.log('Usage: npm run extract <username> [bioLink]');
    console.log('Examples:');
    console.log('  npm run extract cristiano');
    console.log('  npm run extract therock https://linktr.ee/therock');
    process.exit(1);
  }
  
  const automation = new AthleteOnboardingAutomation();
  
  try {
    console.log('🏃‍♂️ Athlete Onboarding Automation v0.1.0');
    
    const result = await automation.processAthlete(username, manualBioLink);
    
    // Print summary
    console.log('\n📊 EXTRACTION SUMMARY');
    console.log('═══════════════════════');
    console.log(`Athlete: @${result.athlete.username}`);
    console.log(`Followers: ${result.athlete.followerCount.toLocaleString()}`);
    console.log(`Total Links: ${result.summary.totalLinks}`);
    console.log(`Affiliate Links: ${result.summary.affiliateLinks}`);
    console.log(`Unique Brands: ${result.summary.brands.join(', ') || 'None'}`);
    console.log(`Processing Time: ${result.metadata.processingTime}ms`);
    
    if (result.metadata.warnings.length > 0) {
      console.log('\n⚠️ Warnings:');
      result.metadata.warnings.forEach(w => console.log(`  - ${w}`));
    }
    
    if (result.summary.totalLinks > 0) {
      console.log('\n🎯 Top Affiliate Links:');
      result.affiliates
        .filter(link => link.isAffiliate)
        .slice(0, 5)
        .forEach(link => {
          console.log(`  ${link.position}. ${link.title} (${link.brand || 'Unknown brand'})`);
        });
    }
    
  } catch (error) {
    console.error('❌ Automation failed:', error);
    process.exit(1);
  } finally {
    await automation.cleanup();
  }
}

if (require.main === module) {
  main();
}