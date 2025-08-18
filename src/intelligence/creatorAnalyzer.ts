import { DedupedLink } from './deduplicator';
import { PlatformData, UniversalCreatorProfile } from '../orchestrators/universalDiscovery';
import { ExtractedLink } from '../extractors/types';

export type Priority = 'HIGH' | 'MEDIUM' | 'LOW';
export type CreatorType = 'macro_influencer' | 'micro_influencer' | 'celebrity' | 'athlete' | 'entrepreneur' | 'content_creator';
export type LinkAggregatorType = 'linktree' | 'beacons' | 'bio' | 'stan_store' | 'koji' | 'allmylinks' | 'carrd' | 'milkshake' | 'later' | 'taplink' | 'linkpop' | 'shorby' | 'lnk_bio' | 'campsite' | 'flowpage';

export interface PlatformPresence {
  platform: string;
  verified: boolean;
  followers: number;
  engagement: number;
  contentFrequency: 'high' | 'medium' | 'low';
  primaryAudience: string;
  recentActivity: boolean;
  linkSharing: 'frequent' | 'occasional' | 'rare' | 'none';
}

export interface LinkAggregatorAnalysis {
  currentAggregators: LinkAggregatorType[];
  aggregatorUrls: string[];
  linkCount: number;
  organizationLevel: 'high' | 'medium' | 'low';
  updateFrequency: 'daily' | 'weekly' | 'monthly' | 'rarely';
  competitorAdvantages: string[];
  migrationDifficulty: 'easy' | 'medium' | 'hard';
}

export interface ValueEstimation {
  monthlyReach: number;
  estimatedClickthrough: number;
  conversionPotential: number;
  affiliateRevenue: number;
  brandValue: number;
  totalValue: number;
  valueFactors: string[];
  riskFactors: string[];
}

export interface CompetitiveIntelligence {
  directCompetitors: string[];
  competitorFeatures: string[];
  uniqueSellingProps: string[];
  marketPosition: 'leader' | 'challenger' | 'follower' | 'niche';
  switchingBarriers: string[];
  competitiveAdvantages: string[];
}

export interface ContentStrategy {
  primaryContent: string[];
  brandPartnerships: string[];
  monetizationMethods: string[];
  contentPillars: string[];
  audienceDemographics: string;
  contentConsistency: 'high' | 'medium' | 'low';
}

export interface ActionableInsights {
  immediateActions: string[];
  shortTermOpportunities: string[];
  longTermStrategy: string[];
  personalizedPitch: string;
  expectedOutcomes: string[];
  successMetrics: string[];
}

export interface CreatorIntelligenceReport {
  creatorId: string;
  creatorType: CreatorType;
  overallScore: number;
  
  platformPresence: PlatformPresence[];
  linkAggregatorAnalysis: LinkAggregatorAnalysis;
  valueEstimation: ValueEstimation;
  competitiveIntelligence: CompetitiveIntelligence;
  contentStrategy: ContentStrategy;
  actionableInsights: ActionableInsights;
  
  metadata: {
    analyzedAt: Date;
    dataQuality: 'high' | 'medium' | 'low';
    confidenceLevel: number;
    recommendationStrength: 'strong' | 'moderate' | 'weak';
  };
}

export class CreatorIntelligenceAnalyzer {
  private static readonly FOLLOWER_TIERS = {
    MACRO: 1000000,      // 1M+ followers
    MICRO: 100000,       // 100K+ followers
    NANO: 10000,         // 10K+ followers
    EMERGING: 1000       // 1K+ followers
  };

  private static readonly LINK_AGGREGATORS: Record<string, LinkAggregatorType> = {
    'linktr.ee': 'linktree',
    'beacons.ai': 'beacons',
    'bio.fm': 'bio',
    'stan.store': 'stan_store',
    'koji.to': 'koji',
    'allmylinks.com': 'allmylinks',
    'carrd.co': 'carrd',
    'milkshake.app': 'milkshake',
    'later.com': 'later',
    'taplink.at': 'taplink',
    'linkpop.com': 'linkpop',
    'shorby.com': 'shorby',
    'lnk.bio': 'lnk_bio',
    'campsite.bio': 'campsite',
    'flowpage.com': 'flowpage'
  };

  analyze(profile: UniversalCreatorProfile, dedupedLinks: DedupedLink[]): CreatorIntelligenceReport {
    console.log(`🧠 Analyzing creator intelligence for: ${profile.searchQuery}`);
    
    const platformPresence = this.analyzePlatformPresence(profile.platforms);
    const linkAggregatorAnalysis = this.analyzeLinkAggregators(dedupedLinks, profile.platforms);
    const valueEstimation = this.estimateValue(profile, dedupedLinks, platformPresence);
    const competitiveIntelligence = this.analyzeCompetitive(linkAggregatorAnalysis, profile);
    const contentStrategy = this.analyzeContentStrategy(profile, dedupedLinks);
    const actionableInsights = this.generateActionableInsights(
      profile, platformPresence, linkAggregatorAnalysis, valueEstimation, competitiveIntelligence
    );

    const creatorType = this.classifyCreator(profile, platformPresence);
    const overallScore = this.calculateOverallScore(platformPresence, linkAggregatorAnalysis, valueEstimation);
    console.log(`✅ Intelligence analysis complete - Score: ${overallScore}`);

    return {
      creatorId: profile.searchQuery,
      creatorType,
      overallScore,
      platformPresence,
      linkAggregatorAnalysis,
      valueEstimation,
      competitiveIntelligence,
      contentStrategy,
      actionableInsights,
      metadata: {
        analyzedAt: new Date(),
        dataQuality: this.assessDataQuality(profile),
        confidenceLevel: this.calculateConfidenceLevel(profile, platformPresence),
        recommendationStrength: this.assessRecommendationStrength(overallScore, linkAggregatorAnalysis)
      }
    };
  }

  private analyzePlatformPresence(platforms: { [platform: string]: PlatformData }): PlatformPresence[] {
    const presence: PlatformPresence[] = [];

    Object.entries(platforms).forEach(([platformName, data]) => {
      if (!data.success) return;

      const followers = data.metrics?.followers || 0;
      const engagement = data.metrics?.engagement || 0;

      presence.push({
        platform: platformName,
        verified: this.detectVerification(data),
        followers,
        engagement,
        contentFrequency: this.assessContentFrequency(followers, engagement),
        primaryAudience: this.inferAudience(platformName, followers),
        recentActivity: this.assessRecentActivity(data),
        linkSharing: this.assessLinkSharing(data.links.length, followers)
      });
    });

    return presence.sort((a, b) => b.followers - a.followers);
  }

  private analyzeLinkAggregators(links: DedupedLink[], platforms: { [platform: string]: PlatformData }): LinkAggregatorAnalysis {
    const aggregators = new Set<LinkAggregatorType>();
    const aggregatorUrls: string[] = [];
    let totalLinks = 0;

    // Detect aggregators from links
    links.forEach(link => {
      const domain = this.extractDomain(link.url);
      if (domain && CreatorIntelligenceAnalyzer.LINK_AGGREGATORS[domain]) {
        aggregators.add(CreatorIntelligenceAnalyzer.LINK_AGGREGATORS[domain]);
        aggregatorUrls.push(link.url);
      }
    });

    // Count links from successful aggregator platforms
    Object.entries(platforms).forEach(([platform, data]) => {
      if (data.success && (platform === 'linktree' || platform === 'beacons')) {
        totalLinks += data.links.length;
        if (data.links.length > 0) {
          aggregators.add(platform as LinkAggregatorType);
        }
      }
    });

    const organizationLevel = this.assessOrganizationLevel(totalLinks, Array.from(aggregators));
    const updateFrequency = this.inferUpdateFrequency(links);
    const competitorAdvantages = this.identifyCompetitorAdvantages(Array.from(aggregators));
    const migrationDifficulty = this.assessMigrationDifficulty(totalLinks, Array.from(aggregators));

    return {
      currentAggregators: Array.from(aggregators),
      aggregatorUrls,
      linkCount: totalLinks,
      organizationLevel,
      updateFrequency,
      competitorAdvantages,
      migrationDifficulty
    };
  }

  private estimateValue(profile: UniversalCreatorProfile, links: DedupedLink[], presence: PlatformPresence[]): ValueEstimation {
    const totalFollowers = presence.reduce((sum, p) => sum + p.followers, 0);
    const affiliateLinks = links.filter(link => link.isAffiliate);
    
    // Calculate monthly reach (assuming 10% engagement rate)
    const monthlyReach = Math.round(totalFollowers * 0.1);
    
    // Estimate clickthrough (1-3% for creators)
    const estimatedClickthrough = Math.round(monthlyReach * 0.02);
    
    // Conversion potential based on link quality and audience
    const conversionRate = this.calculateConversionRate(links, presence);
    const conversionPotential = Math.round(estimatedClickthrough * conversionRate);
    
    // Affiliate revenue estimation
    const avgOrderValue = this.estimateAverageOrderValue(links);
    const avgCommission = 0.05; // 5% average commission
    const affiliateRevenue = Math.round(conversionPotential * avgOrderValue * avgCommission);
    
    // Brand value (CPM-based)
    const cpmRate = this.calculateCPMRate(presence);
    const brandValue = Math.round((monthlyReach / 1000) * cpmRate);
    
    const totalValue = affiliateRevenue + brandValue;

    return {
      monthlyReach,
      estimatedClickthrough,
      conversionPotential,
      affiliateRevenue,
      brandValue,
      totalValue,
      valueFactors: this.identifyValueFactors(presence, links),
      riskFactors: this.identifyRiskFactors(presence, links)
    };
  }

  private analyzeCompetitive(linkAnalysis: LinkAggregatorAnalysis, profile: UniversalCreatorProfile): CompetitiveIntelligence {
    const competitors = linkAnalysis.currentAggregators;
    
    return {
      directCompetitors: competitors.map(c => this.getCompetitorName(c)),
      competitorFeatures: this.getCompetitorFeatures(competitors),
      uniqueSellingProps: this.getGenericUSPs(competitors),
      marketPosition: this.assessMarketPosition(profile.summary.totalReach),
      switchingBarriers: this.identifySwitchingBarriers(linkAnalysis),
      competitiveAdvantages: this.identifyGenericAdvantages(competitors, profile)
    };
  }

  private analyzeContentStrategy(profile: UniversalCreatorProfile, links: DedupedLink[]): ContentStrategy {
    const brands = this.extractBrands(links);
    const contentTypes = this.inferContentTypes(profile.platforms);
    
    return {
      primaryContent: contentTypes,
      brandPartnerships: brands,
      monetizationMethods: this.identifyMonetizationMethods(links),
      contentPillars: this.inferContentPillars(brands, contentTypes),
      audienceDemographics: this.inferAudienceDemographics(profile.platforms),
      contentConsistency: this.assessContentConsistency(profile.platforms)
    };
  }

  private generateActionableInsights(
    profile: UniversalCreatorProfile,
    presence: PlatformPresence[],
    linkAnalysis: LinkAggregatorAnalysis,
    value: ValueEstimation,
    competitive: CompetitiveIntelligence
  ): ActionableInsights {
    const immediateActions: string[] = [];
    const shortTermOpportunities: string[] = [];
    const longTermStrategy: string[] = [];

    // Immediate actions based on current state
    if (linkAnalysis.currentAggregators.includes('linktree')) {
      immediateActions.push("Consider exploring advanced link analytics platforms");
      immediateActions.push("Emphasize zero transaction fees vs Linktree's premium costs");
    }

    if (linkAnalysis.linkCount >= 10) {
      immediateActions.push("Consider link organization optimization strategies");
      shortTermOpportunities.push("Create custom branded landing page showcasing their partnerships");
    }

    if (value.totalValue > 10000) {
      immediateActions.push("Analyze potential revenue optimization opportunities");
      shortTermOpportunities.push("Offer white-glove migration service from current aggregator");
    }

    // Short-term opportunities
    const primaryPlatform = presence[0]?.platform;
    if (primaryPlatform === 'tiktok') {
      shortTermOpportunities.push("Optimize bio links for platform-specific restrictions");
    }
    if (primaryPlatform === 'youtube') {
      shortTermOpportunities.push("Improve YouTube description link management");
    }

    // Long-term strategy
    if (presence.length >= 4) {
      longTermStrategy.push("Develop centralized multi-platform link strategy");
      longTermStrategy.push("Develop cross-platform analytics dashboard for unified insights");
    }

    const personalizedPitch = this.generatePersonalizedPitch(profile, presence, linkAnalysis, value);

    return {
      immediateActions,
      shortTermOpportunities,
      longTermStrategy,
      personalizedPitch,
      expectedOutcomes: this.defineExpectedOutcomes(value, linkAnalysis),
      successMetrics: this.defineSuccessMetrics(value, presence)
    };
  }

  private classifyCreator(profile: UniversalCreatorProfile, presence: PlatformPresence[]): CreatorType {
    const totalFollowers = presence.reduce((sum, p) => sum + p.followers, 0);
    const primaryPlatform = presence[0]?.platform || '';

    if (totalFollowers > CreatorIntelligenceAnalyzer.FOLLOWER_TIERS.MACRO) {
      // Look for celebrity/athlete indicators
      if (profile.searchQuery.toLowerCase().includes('rock') || 
          presence.some(p => p.platform === 'instagram' && p.followers > 50000000)) {
        return 'celebrity';
      }
      return 'macro_influencer';
    } else if (totalFollowers > CreatorIntelligenceAnalyzer.FOLLOWER_TIERS.MICRO) {
      if (primaryPlatform === 'youtube' || primaryPlatform === 'tiktok') {
        return 'content_creator';
      }
      return 'micro_influencer';
    } else {
      return 'content_creator';
    }
  }

  private calculateOverallScore(
    presence: PlatformPresence[],
    linkAnalysis: LinkAggregatorAnalysis,
    value: ValueEstimation
  ): number {
    let score = 0;

    // Platform presence score (40% weight)
    const platformScore = this.calculatePlatformScore(presence);
    score += platformScore * 0.4;

    // Link organization score (30% weight)
    const linkScore = this.calculateLinkScore(linkAnalysis);
    score += linkScore * 0.3;

    // Value potential score (30% weight)
    const valueScore = this.calculateValueScore(value);
    score += valueScore * 0.3;

    return Math.round(score);
  }


  private calculatePlatformScore(presence: PlatformPresence[]): number {
    if (presence.length === 0) return 0;

    let score = 0;
    const weights = { followers: 0.4, engagement: 0.3, diversity: 0.2, activity: 0.1 };

    // Follower score (normalized to 100)
    const maxFollowers = Math.max(...presence.map(p => p.followers));
    const followerScore = Math.min((maxFollowers / 10000000) * 100, 100);
    score += followerScore * weights.followers;

    // Engagement score
    const avgEngagement = presence.reduce((sum, p) => sum + p.engagement, 0) / presence.length;
    const engagementScore = Math.min((avgEngagement / 1000000) * 100, 100);
    score += engagementScore * weights.engagement;

    // Platform diversity score
    const diversityScore = Math.min((presence.length / 6) * 100, 100);
    score += diversityScore * weights.diversity;

    // Recent activity score
    const activeCount = presence.filter(p => p.recentActivity).length;
    const activityScore = (activeCount / presence.length) * 100;
    score += activityScore * weights.activity;

    return Math.round(score);
  }

  private calculateLinkScore(analysis: LinkAggregatorAnalysis): number {
    let score = 0;

    // Link count score (0-40 points)
    score += Math.min(analysis.linkCount * 2, 40);

    // Organization level (0-30 points)
    const orgScore = { high: 30, medium: 20, low: 10 }[analysis.organizationLevel];
    score += orgScore;

    // Using competitor bonus (0-30 points)
    if (analysis.currentAggregators.length > 0) {
      score += 30;
    }

    return Math.min(score, 100);
  }

  private calculateValueScore(value: ValueEstimation): number {
    // Normalize total value to 0-100 scale
    const valueScore = Math.min((value.totalValue / 50000) * 100, 100);
    
    // Boost for affiliate revenue
    const affiliateBoost = Math.min((value.affiliateRevenue / 10000) * 20, 20);
    
    // Brand partnership boost
    const brandBoost = Math.min((value.brandValue / 5000) * 15, 15);

    return Math.min(valueScore + affiliateBoost + brandBoost, 100);
  }

  // Helper methods for analysis
  private detectVerification(data: PlatformData): boolean {
    // Simple heuristic - large follower counts often indicate verification
    return (data.metrics?.followers || 0) > 1000000;
  }

  private assessContentFrequency(followers: number, engagement: number): 'high' | 'medium' | 'low' {
    const ratio = engagement / Math.max(followers, 1);
    if (ratio > 0.1) return 'high';
    if (ratio > 0.05) return 'medium';
    return 'low';
  }

  private inferAudience(platform: string, followers: number): string {
    if (followers > 10000000) return 'Global mass market';
    if (followers > 1000000) return 'Mainstream audience';
    if (followers > 100000) return 'Engaged niche community';
    return 'Small engaged following';
  }

  private assessRecentActivity(data: PlatformData): boolean {
    // Heuristic: if we successfully extracted data, assume recent activity
    return data.success && data.links.length > 0;
  }

  private assessLinkSharing(linkCount: number, followers: number): 'frequent' | 'occasional' | 'rare' | 'none' {
    if (linkCount === 0) return 'none';
    if (linkCount >= 10) return 'frequent';
    if (linkCount >= 5) return 'occasional';
    return 'rare';
  }

  private extractDomain(url: string): string | null {
    try {
      return new URL(url).hostname.toLowerCase();
    } catch {
      return null;
    }
  }

  private assessOrganizationLevel(linkCount: number, aggregators: LinkAggregatorType[]): 'high' | 'medium' | 'low' {
    if (aggregators.length > 0 && linkCount >= 10) return 'high';
    if (aggregators.length > 0 || linkCount >= 5) return 'medium';
    return 'low';
  }

  private inferUpdateFrequency(links: DedupedLink[]): 'daily' | 'weekly' | 'monthly' | 'rarely' {
    // Heuristic based on link recency and variety
    const recentLinks = links.filter(link => {
      const daysSince = (Date.now() - link.lastSeen.getTime()) / (1000 * 60 * 60 * 24);
      return daysSince < 7;
    });

    if (recentLinks.length > links.length * 0.5) return 'weekly';
    if (recentLinks.length > links.length * 0.3) return 'monthly';
    return 'rarely';
  }

  private identifyCompetitorAdvantages(aggregators: LinkAggregatorType[]): string[] {
    const advantages: string[] = [];
    
    if (aggregators.includes('linktree')) {
      advantages.push('Established brand recognition');
      advantages.push('Large user base and network effects');
      advantages.push('Familiar user interface');
    }
    
    if (aggregators.includes('beacons')) {
      advantages.push('Creator-focused features');
      advantages.push('Email collection capabilities');
      advantages.push('Store integration');
    }

    return advantages;
  }

  private assessMigrationDifficulty(linkCount: number, aggregators: LinkAggregatorType[]): 'easy' | 'medium' | 'hard' {
    if (linkCount <= 5 && aggregators.length <= 1) return 'easy';
    if (linkCount <= 15 && aggregators.length <= 2) return 'medium';
    return 'hard';
  }

  private calculateConversionRate(links: DedupedLink[], presence: PlatformPresence[]): number {
    // Base conversion rate
    let rate = 0.02; // 2% base

    // Boost for affiliate links (higher intent)
    const affiliateRatio = links.filter(l => l.isAffiliate).length / Math.max(links.length, 1);
    rate += affiliateRatio * 0.01;

    // Boost for engaged audiences
    const avgEngagement = presence.reduce((sum, p) => sum + p.engagement, 0) / Math.max(presence.length, 1);
    if (avgEngagement > 100000) rate += 0.005;

    return Math.min(rate, 0.05); // Cap at 5%
  }

  private estimateAverageOrderValue(links: DedupedLink[]): number {
    const brands = links.map(l => l.brand).filter(Boolean);
    
    // Simple heuristic based on brand types
    let avgValue = 50; // Default
    
    if (brands.some(b => b?.toLowerCase().includes('fashion') || b?.toLowerCase().includes('apparel'))) {
      avgValue = 80;
    }
    if (brands.some(b => b?.toLowerCase().includes('supplement') || b?.toLowerCase().includes('nutrition'))) {
      avgValue = 45;
    }
    if (brands.some(b => b?.toLowerCase().includes('tech') || b?.toLowerCase().includes('electronics'))) {
      avgValue = 150;
    }

    return avgValue;
  }

  private calculateCPMRate(presence: PlatformPresence[]): number {
    const primaryPlatform = presence[0];
    if (!primaryPlatform) return 5;

    // CPM rates vary by platform and audience size
    const baseCPM = {
      'youtube': 8,
      'instagram': 6,
      'tiktok': 4,
      'twitter': 3
    }[primaryPlatform.platform] || 5;

    // Adjust for audience size (premium for larger audiences)
    if (primaryPlatform.followers > 10000000) return baseCPM * 1.5;
    if (primaryPlatform.followers > 1000000) return baseCPM * 1.2;
    
    return baseCPM;
  }

  private identifyValueFactors(presence: PlatformPresence[], links: DedupedLink[]): string[] {
    const factors: string[] = [];

    const totalFollowers = presence.reduce((sum, p) => sum + p.followers, 0);
    if (totalFollowers > 5000000) factors.push('Large established audience');
    if (totalFollowers > 1000000) factors.push('Significant reach and influence');

    const affiliateCount = links.filter(l => l.isAffiliate).length;
    if (affiliateCount >= 5) factors.push('Active affiliate marketing');
    if (affiliateCount >= 10) factors.push('Sophisticated monetization strategy');

    const platformCount = presence.length;
    if (platformCount >= 4) factors.push('Multi-platform presence');
    if (platformCount >= 6) factors.push('Comprehensive social media strategy');

    return factors;
  }

  private identifyRiskFactors(presence: PlatformPresence[], links: DedupedLink[]): string[] {
    const factors: string[] = [];

    // Platform dependency risk
    const primaryFollowers = presence[0]?.followers || 0;
    const totalFollowers = presence.reduce((sum, p) => sum + p.followers, 0);
    if (primaryFollowers / totalFollowers > 0.8) {
      factors.push('High dependency on single platform');
    }

    // Link quality risk
    const lowConfidenceLinks = links.filter(l => l.confidence < 70).length;
    if (lowConfidenceLinks > links.length * 0.3) {
      factors.push('Some links may be outdated or temporary');
    }

    // Engagement risk
    const lowEngagement = presence.filter(p => p.contentFrequency === 'low').length;
    if (lowEngagement > presence.length * 0.5) {
      factors.push('Inconsistent content posting frequency');
    }

    return factors;
  }

  private getCompetitorName(aggregator: LinkAggregatorType): string {
    const names: Record<LinkAggregatorType, string> = {
      'linktree': 'Linktree',
      'beacons': 'Beacons.ai',
      'bio': 'Bio.fm',
      'stan_store': 'Stan Store',
      'koji': 'Koji',
      'allmylinks': 'AllMyLinks',
      'carrd': 'Carrd',
      'milkshake': 'Milkshake',
      'later': 'Later Linkin.bio',
      'taplink': 'Taplink',
      'linkpop': 'LinkPop',
      'shorby': 'Shorby',
      'lnk_bio': 'Lnk.Bio',
      'campsite': 'Campsite',
      'flowpage': 'FlowPage'
    };
    return names[aggregator] || aggregator;
  }

  private getCompetitorFeatures(competitors: LinkAggregatorType[]): string[] {
    const features: string[] = [];
    
    if (competitors.includes('linktree')) {
      features.push('Basic link aggregation', 'Simple analytics', 'Theme customization');
    }
    if (competitors.includes('beacons')) {
      features.push('Email collection', 'Store integration', 'Media kit generation');
    }

    return [...new Set(features)]; // Remove duplicates
  }

  private getGenericUSPs(competitors: LinkAggregatorType[]): string[] {
    return [
      'Advanced link analytics',
      'Multi-platform integration',
      'Custom branding options',
      'Performance optimization',
      'Creator-focused tools'
    ];
  }

  private assessMarketPosition(totalReach: number): 'leader' | 'challenger' | 'follower' | 'niche' {
    if (totalReach > 50000000) return 'leader';
    if (totalReach > 10000000) return 'challenger';
    if (totalReach > 1000000) return 'follower';
    return 'niche';
  }

  private identifySwitchingBarriers(analysis: LinkAggregatorAnalysis): string[] {
    const barriers: string[] = [];

    if (analysis.linkCount > 20) {
      barriers.push('Large number of existing links to migrate');
    }
    if (analysis.migrationDifficulty === 'hard') {
      barriers.push('Complex current setup requiring careful migration');
    }
    if (analysis.currentAggregators.length > 1) {
      barriers.push('Multiple platforms currently in use');
    }

    return barriers;
  }

  private identifyGenericAdvantages(competitors: LinkAggregatorType[], profile: UniversalCreatorProfile): string[] {
    const advantages: string[] = [];

    if (competitors.includes('linktree')) {
      advantages.push('Alternative to subscription models');
      advantages.push('Enhanced customization options');
    }

    if (profile.summary.totalReach > 1000000) {
      advantages.push('Advanced analytics for large creators');
      advantages.push('Scalable link management');
    }

    advantages.push('Creator-focused design');
    advantages.push('Performance optimization tools');

    return advantages;
  }

  private extractBrands(links: DedupedLink[]): string[] {
    const brands = links
      .map(link => link.brand)
      .filter(Boolean)
      .filter((brand, index, arr) => arr.indexOf(brand) === index); // Remove duplicates
    
    return brands as string[];
  }

  private inferContentTypes(platforms: { [platform: string]: PlatformData }): string[] {
    const types: string[] = [];

    if (platforms.youtube?.success) types.push('Long-form video content');
    if (platforms.tiktok?.success) types.push('Short-form viral content');
    if (platforms.instagram?.success) types.push('Visual storytelling');
    if (platforms.twitter?.success) types.push('Thought leadership and updates');

    return types;
  }

  private identifyMonetizationMethods(links: DedupedLink[]): string[] {
    const methods: string[] = [];

    const affiliateCount = links.filter(l => l.isAffiliate).length;
    if (affiliateCount > 0) methods.push('Affiliate marketing');

    const brandCount = this.extractBrands(links).length;
    if (brandCount >= 3) methods.push('Brand partnerships');

    const directBrands = links.filter(l => l.type === 'brand_direct').length;
    if (directBrands >= 2) methods.push('Product sales');

    return methods;
  }

  private inferContentPillars(brands: string[], contentTypes: string[]): string[] {
    const pillars: string[] = [];

    // Infer from brands
    if (brands.some(b => b.toLowerCase().includes('fitness') || b.toLowerCase().includes('project rock'))) {
      pillars.push('Fitness and wellness');
    }
    if (brands.some(b => b.toLowerCase().includes('energy') || b.toLowerCase().includes('supplement'))) {
      pillars.push('Health and nutrition');
    }

    // Infer from content types
    if (contentTypes.includes('Long-form video content')) {
      pillars.push('Educational content');
    }
    if (contentTypes.includes('Short-form viral content')) {
      pillars.push('Entertainment and trends');
    }

    return pillars.length > 0 ? pillars : ['Lifestyle and personal brand'];
  }

  private inferAudienceDemographics(platforms: { [platform: string]: PlatformData }): string {
    const successfulPlatforms = Object.keys(platforms).filter(p => platforms[p].success);
    
    if (successfulPlatforms.includes('tiktok') && successfulPlatforms.includes('instagram')) {
      return 'Young adults 18-34, highly engaged with social media trends';
    }
    if (successfulPlatforms.includes('youtube') && successfulPlatforms.includes('twitter')) {
      return 'Educated professionals 25-45, interested in long-form content';
    }
    if (successfulPlatforms.includes('instagram')) {
      return 'Visual-first audience 20-40, lifestyle-focused';
    }

    return 'Diverse cross-platform audience';
  }

  private assessContentConsistency(platforms: { [platform: string]: PlatformData }): 'high' | 'medium' | 'low' {
    const activePlatforms = Object.values(platforms).filter(p => p.success).length;
    const totalPlatforms = Object.keys(platforms).length;
    
    const consistency = activePlatforms / totalPlatforms;
    
    if (consistency >= 0.8) return 'high';
    if (consistency >= 0.5) return 'medium';
    return 'low';
  }

  private generatePersonalizedPitch(
    profile: UniversalCreatorProfile,
    presence: PlatformPresence[],
    linkAnalysis: LinkAggregatorAnalysis,
    value: ValueEstimation
  ): string {
    const creatorName = profile.searchQuery;
    const primaryPlatform = presence[0]?.platform || 'social media';
    const followerCount = (presence[0]?.followers || 0).toLocaleString();
    const currentAggregator = linkAnalysis.currentAggregators[0];

    let pitch = `Hi ${creatorName}! I noticed you have an incredible ${followerCount} followers on ${primaryPlatform}`;

    if (currentAggregator) {
      const aggregatorName = this.getCompetitorName(currentAggregator);
      pitch += ` and are currently using ${aggregatorName} to manage your ${linkAnalysis.linkCount} links.`;
      pitch += ` Advanced link management could help increase your revenue by an estimated $${value.totalValue.toLocaleString()}/month`;
      pitch += ` and better analytics than ${aggregatorName}.`;
    } else {
      pitch += ` with ${linkAnalysis.linkCount} links across platforms.`;
      pitch += ` Better link organization could help monetize these links more effectively,`;
      pitch += ` potentially generating $${value.totalValue.toLocaleString()}/month in additional revenue.`;
    }

    pitch += ` Consider exploring advanced link management solutions to optimize your creator economy.`;

    return pitch;
  }

  private defineExpectedOutcomes(value: ValueEstimation, linkAnalysis: LinkAggregatorAnalysis): string[] {
    const outcomes: string[] = [];

    outcomes.push(`Increase monthly revenue by $${value.totalValue.toLocaleString()}`);
    outcomes.push(`Improve link click-through rates by 15-25%`);
    outcomes.push(`Gain detailed analytics on audience behavior`);

    if (linkAnalysis.currentAggregators.length > 0) {
      outcomes.push('Eliminate monthly subscription fees from current aggregator');
      outcomes.push('Streamline link management across all platforms');
    }

    outcomes.push('Access to advanced A/B testing capabilities');
    outcomes.push('Custom branded landing page experience');

    return outcomes;
  }

  private defineSuccessMetrics(value: ValueEstimation, presence: PlatformPresence[]): string[] {
    return [
      `Target: ${value.estimatedClickthrough.toLocaleString()} monthly link clicks`,
      `Goal: ${value.conversionPotential.toLocaleString()} monthly conversions`,
      `Revenue target: $${value.totalValue.toLocaleString()}/month`,
      'Link organization efficiency: 80%+ improvement',
      'Creator satisfaction score: 9/10+',
      'Time savings: 5+ hours/month on link management'
    ];
  }

  private assessDataQuality(profile: UniversalCreatorProfile): 'high' | 'medium' | 'low' {
    const successfulPlatforms = Object.values(profile.platforms).filter(p => p.success).length;
    const totalPlatforms = Object.keys(profile.platforms).length;
    const successRate = successfulPlatforms / totalPlatforms;

    if (successRate >= 0.8 && profile.summary.uniqueLinks >= 5) return 'high';
    if (successRate >= 0.6 && profile.summary.uniqueLinks >= 3) return 'medium';
    return 'low';
  }

  private calculateConfidenceLevel(profile: UniversalCreatorProfile, presence: PlatformPresence[]): number {
    let confidence = 50; // Base confidence

    // Boost for successful platform extractions
    const successRate = Object.values(profile.platforms).filter(p => p.success).length / Object.keys(profile.platforms).length;
    confidence += successRate * 30;

    // Boost for follower data
    if (presence.some(p => p.followers > 0)) confidence += 15;

    // Boost for links found
    if (profile.summary.uniqueLinks >= 5) confidence += 10;
    if (profile.summary.uniqueLinks >= 10) confidence += 15;

    return Math.min(confidence, 95);
  }

  private assessRecommendationStrength(overallScore: number, linkAnalysis: LinkAggregatorAnalysis): 'strong' | 'moderate' | 'weak' {
    if (overallScore >= 80 || linkAnalysis.currentAggregators.includes('linktree')) return 'strong';
    if (overallScore >= 60 || linkAnalysis.linkCount >= 8) return 'moderate';
    return 'weak';
  }
}

// Test if run directly
if (require.main === module) {
  async function test() {
    console.log('🧪 Testing CreatorIntelligenceAnalyzer...\n');
    
    const analyzer = new CreatorIntelligenceAnalyzer();
    
    // Mock test data based on The Rock's real profile
    const mockProfile: any = {
      searchQuery: 'therock',
      platforms: {
        linktree: {
          platform: 'linktree',
          success: true,
          links: [
            { title: 'Project Rock Shoes', originalUrl: 'https://projectrock.online/pr6', expandedUrl: '', type: 'brand_direct' as any, source: 'linktree', confidence: 85 },
            { title: 'ZOA Energy', originalUrl: 'https://zoa.energy/DJ2023', expandedUrl: '', type: 'brand_direct' as any, source: 'linktree', confidence: 85 }
          ],
          processingTime: 1000
        },
        tiktok: {
          platform: 'tiktok',
          success: true,
          links: [],
          metrics: { followers: 80300000 },
          processingTime: 1000
        },
        instagram: {
          platform: 'instagram', 
          success: true,
          links: [],
          metrics: { followers: 393000000 },
          processingTime: 1000
        }
      },
      summary: {
        totalLinks: 2,
        uniqueLinks: 2,
        platformsFound: ['linktree', 'tiktok', 'instagram'],
        totalReach: 473300000,
        primaryPlatform: 'instagram',
        usingCompetitor: 'Linktree'
      }
    };

    const mockDedupedLinks: DedupedLink[] = [
      {
        url: 'https://projectrock.online/pr6',
        originalUrls: ['https://projectrock.online/pr6'],
        sources: ['linktree'],
        occurrences: 1,
        confidence: 90,
        firstSeen: new Date(),
        lastSeen: new Date(),
        brand: 'Project Rock',
        title: 'Project Rock Training Shoes',
        type: 'brand_direct',
        isAffiliate: false
      },
      {
        url: 'https://amazon.com/stores/zoa-energy',
        originalUrls: ['https://zoa.energy/DJ2023'],
        sources: ['linktree'],
        occurrences: 1,
        confidence: 85,
        firstSeen: new Date(),
        lastSeen: new Date(),
        brand: 'ZOA Energy',
        title: 'ZOA Energy Drinks',
        type: 'amazon',
        isAffiliate: true,
        affiliateId: 'DJ2023'
      }
    ];

    console.log('📋 Test data: The Rock profile analysis');
    console.log(`   Platforms: ${Object.keys(mockProfile.platforms).join(', ')}`);
    console.log(`   Total reach: ${mockProfile.summary.totalReach.toLocaleString()} followers`);
    console.log(`   Links to analyze: ${mockDedupedLinks.length}`);

    // Run analysis
    const report = analyzer.analyze(mockProfile, mockDedupedLinks);

    console.log('\n✨ Creator Intelligence Report:');
    console.log('='.repeat(50));
    console.log(`Creator: ${report.creatorId}`);
    console.log(`Type: ${report.creatorType}`);
    console.log(`Overall Score: ${report.overallScore}/100`);
    console.log(`Confidence: ${report.metadata.confidenceLevel}%`);

    console.log('\n🎯 Platform Presence:');
    report.platformPresence.forEach(platform => {
      console.log(`   ${platform.platform}: ${platform.followers.toLocaleString()} followers`);
      console.log(`      Engagement: ${platform.contentFrequency}, Link sharing: ${platform.linkSharing}`);
    });

    console.log('\n🔗 Link Aggregator Analysis:');
    console.log(`   Current aggregators: ${report.linkAggregatorAnalysis.currentAggregators.join(', ')}`);
    console.log(`   Total links: ${report.linkAggregatorAnalysis.linkCount}`);
    console.log(`   Organization level: ${report.linkAggregatorAnalysis.organizationLevel}`);
    console.log(`   Migration difficulty: ${report.linkAggregatorAnalysis.migrationDifficulty}`);

    console.log('\n💰 Value Estimation:');
    console.log(`   Monthly reach: ${report.valueEstimation.monthlyReach.toLocaleString()}`);
    console.log(`   Estimated revenue: $${report.valueEstimation.totalValue.toLocaleString()}/month`);
    console.log(`   Affiliate potential: $${report.valueEstimation.affiliateRevenue.toLocaleString()}`);

    console.log('\n🏆 Competitive Analysis:');
    console.log(`   Current competitors: ${report.competitiveIntelligence.directCompetitors.join(', ')}`);
    console.log(`   Market position: ${report.competitiveIntelligence.marketPosition}`);

    console.log('\n📈 Actionable Insights:');
    console.log('   Immediate actions:');
    report.actionableInsights.immediateActions.forEach(action => {
      console.log(`     • ${action}`);
    });

    console.log('\n💬 Personalized Pitch:');
    console.log(`   "${report.actionableInsights.personalizedPitch}"`);

    console.log('\n✅ CreatorIntelligenceAnalyzer test complete!');
    console.log(`   Data quality: ${report.metadata.dataQuality}`);
    console.log(`   Recommendation strength: ${report.metadata.recommendationStrength}`);
  }
  
  test();
}