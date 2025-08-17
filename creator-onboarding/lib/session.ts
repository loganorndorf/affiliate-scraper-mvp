export interface DiscoveredLink {
  id: string;
  url: string;
  title?: string;
  platform: string;
  isSelected: boolean;
  isPrimary?: boolean;
}

export interface PlatformStatus {
  status: 'pending' | 'checking' | 'complete' | 'failed';
  linksFound: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

export interface DiscoveryResults {
  jobId: string;
  username: string;
  status: 'processing' | 'complete' | 'failed';
  progress: number;
  platforms: Record<string, PlatformStatus>;
  totalLinks: number;
  startedAt: number;
  estimatedTimeRemaining?: number;
}

export interface OnboardingSession {
  username: string;
  jobId?: string;
  detectedPlatform?: string;
  selectedPlatforms: string[];
  discoveredLinks: DiscoveredLink[];
  selectedLinkIds: string[];
  startedAt: number;
  completedAt?: number;
  discoveryResults?: DiscoveryResults;
  hasPartialFailures?: boolean;
  wasTimedOut?: boolean;
  expiresAt: number;
}

const SESSION_KEY = 'onboarding_session';
const SESSION_DURATION = 60 * 60 * 1000; // 1 hour

export function saveProgress(data: Partial<OnboardingSession>): void {
  try {
    const existing = loadProgress();
    const updated: OnboardingSession = {
      ...existing,
      ...data,
      expiresAt: Date.now() + SESSION_DURATION
    };
    
    // Compress data if it's getting large
    const serialized = JSON.stringify(updated);
    if (serialized.length > 50000) { // ~50KB limit
      // Remove less critical data to stay under storage limits
      updated.discoveryResults = undefined;
    }
    
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

export function loadProgress(): OnboardingSession {
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (!stored) {
      return initializeSession();
    }
    
    const parsed: OnboardingSession = JSON.parse(stored);
    
    // Check if session has expired
    if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
      clearSession();
      return initializeSession();
    }
    
    // Validate required fields
    if (!parsed.username || !parsed.startedAt) {
      clearSession();
      return initializeSession();
    }
    
    return {
      ...initializeSession(),
      ...parsed
    };
    
  } catch (error) {
    console.error('Failed to load session:', error);
    clearSession();
    return initializeSession();
  }
}

export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

export function initializeSession(): OnboardingSession {
  return {
    username: '',
    selectedPlatforms: [],
    discoveredLinks: [],
    selectedLinkIds: [],
    startedAt: Date.now(),
    expiresAt: Date.now() + SESSION_DURATION
  };
}

export function isSessionExpired(session: OnboardingSession): boolean {
  return Date.now() > session.expiresAt;
}

export function getSessionAge(session: OnboardingSession): number {
  return Date.now() - session.startedAt;
}

export function updateSelectedLinks(linkIds: string[]): void {
  const session = loadProgress();
  saveProgress({
    selectedLinkIds: linkIds
  });
}

export function addDiscoveredLink(link: DiscoveredLink): void {
  const session = loadProgress();
  const existingIds = new Set(session.discoveredLinks.map(l => l.id));
  
  if (!existingIds.has(link.id)) {
    saveProgress({
      discoveredLinks: [...session.discoveredLinks, link],
      selectedLinkIds: [...session.selectedLinkIds, link.id] // Auto-select new links
    });
  }
}

export function updateDiscoveredLinks(links: DiscoveredLink[]): void {
  saveProgress({
    discoveredLinks: links
  });
}