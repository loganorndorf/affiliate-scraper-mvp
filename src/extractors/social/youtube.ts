import { google } from 'googleapis';
import { ExtractedLink } from '../types';

export interface YouTubeResult {
  platform: 'youtube';
  links: ExtractedLink[];
  metrics: {
    subscribers: number;
    totalViews: number;
  };
  profile: {
    channelName: string;
    description: string;
    customUrl?: string;
  };
  success: boolean;
  error?: string;
}

export class YouTubeExtractor {
  private youtube;
  
  constructor(apiKey: string) {
    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey
    });
  }
  
  async extract(query: string): Promise<YouTubeResult> {
    try {
      console.log(`📺 Extracting YouTube data for: ${query}`);
      
      // Step 1: Find the channel
      const channelId = await this.findChannelId(query);
      if (!channelId) {
        throw new Error(`Channel not found for query: ${query}`);
      }
      
      // Step 2: Get channel details
      const channelData = await this.getChannelDetails(channelId);
      
      // Step 3: Extract links from channel description
      const channelLinks = this.extractLinksFromText(
        channelData.description || '', 
        'youtube_channel'
      );
      
      // Step 4: Get recent video descriptions
      const videoLinks = await this.extractVideoDescriptionLinks(channelId);
      
      // Combine all links
      const allLinks = [...channelLinks, ...videoLinks];
      
      console.log(`✅ YouTube extraction complete: Found ${allLinks.length} links`);
      console.log(`   Channel: ${channelData.title}`);
      console.log(`   Subscribers: ${channelData.subscribers.toLocaleString()}`);
      console.log(`   Channel description links: ${channelLinks.length}`);
      console.log(`   Video description links: ${videoLinks.length}`);
      
      return {
        platform: 'youtube',
        links: allLinks,
        metrics: {
          subscribers: channelData.subscribers,
          totalViews: channelData.totalViews
        },
        profile: {
          channelName: channelData.title,
          description: channelData.description || '',
          customUrl: channelData.customUrl || undefined
        },
        success: true
      };
      
    } catch (error) {
      console.error(`❌ YouTube extraction failed for ${query}:`, error);
      
      return {
        platform: 'youtube',
        links: [],
        metrics: { subscribers: 0, totalViews: 0 },
        profile: { channelName: '', description: '' },
        success: false,
        error: String(error)
      };
    }
  }
  
  private async findChannelId(query: string): Promise<string | null> {
    try {
      console.log(`🔍 Searching for channel: ${query}`);
      
      const searchResponse = await this.youtube.search.list({
        part: ['snippet'],
        q: query,
        type: ['channel'],
        maxResults: 1
      });
      
      const channel = searchResponse.data.items?.[0];
      if (!channel?.snippet?.channelId) {
        throw new Error('No channel found');
      }
      
      console.log(`✅ Found channel: ${channel.snippet.title}`);
      return channel.snippet.channelId;
      
    } catch (error) {
      console.error('Channel search failed:', error);
      return null;
    }
  }
  
  private async getChannelDetails(channelId: string) {
    const response = await this.youtube.channels.list({
      part: ['snippet', 'statistics', 'brandingSettings'],
      id: [channelId]
    });
    
    const channel = response.data.items?.[0];
    if (!channel) {
      throw new Error('Channel details not found');
    }
    
    return {
      title: channel.snippet?.title || '',
      description: channel.snippet?.description || '',
      customUrl: channel.snippet?.customUrl,
      subscribers: parseInt(channel.statistics?.subscriberCount || '0'),
      totalViews: parseInt(channel.statistics?.viewCount || '0')
    };
  }
  
  private async extractVideoDescriptionLinks(channelId: string): Promise<ExtractedLink[]> {
    const links: ExtractedLink[] = [];
    
    try {
      console.log('🎬 Getting recent video descriptions...');
      
      // Get recent videos
      const videosResponse = await this.youtube.search.list({
        part: ['id'],
        channelId: channelId,
        order: 'date',
        maxResults: 5,
        type: ['video']
      });
      
      const videoIds = videosResponse.data.items
        ?.map(item => item.id?.videoId)
        .filter((id): id is string => Boolean(id)) || [];
      
      if (videoIds.length === 0) {
        console.log('No recent videos found');
        return links;
      }
      
      // Get video details in batch (efficient API usage)
      const videoDetailsResponse = await this.youtube.videos.list({
        part: ['snippet'],
        id: videoIds
      });
      
      // Extract links from each video description
      const videoItems = videoDetailsResponse.data.items || [];
      videoItems.forEach((video: any, index: number) => {
        const description = video.snippet?.description || '';
        const title = video.snippet?.title || '';
        
        if (description) {
          const videoLinks = this.extractLinksFromText(description, 'youtube_video', title);
          links.push(...videoLinks);
        }
      });
      
      console.log(`✅ Extracted links from ${videoIds.length} video descriptions`);
      
    } catch (error) {
      console.error('Video description extraction failed:', error);
    }
    
    return links;
  }
  
  private extractLinksFromText(text: string, source: string, context?: string): ExtractedLink[] {
    const links: ExtractedLink[] = [];
    
    // Find all URLs in the text
    const urlRegex = /https?:\/\/[^\s\]\)]+/g;
    const matches = text.match(urlRegex) || [];
    
    matches.forEach((url, index) => {
      // Clean up URL (remove trailing punctuation)
      const cleanUrl = url.replace(/[.,;!?]+$/, '');
      
      // Skip YouTube internal links
      if (this.isYouTubeInternalLink(cleanUrl)) {
        return;
      }
      
      // Try to extract product name from surrounding text
      const productName = this.extractProductNameFromContext(text, cleanUrl, context);
      
      links.push({
        title: productName || `${context || 'YouTube'} Link ${index + 1}`,
        originalUrl: cleanUrl,
        expandedUrl: '',
        type: 'unknown' as any,
        source: source as any,
        confidence: source === 'youtube_channel' ? 90 : 80
      });
    });
    
    return links;
  }
  
  private isYouTubeInternalLink(url: string): boolean {
    const internalPatterns = [
      'youtube.com/watch',
      'youtube.com/channel',
      'youtube.com/user',
      'youtube.com/c/',
      'youtu.be/',
      'youtube.com/shorts',
      'youtube.com/playlist'
    ];
    
    return internalPatterns.some(pattern => url.toLowerCase().includes(pattern));
  }
  
  private extractProductNameFromContext(text: string, url: string, context?: string): string {
    // Try to find product name mentioned near the URL
    const urlIndex = text.indexOf(url);
    if (urlIndex === -1) return context || 'YouTube Link';
    
    // Look at text before the URL (usually where product names are)
    const beforeUrl = text.substring(Math.max(0, urlIndex - 100), urlIndex).trim();
    const lines = beforeUrl.split('\n');
    const lastLine = lines[lines.length - 1]?.trim();
    
    // Common patterns for product mentions
    const productPatterns = [
      /([A-Z][^:\n]*(?:shoes?|shirt|gear|supplement|protein|energy|drink|equipment))/i,
      /([A-Z][^:\n]*(?:nike|adidas|under armour|gym|fitness))/i,
      /([A-Z][^:\n]*(?:code|discount|link|shop))/i
    ];
    
    for (const pattern of productPatterns) {
      const match = lastLine.match(pattern);
      if (match && match[1].length > 3 && match[1].length < 50) {
        return match[1].trim();
      }
    }
    
    // Fallback: use context or generic name
    return context || 'YouTube Link';
  }
}

// Test if run directly
if (require.main === module) {
  async function test() {
    // Note: You'll need to set your YouTube API key here
    const API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE';
    
    if (API_KEY === 'YOUR_API_KEY_HERE') {
      console.log('❌ Please set YOUTUBE_API_KEY environment variable');
      console.log('Get one at: https://console.cloud.google.com');
      console.log('Enable YouTube Data API v3');
      process.exit(1);
    }
    
    const extractor = new YouTubeExtractor(API_KEY);
    
    const testChannels = [
      'MrBeast',
      'MKBHD', 
      'Emma Chamberlain'
    ];
    
    try {
      for (const channel of testChannels) {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`Testing YouTube extraction for: ${channel}`);
        console.log('='.repeat(60));
        
        const result = await extractor.extract(channel);
        
        if (result.success) {
          console.log(`✅ Success for ${channel}:`);
          console.log(`   Channel: ${result.profile.channelName}`);
          console.log(`   Subscribers: ${result.metrics.subscribers.toLocaleString()}`);
          console.log(`   Total Views: ${result.metrics.totalViews.toLocaleString()}`);
          console.log(`   Links Found: ${result.links.length}`);
          
          if (result.links.length > 0) {
            console.log('\n   🔗 Top Links Found:');
            result.links.slice(0, 10).forEach((link, i) => {
              console.log(`     ${i + 1}. ${link.title}`);
              console.log(`        ${link.originalUrl}`);
            });
            
            if (result.links.length > 10) {
              console.log(`     ... and ${result.links.length - 10} more links`);
            }
          }
        } else {
          console.log(`❌ Failed for ${channel}: ${result.error}`);
        }
        
        // Add delay between API calls to be respectful
        if (testChannels.indexOf(channel) < testChannels.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
    } catch (error) {
      console.error('YouTube test failed:', error);
    }
  }
  
  test();
}