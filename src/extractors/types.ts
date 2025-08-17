export interface AthleteProfile {
  username: string;
  platform: 'instagram' | 'tiktok';
  fullName?: string;
  bio?: string;
  followerCount: number;
  followingCount?: number;
  isVerified: boolean;
  profilePicture?: string;
  bioLink?: string;
  extractedAt: Date;
}

export interface ExtractedLink {
  title: string;
  originalUrl: string;
  expandedUrl: string;
  type: LinkType;
  metadata?: LinkMetadata;
  source: 'bio' | 'linktree' | 'beacons' | 'post' | 'story';
  confidence: number;
}

export enum LinkType {
  AMAZON = 'amazon',
  SHOPIFY = 'shopify',
  AFFILIATE_NETWORK = 'affiliate_network',
  BRAND_DIRECT = 'brand_direct',
  SOCIAL_MEDIA = 'social_media',
  UNKNOWN = 'unknown'
}

export interface LinkMetadata {
  productName?: string;
  brand?: string;
  price?: number;
  currency?: string;
  discountCode?: string;
  affiliateId?: string;
  imageUrl?: string;
  asin?: string;
  shopifyProductId?: string;
}

export interface PostData {
  id: string;
  caption: string;
  timestamp: Date;
  mentions: string[];
  hashtags: string[];
  urls: string[];
}

export interface OnboardingResult {
  athlete: AthleteProfile;
  affiliates: ExtractedLink[];
  discountCodes: DiscountCode[];
  summary: Summary;
  metadata: Metadata;
}

export interface DiscountCode {
  code: string;
  brand?: string;
  description?: string;
  source: string;
  confidence: number;
}

export interface Summary {
  totalLinks: number;
  fromBioLinks: number;
  fromPosts: number;
  uniqueBrands: string[];
  linkPlatforms: Record<LinkType, number>;
  activeCodes: string[];
}

export interface Metadata {
  extractedAt: Date;
  version: string;
  processingTime: number;
  warnings: string[];
  errors?: string[];
}