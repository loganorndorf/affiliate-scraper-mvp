import { OnboardingSession, DiscoveredLink, loadProgress, saveProgress } from './session';

export interface SessionValidation {
  isValid: boolean;
  canProceed: boolean;
  missingData: string[];
  shouldRedirect: string | null;
}

export function validateSessionForPage(page: 'username' | 'discovery' | 'success'): SessionValidation {
  const session = loadProgress();
  const missing: string[] = [];
  let canProceed = true;
  let shouldRedirect: string | null = null;

  switch (page) {
    case 'username':
      // Username page is always valid - users can start fresh
      return {
        isValid: true,
        canProceed: true,
        missingData: [],
        shouldRedirect: null
      };

    case 'discovery':
      if (!session.username) {
        missing.push('username');
        shouldRedirect = '/onboarding';
        canProceed = false;
      }
      break;

    case 'success':
      if (!session.username) {
        missing.push('username');
        shouldRedirect = '/onboarding';
        canProceed = false;
      } else if (!session.jobId && session.discoveredLinks.length === 0) {
        missing.push('discovery results');
        shouldRedirect = '/onboarding/discovery';
        canProceed = false;
      }
      break;
  }

  return {
    isValid: missing.length === 0,
    canProceed,
    missingData: missing,
    shouldRedirect
  };
}

export function getSessionProgress(): {
  currentStep: number;
  totalSteps: number;
  stepName: string;
} {
  const session = loadProgress();
  
  if (!session.username) {
    return { currentStep: 1, totalSteps: 3, stepName: 'Enter Username' };
  }
  
  if (!session.jobId || !session.discoveredLinks.length) {
    return { currentStep: 2, totalSteps: 3, stepName: 'Discovering Links' };
  }
  
  return { currentStep: 3, totalSteps: 3, stepName: 'Review & Import' };
}

export function getSessionSummary(): {
  username: string;
  platformsScanned: number;
  linksFound: number;
  timeElapsed: number;
  isComplete: boolean;
} {
  const session = loadProgress();
  
  return {
    username: session.username || '',
    platformsScanned: session.selectedPlatforms.length || 0,
    linksFound: session.discoveredLinks.length,
    timeElapsed: session.startedAt ? Date.now() - session.startedAt : 0,
    isComplete: !!session.completedAt
  };
}

export function shouldAutoCleanupSession(): boolean {
  const session = loadProgress();
  
  // Cleanup if completed more than 5 minutes ago
  if (session.completedAt && Date.now() - session.completedAt > 5 * 60 * 1000) {
    return true;
  }
  
  // Cleanup if started more than 2 hours ago
  if (session.startedAt && Date.now() - session.startedAt > 2 * 60 * 60 * 1000) {
    return true;
  }
  
  return false;
}

export function compressSessionData(session: OnboardingSession): OnboardingSession {
  // Remove large data structures if session is getting too big
  const serialized = JSON.stringify(session);
  
  if (serialized.length > 100000) { // 100KB limit
    return {
      ...session,
      discoveryResults: undefined, // Remove detailed results
      discoveredLinks: session.discoveredLinks.slice(0, 50) // Keep only first 50 links
    };
  }
  
  return session;
}

export function migrateSessionData(session: any): OnboardingSession {
  // Handle migration from old session format
  return {
    username: session.username || '',
    jobId: session.jobId,
    detectedPlatform: session.detectedPlatform,
    selectedPlatforms: session.selectedPlatforms || [],
    discoveredLinks: session.discoveredLinks || [],
    selectedLinkIds: session.selectedLinkIds || [],
    startedAt: session.startedAt || Date.now(),
    completedAt: session.completedAt,
    discoveryResults: session.discoveryResults,
    hasPartialFailures: session.hasPartialFailures,
    wasTimedOut: session.wasTimedOut,
    expiresAt: session.expiresAt || Date.now() + (60 * 60 * 1000)
  };
}

export function exportSessionAsBackup(): string {
  const session = loadProgress();
  return JSON.stringify({
    ...session,
    exportedAt: Date.now(),
    version: '1.0'
  }, null, 2);
}

export function importSessionFromBackup(backup: string): boolean {
  try {
    const data = JSON.parse(backup);
    const migrated = migrateSessionData(data);
    saveProgress(migrated);
    return true;
  } catch (error) {
    console.error('Failed to import session backup:', error);
    return false;
  }
}