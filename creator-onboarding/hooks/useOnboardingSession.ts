import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  OnboardingSession, 
  DiscoveredLink,
  loadProgress, 
  saveProgress, 
  clearSession, 
  initializeSession,
  isSessionExpired 
} from '@/lib/session';

export function useOnboardingSession() {
  const router = useRouter();
  const [session, setSession] = useState<OnboardingSession>(initializeSession());
  const [isLoading, setIsLoading] = useState(true);

  // Load session on mount once only
  useEffect(() => {
    if (isLoading) {
      const loaded = loadProgress();
      
      if (isSessionExpired(loaded)) {
        clearSession();
        setSession(initializeSession());
      } else {
        setSession(loaded);
      }
      
      setIsLoading(false);
    }
  }, [isLoading]);

  // Update session data
  const updateSession = useCallback((updates: Partial<OnboardingSession>) => {
    const updated = { ...session, ...updates };
    setSession(updated);
    saveProgress(updates);
  }, [session]);

  // Set username
  const setUsername = useCallback((username: string, detectedPlatform?: string) => {
    updateSession({
      username,
      detectedPlatform,
      startedAt: Date.now()
    });
  }, [updateSession]);

  // Set job ID
  const setJobId = useCallback((jobId: string) => {
    updateSession({ jobId });
  }, [updateSession]);

  // Set selected platforms
  const setSelectedPlatforms = useCallback((platforms: string[]) => {
    updateSession({ selectedPlatforms: platforms });
  }, [updateSession]);

  // Update discovered links
  const setDiscoveredLinks = useCallback((links: DiscoveredLink[]) => {
    const selectedIds = links.filter(link => link.isSelected).map(link => link.id);
    updateSession({ 
      discoveredLinks: links,
      selectedLinkIds: selectedIds
    });
  }, [updateSession]);

  // Toggle link selection
  const toggleLinkSelection = useCallback((linkId: string) => {
    const currentIds = session.selectedLinkIds;
    const newIds = currentIds.includes(linkId)
      ? currentIds.filter(id => id !== linkId)
      : [...currentIds, linkId];
    
    updateSession({ selectedLinkIds: newIds });
  }, [session.selectedLinkIds, updateSession]);

  // Mark as completed
  const completeOnboarding = useCallback(() => {
    updateSession({ completedAt: Date.now() });
  }, [updateSession]);

  // Clear session
  const resetSession = useCallback(() => {
    clearSession();
    setSession(initializeSession());
  }, []);

  // Navigation helpers
  const redirectToStep = useCallback((step: 'username' | 'discovery' | 'success') => {
    const routes = {
      username: '/onboarding',
      discovery: '/onboarding/discovery', 
      success: '/onboarding/success'
    };
    router.push(routes[step]);
  }, [router]);

  // Auto-redirect based on session state
  const autoRedirect = useCallback(() => {
    if (!session.username) {
      redirectToStep('username');
      return;
    }
    
    if (!session.jobId) {
      redirectToStep('discovery');
      return;
    }
    
    if (session.completedAt || session.discoveredLinks.length > 0) {
      redirectToStep('success');
      return;
    }
  }, [session, redirectToStep]);

  // Check if session is valid for current page
  const isValidForPage = useCallback((page: 'username' | 'discovery' | 'success') => {
    switch (page) {
      case 'username':
        return true; // Always valid
      case 'discovery':
        return !!session.username;
      case 'success':
        return !!(session.username && session.jobId);
      default:
        return false;
    }
  }, [session]);

  return {
    session,
    isLoading,
    setUsername,
    setJobId,
    setSelectedPlatforms,
    setDiscoveredLinks,
    toggleLinkSelection,
    completeOnboarding,
    resetSession,
    redirectToStep,
    autoRedirect,
    isValidForPage,
    updateSession
  };
}