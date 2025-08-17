'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Clock, SkipForward, Settings, X, CheckCircle, AlertCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useOnboardingSession } from '@/hooks/useOnboardingSession';
import { useDiscoveryProgress } from '@/hooks/useDiscoveryProgress';

interface PlatformStatus {
  status: 'pending' | 'checking' | 'complete' | 'failed';
  linksFound: number;
  error?: string;
  startedAt?: number;
  completedAt?: number;
}

interface DiscoveryJob {
  jobId: string;
  username: string;
  status: 'processing' | 'complete' | 'failed';
  progress: number;
  platforms: Record<string, PlatformStatus>;
  totalLinks: number;
  startedAt: number;
  estimatedTimeRemaining?: number;
}

export default function DiscoveryPage() {
  const router = useRouter();
  const { 
    session, 
    isLoading: sessionLoading,
    setJobId,
    updateSession,
    isValidForPage,
    autoRedirect,
    redirectToStep
  } = useOnboardingSession();
  
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showPartialSuccess, setShowPartialSuccess] = useState(false);
  const [failedPlatforms, setFailedPlatforms] = useState<string[]>([]);
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [isTimedOut, setIsTimedOut] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  
  // Discovery progress hook
  const { 
    results: job, 
    error, 
    networkError,
    startDiscovery,
    retry,
    generateMockLinks
  } = useDiscoveryProgress({
    jobId: session.jobId || null,
    onComplete: (results) => {
      console.log('onComplete callback triggered with results:', results);
      const realLinks = generateMockLinks(results);
      console.log('Real links generated:', realLinks);
      // Store results in session storage directly to avoid triggering re-renders
      sessionStorage.setItem('onboarding_discovery_results', JSON.stringify({
        discoveryResults: results,
        discoveredLinks: realLinks,
        selectedLinkIds: realLinks.map(l => l.id),
        completedAt: Date.now()
      }));
      console.log('Stored to session storage');
    },
    onProgress: (results) => {
      // Store progress without triggering state updates
      sessionStorage.setItem('onboarding_discovery_progress', JSON.stringify(results));
    },
    onError: (errorMessage) => {
      console.error('Discovery error:', errorMessage);
      // If job not found and we're still on discovery page, clear stale job ID and restart
      if (errorMessage.includes('Job') && errorMessage.includes('not found')) {
        console.log('Clearing stale job ID and restarting discovery');
        updateSession({ jobId: undefined });
        // Only restart if we have a username and we're on the discovery page
        if (session.username && window.location.pathname === '/onboarding/discovery') {
          setTimeout(() => {
            handleStartDiscovery();
          }, 1000);
        }
      }
    }
  });

  // Platform configurations
  const platformConfigs = [
    { id: 'instagram', name: 'Instagram', icon: '📷', color: 'from-pink-500 to-purple-600' },
    { id: 'tiktok', name: 'TikTok', icon: '🎵', color: 'from-gray-900 to-black' },
    { id: 'youtube', name: 'YouTube', icon: '📺', color: 'from-red-500 to-red-600' },
    { id: 'twitter', name: 'Twitter', icon: '🐦', color: 'from-blue-400 to-blue-600' },
    { id: 'linktree', name: 'Linktree', icon: '🌳', color: 'from-green-500 to-green-600' },
    { id: 'beacons', name: 'Beacons', icon: '🔗', color: 'from-orange-500 to-orange-600' }
  ];

  // Validate session and auto-redirect if needed
  useEffect(() => {
    if (!sessionLoading) {
      if (!isValidForPage('discovery')) {
        autoRedirect();
        return;
      }
      
      // Start discovery if not already started
      if (!session.jobId && session.username) {
        handleStartDiscovery();
      }
    }
  }, [sessionLoading, session, isValidForPage, autoRedirect]);

  // Start discovery function
  const handleStartDiscovery = async () => {
    try {
      const newJobId = await startDiscovery(
        session.username,
        session.selectedPlatforms.length > 0 ? session.selectedPlatforms : undefined
      );
      setJobId(newJobId);
    } catch (error) {
      console.error('Failed to start discovery:', error);
    }
  };

  // Time elapsed counter with timeout detection
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - session.startedAt) / 1000);
      setTimeElapsed(elapsed);
      
      // Show timeout warning at 45 seconds
      if (elapsed >= 45 && !showTimeoutWarning && job?.status === 'processing') {
        setShowTimeoutWarning(true);
      }
      
      // Mark as timed out at 60 seconds
      if (elapsed >= 60 && !isTimedOut && job?.status === 'processing') {
        setIsTimedOut(true);
        updateSession({ wasTimedOut: true });
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [session.startedAt, job?.status, showTimeoutWarning, isTimedOut, updateSession]);


  // Check for partial success and auto-advance when complete
  useEffect(() => {
    if (job?.status === 'complete' && !hasRedirected) {
      setHasRedirected(true);
      
      // Check if any platforms failed
      const failed = Object.entries(job.platforms || {})
        .filter(([_, status]) => status.status === 'failed')
        .map(([platform, _]) => platform);
      
      setFailedPlatforms(failed);
      
      if (failed.length > 0 && job.totalLinks > 0) {
        // Show partial success message
        setShowPartialSuccess(true);
        setTimeout(() => setShowPartialSuccess(false), 8000);
      }
      
      // Store completion data and redirect using window.location to avoid router issues
      setTimeout(async () => {
        // Get links from session storage that was set by onComplete
        const discoveryData = sessionStorage.getItem('onboarding_discovery_results');
        let realLinks: any[] = [];
        
        if (discoveryData) {
          try {
            const parsed = JSON.parse(discoveryData);
            realLinks = parsed.discoveredLinks || [];
          } catch (e) {
            console.warn('Failed to parse discovery data');
          }
        }
        
        console.log('About to redirect with links:', realLinks);
        
        // Update session with the actual discovered links
        updateSession({
          discoveryResults: job,
          discoveredLinks: realLinks,
          selectedLinkIds: realLinks.map(l => l.id),
          completedAt: Date.now()
        });
        
        // Small delay to ensure session update completes
        setTimeout(() => {
          window.location.href = '/onboarding/success';
        }, 100);
      }, job.totalLinks > 0 ? 2000 : 4000);
    }
  }, [job?.status, hasRedirected, generateMockLinks, updateSession]);

  const handleSkip = () => {
    redirectToStep('success');
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/onboarding" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                Discovering Your Links
              </h1>
              <p className="text-xl text-gray-600">
                Scanning @{session.username} across all platforms
              </p>
            </motion.div>
          </div>

          {/* Progress Section */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 mb-8"
          >
            
            {/* Circular Progress */}
            <div className="text-center mb-8">
              <div className="relative inline-flex items-center justify-center">
                <motion.div
                  animate={job?.progress === 100 ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.6, times: [0, 0.5, 1] }}
                >
                  <svg className="w-24 h-24 transform -rotate-90">
                    <circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-gray-200"
                    />
                    <motion.circle
                      cx="48"
                      cy="48"
                      r="40"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      className={`transition-colors duration-500 ${
                        (job?.progress || 0) < 25 ? 'text-red-500' :
                        (job?.progress || 0) < 50 ? 'text-orange-500' :
                        (job?.progress || 0) < 75 ? 'text-yellow-500' :
                        (job?.progress || 0) < 100 ? 'text-blue-600' :
                        'text-green-500'
                      }`}
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: (job?.progress || 0) / 100 }}
                      transition={{ duration: 0.8, ease: "easeOut" }}
                      style={{
                        strokeDasharray: `${2 * Math.PI * 40}`,
                        strokeDashoffset: `${2 * Math.PI * 40 * (1 - (job?.progress || 0) / 100)}`
                      }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span 
                      className="text-2xl font-bold text-gray-900"
                      key={Math.round(job?.progress || 0)}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.3 }}
                    >
                      {Math.round(job?.progress || 0)}%
                    </motion.span>
                  </div>
                </motion.div>
              </div>
              
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-center space-x-2 text-gray-600">
                  <Clock className="h-4 w-4" />
                  <span>Time elapsed: {formatTime(timeElapsed)}</span>
                </div>
                {job?.estimatedTimeRemaining !== undefined && job?.estimatedTimeRemaining > 0 && (
                  <div className="text-sm text-gray-500">
                    About {job.estimatedTimeRemaining}s remaining
                  </div>
                )}
              </div>
            </div>

            {/* Platform Status List */}
            <div className="space-y-4">
              {platformConfigs.map((platform, index) => {
                const status = job?.platforms[platform.id];
                
                // Animation variants for platform items
                const platformVariants = {
                  hidden: { opacity: 0, x: 50 },
                  visible: { 
                    opacity: 1, 
                    x: 0,
                    transition: { duration: 0.4, delay: index * 0.1 }
                  },
                  failed: {
                    x: [0, -10, 10, -10, 10, 0],
                    transition: { duration: 0.5 }
                  }
                };
                
                return (
                  <motion.div
                    key={platform.id}
                    variants={platformVariants}
                    initial="hidden"
                    animate={status?.status === 'failed' ? 'failed' : 'visible'}
                    className="flex items-center justify-between p-4 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      {/* Platform Icon */}
                      <div className={`w-10 h-10 rounded-lg bg-gradient-to-r ${platform.color} flex items-center justify-center text-white text-lg`}>
                        {platform.icon}
                      </div>
                      
                      {/* Platform Name & Status */}
                      <div>
                        <div className="font-medium text-gray-900">{platform.name}</div>
                        <div className="text-sm text-gray-600">
                          {status?.status === 'pending' && 'Waiting...'}
                          {status?.status === 'checking' && 'Scanning...'}
                          {status?.status === 'complete' && `${status.linksFound} links found`}
                          {status?.status === 'failed' && (status.error || 'Not accessible')}
                        </div>
                      </div>
                    </div>

                    {/* Status Indicator */}
                    <div>
                      {status?.status === 'pending' && (
                        <motion.div 
                          className="w-6 h-6 rounded-full bg-gray-300"
                          initial={{ scale: 0.8, opacity: 0.5 }}
                          animate={{ scale: 1, opacity: 1 }}
                        />
                      )}
                      {status?.status === 'checking' && (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        >
                          <Loader2 className="w-6 h-6 text-blue-600" />
                        </motion.div>
                      )}
                      {status?.status === 'complete' && (
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ 
                            type: "spring", 
                            stiffness: 500, 
                            damping: 30,
                            duration: 0.6 
                          }}
                        >
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </motion.div>
                      )}
                      {status?.status === 'failed' && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: "spring", duration: 0.5 }}
                        >
                          <AlertCircle className="w-6 h-6 text-red-500" />
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Live Counter */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
              className="mt-8 text-center"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={job?.totalLinks || 0}
                  initial={{ 
                    opacity: 0, 
                    y: 20,
                    scale: 0.8
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: 1
                  }}
                  exit={{ 
                    opacity: 0, 
                    y: -20,
                    scale: 1.2
                  }}
                  transition={{ 
                    duration: 0.5,
                    type: "spring",
                    bounce: 0.4
                  }}
                  className="text-2xl font-bold text-gray-900 relative"
                >
                  <motion.span
                    animate={{
                      textShadow: (job?.totalLinks || 0) > 20 
                        ? [
                            "0 0 0px rgba(59, 130, 246, 0)",
                            "0 0 10px rgba(59, 130, 246, 0.5)",
                            "0 0 0px rgba(59, 130, 246, 0)"
                          ]
                        : "0 0 0px rgba(59, 130, 246, 0)"
                    }}
                    transition={{ duration: 1, repeat: (job?.totalLinks || 0) > 20 ? 1 : 0 }}
                  >
                    {job?.totalLinks || 0} links found so far...
                  </motion.span>
                </motion.div>
              </AnimatePresence>
              
              {job?.status === 'complete' && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="mt-4"
                >
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                    <CheckCircle className="h-4 w-4" />
                    <span>Discovery complete!</span>
                  </div>
                </motion.div>
              )}
              
              {/* Partial Success Warning */}
              <AnimatePresence>
                {showPartialSuccess && failedPlatforms.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="mt-6 p-4 rounded-xl border border-yellow-200 bg-yellow-50"
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Partial Success
                        </h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          We found {job?.totalLinks || 0} links, but couldn't access {failedPlatforms.length} platform{failedPlatforms.length !== 1 ? 's' : ''}:
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {failedPlatforms.map(platform => (
                            <span 
                              key={platform}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 capitalize"
                            >
                              {platform}
                            </span>
                          ))}
                        </div>
                        <div className="mt-3 text-xs text-yellow-600">
                          <p className="mb-2">This could be because:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Your profile is private on these platforms</li>
                            <li>The username doesn't exist on these platforms</li>
                            <li>These platforms are temporarily unavailable</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Timeout Warning */}
              <AnimatePresence>
                {(showTimeoutWarning || isTimedOut) && job?.status === 'processing' && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className={`mt-6 p-4 rounded-xl border ${
                      isTimedOut 
                        ? 'border-red-200 bg-red-50' 
                        : 'border-orange-200 bg-orange-50'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                        isTimedOut ? 'text-red-600' : 'text-orange-600'
                      }`} />
                      <div className="flex-1">
                        <h4 className={`text-sm font-medium ${
                          isTimedOut ? 'text-red-800' : 'text-orange-800'
                        }`}>
                          {isTimedOut ? 'Discovery Taking Longer Than Expected' : 'Discovery Taking Longer Than Usual'}
                        </h4>
                        <p className={`text-sm mt-1 ${
                          isTimedOut ? 'text-red-700' : 'text-orange-700'
                        }`}>
                          {isTimedOut 
                            ? 'Some platforms may be slow to respond. You can continue with what we\'ve found or keep waiting.'
                            : 'This is taking longer than our usual 30 seconds. Some platforms might be slow today.'
                          }
                        </p>
                        
                        {isTimedOut && (
                          <div className="mt-4 flex flex-col sm:flex-row gap-3">
                            <motion.button
                              onClick={() => {
                                if (job?.totalLinks && job.totalLinks > 0) {
                                  updateSession({ 
                                    discoveryResults: job,
                                    completedAt: Date.now(),
                                    wasTimedOut: true
                                  });
                                  redirectToStep('success');
                                } else {
                                  handleSkip();
                                }
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Continue with {job?.totalLinks || 0} links</span>
                            </motion.button>
                            
                            <motion.button
                              onClick={() => {
                                setIsTimedOut(false);
                                setShowTimeoutWarning(false);
                              }}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                            >
                              <Clock className="h-4 w-4" />
                              <span>Keep Waiting</span>
                            </motion.button>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              
              {/* Network Error Recovery */}
              <AnimatePresence>
                {(networkError || error) && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20, scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                    className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50"
                  >
                    <div className="flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-red-800">
                          {(error?.message || networkError || '').includes('not found') ? 'Session Expired' : 'Connection Problem'}
                        </h4>
                        <p className="text-sm text-red-700 mt-1">
                          {(error?.message || networkError || '').includes('not found') 
                            ? 'Your discovery session has expired. We\'ll start a fresh discovery for you.'
                            : (networkError || 'Unable to check discovery progress. Your discovery may still be running in the background.')
                          }
                        </p>
                        <div className="mt-3 text-xs text-red-600">
                          <ul className="list-disc list-inside space-y-1">
                            {(error?.message || networkError || '').includes('not found') ? (
                              <>
                                <li>Your progress is saved automatically</li>
                                <li>We'll restart discovery with your username</li>
                                <li>This usually takes 30 seconds</li>
                              </>
                            ) : (
                              <>
                                <li>Check your internet connection</li>
                                <li>Wait a moment and try refreshing</li>
                                <li>Your progress is saved automatically</li>
                              </>
                            )}
                          </ul>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <motion.button
                        onClick={async () => {
                          if ((error?.message || networkError || '').includes('not found')) {
                            // Clear stale job and restart
                            updateSession({ jobId: undefined });
                            await handleStartDiscovery();
                          } else {
                            retry();
                          }
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>
                          {(error?.message || networkError || '').includes('not found') 
                            ? 'Start Fresh Discovery' 
                            : 'Retry Connection'
                          }
                        </span>
                      </motion.button>
                      
                      <motion.button
                        onClick={() => redirectToStep('success')}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors flex items-center space-x-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        <span>Continue Anyway</span>
                      </motion.button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Bottom Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1.0 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <button
              onClick={handleSkip}
              disabled={job?.status === 'complete'}
              className="inline-flex items-center px-6 py-3 text-gray-600 hover:text-gray-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SkipForward className="h-4 w-4 mr-2" />
              Skip remaining
            </button>
            
            <button
              onClick={() => {
                // Clear all session data and refresh
                sessionStorage.clear();
                updateSession({ jobId: undefined, discoveredLinks: [], selectedLinkIds: [], completedAt: undefined });
                window.location.reload();
              }}
              className="inline-flex items-center px-6 py-3 text-red-600 hover:text-red-700 font-medium transition-colors"
            >
              <Settings className="h-4 w-4 mr-2" />
              DEBUG: Reset & Restart
            </button>
          </motion.div>

          {/* Debug Info (remove in production) */}
          {process.env.NODE_ENV === 'development' && job && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="mt-8 p-4 bg-gray-100 rounded-lg text-xs text-gray-600"
            >
              <div>Status: {job.status}</div>
              <div>Progress: {job.progress}%</div>
              <div>Time: {timeElapsed}s</div>
              <div>Job ID: {job.jobId}</div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}