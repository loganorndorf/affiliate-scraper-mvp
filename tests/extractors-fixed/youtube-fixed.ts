/**
 * FIXED YouTube Extractor - No Shared State
 * 
 * Uses Google API so no browser state issues, but creates
 * fresh API client for each extraction for consistency.
 */

import { google } from 'googleapis';

export interface YouTubeProfile {
  username: string;
  channelName: string;
  description?: string;
  subscriberCount: number;
  isVerified?: boolean;
  channelKeywords?: string[];
  customUrl?: string;
  extractedAt: Date;
  warnings: string[];
}

export class FixedYouTubeExtractor {
  // ✅ NO SHARED STATE - fresh API client for each extraction
  
  async extract(query: string): Promise<YouTubeProfile | null> {
    const warnings: string[] = [];
    
    try {
      console.log(`📺 Extracting YouTube data for: ${query}`);
      
      // ✅ Create fresh API client for EACH extraction
      const API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_API_KEY_HERE';
      
      if (API_KEY === 'YOUR_API_KEY_HERE') {
        warnings.push('YouTube API key not configured');
        return {
          username: query,
          channelName: 'API Key Required',
          subscriberCount: 0,
          extractedAt: new Date(),
          warnings
        };
      }
      
      const youtube = google.youtube({
        version: 'v3',
        auth: API_KEY
      });
      
      // Find the channel
      const channelId = await this.findChannelId(youtube, query);
      if (!channelId) {
        throw new Error(`Channel not found for query: ${query}`);
      }
      
      // Get channel details
      const channelData = await this.getChannelDetails(youtube, channelId);
      
      return {
        username: query,
        channelName: channelData.title,
        description: channelData.description,
        subscriberCount: channelData.subscribers,
        isVerified: channelData.isVerified,
        customUrl: channelData.customUrl,
        extractedAt: new Date(),
        warnings
      };
      
    } catch (error) {
      console.error(`❌ YouTube extraction failed for ${query}:`, error);
      return null;
    }
  }
  
  private async findChannelId(youtube: any, query: string): Promise<string | null> {
    try {
      console.log(`🔍 Searching for channel: ${query}`);
      
      const searchResponse = await youtube.search.list({
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
  
  private async getChannelDetails(youtube: any, channelId: string) {
    const response = await youtube.channels.list({
      part: ['snippet', 'statistics', 'status'],
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
      isVerified: channel.status?.longUploadsStatus === 'allowed' // Rough verification check
    };
  }
}