import { useEffect, useState, useCallback } from 'react';
import useSWR from 'swr';
import { DiscoveryResults, DiscoveredLink } from '@/lib/session';

interface UseDiscoveryProgressProps {
  jobId: string | null;
  onComplete?: (results: DiscoveryResults) => void;
  onProgress?: (results: DiscoveryResults) => void;
  onError?: (error: string) => void;
}

export function useDiscoveryProgress({
  jobId,
  onComplete,
  onProgress,
  onError
}: UseDiscoveryProgressProps) {
  const [lastProgress, setLastProgress] = useState(0);
  const [networkError, setNetworkError] = useState<string | null>(null);

  // API fetcher with error handling
  const fetcher = useCallback(async (url: string): Promise<DiscoveryResults> => {
    try {
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('SWR fetcher received:', JSON.stringify(result, null, 2));
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Failed to get status');
      }
      
      // Clear network error on successful fetch
      setNetworkError(null);
      
      return {
        jobId: result.data.jobId,
        username: result.data.username,
        status: result.data.status,
        progress: result.data.progress,
        platforms: result.data.platforms,
        totalLinks: result.data.totalLinks,
        startedAt: result.data.startedAt || Date.now(),
        estimatedTimeRemaining: result.data.estimatedTimeRemaining,
        results: result.data.results // Include the results field
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network connection failed';
      setNetworkError(errorMessage);
      onError?.(errorMessage);
      
      // If it's a 404 error, it means the job doesn't exist - we should clear the stale job ID
      if (errorMessage.includes('404') || errorMessage.includes('Job') && errorMessage.includes('not found')) {
        console.warn('Job not found, clearing stale job ID');
        // This will be handled by the calling component
      }
      
      throw error;
    }
  }, [onError]);

  // Poll for updates using SWR
  const { data: results, error, mutate } = useSWR(
    jobId ? `/api/status/${jobId}` : null,
    fetcher,
    { 
      refreshInterval: 2000,
      revalidateOnFocus: false,
      shouldRetryOnError: (err) => {
        // Don't retry 404 errors - they indicate stale job IDs
        if (err.message.includes('404') || err.message.includes('not found')) {
          return false;
        }
        return true;
      },
      errorRetryCount: 3,
      errorRetryInterval: 5000
    }
  );

  // Handle progress updates
  useEffect(() => {
    if (results) {
      // Call progress callback if progress changed
      if (results.progress !== lastProgress) {
        setLastProgress(results.progress);
        onProgress?.(results);
      }
      
      // Call completion callback when done (only once)
      if (results.status === 'complete' && lastProgress !== 100) {
        setLastProgress(100);
        onComplete?.(results);
      }
    }
  }, [results, lastProgress, onComplete, onProgress]);

  // Convert actual discovery results to link format (no fake links)
  const generateMockLinks = useCallback((results: DiscoveryResults): DiscoveredLink[] => {
    const realLinks: DiscoveredLink[] = [];
    
    console.log('generateMockLinks called with full results object:', JSON.stringify(results, null, 2));
    
    // The results should include the proper structure from the API
    const allLinks = results?.results?.dedupedLinks || 
                     results?.results?.allLinks || 
                     results?.dedupedLinks || 
                     results?.allLinks;
    
    console.log('Found allLinks:', allLinks);
    
    if (allLinks && Array.isArray(allLinks)) {
      allLinks.forEach((link, index) => {
        realLinks.push({
          id: `link_${index + 1}`,
          url: link.expandedUrl || link.originalUrl || link.url,
          title: link.title || `Link ${index + 1}`,
          platform: link.source || link.sources?.[0] || 'unknown',
          isSelected: true,
          isPrimary: index === 0
        });
      });
    }
    
    console.log('generateMockLinks returning:', realLinks);
    return realLinks;
  }, []);

  // Start discovery
  const startDiscovery = useCallback(async (username: string, platforms?: string[]) => {
    try {
      setNetworkError(null);
      
      const response = await fetch('/api/discover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          platforms: platforms?.length ? platforms : [
            'instagram', 'tiktok', 'youtube', 'twitter', 'linktree', 'beacons'
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error?.message || 'Discovery failed');
      }

      return result.data.jobId;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start discovery';
      setNetworkError(errorMessage);
      onError?.(errorMessage);
      throw error;
    }
  }, [onError]);

  // Retry failed request
  const retry = useCallback(() => {
    setNetworkError(null);
    mutate();
  }, [mutate]);

  return {
    results,
    error: error || networkError,
    networkError,
    isLoading: !results && !error && jobId,
    startDiscovery,
    retry,
    generateMockLinks
  };
}