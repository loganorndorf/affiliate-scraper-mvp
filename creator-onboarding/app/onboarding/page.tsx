'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle, AlertCircle, ArrowLeft, Instagram, Youtube, Twitter, UserX, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useOnboardingSession } from '@/hooks/useOnboardingSession';
import '@/lib/clearSession'; // Adds clearAllSessionData to window for debugging

interface PlatformDetection {
  platform: string | null;
  username: string;
  isValid: boolean;
  error?: string;
}

export default function OnboardingPage() {
  const router = useRouter();
  const { 
    session, 
    isLoading: sessionLoading, 
    setUsername, 
    setSelectedPlatforms: setSessionPlatforms,
    redirectToStep
  } = useOnboardingSession();
  
  const [input, setInput] = useState('');
  const [detection, setDetection] = useState<PlatformDetection>({ platform: null, username: '', isValid: false });
  const [isLoading, setIsLoading] = useState(false);
  const [showManualOptions, setShowManualOptions] = useState(false);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [error, setError] = useState<{ type: string; message: string; details?: string } | null>(null);
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number>(0);

  const platforms = [
    { id: 'instagram', name: 'Instagram', icon: Instagram, color: 'from-pink-500 to-purple-600' },
    { id: 'tiktok', name: 'TikTok', icon: 'TT', color: 'from-gray-900 to-black' },
    { id: 'youtube', name: 'YouTube', icon: Youtube, color: 'from-red-500 to-red-600' },
    { id: 'twitter', name: 'Twitter', icon: Twitter, color: 'from-blue-400 to-blue-600' },
    { id: 'linktree', name: 'Linktree', icon: 'LT', color: 'from-green-500 to-green-600' },
    { id: 'beacons', name: 'Beacons', icon: 'BC', color: 'from-orange-500 to-orange-600' }
  ];

  // Platform detection logic
  const detectPlatformFromInput = (value: string): PlatformDetection => {
    const trimmed = value.trim();
    
    if (!trimmed) {
      return { platform: null, username: '', isValid: false };
    }

    // URL patterns
    const urlPatterns = {
      instagram: /(?:https?:\/\/)?(?:www\.)?instagram\.com\/([a-zA-Z0-9_.]+)/,
      tiktok: /(?:https?:\/\/)?(?:www\.)?tiktok\.com\/@?([a-zA-Z0-9_.]+)/,
      youtube: /(?:https?:\/\/)?(?:www\.)?youtube\.com\/(?:@|c\/|user\/)?([a-zA-Z0-9_.]+)/,
      twitter: /(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_.]+)/,
      linktree: /(?:https?:\/\/)?linktr\.ee\/([a-zA-Z0-9_.]+)/,
      beacons: /(?:https?:\/\/)?beacons\.ai\/([a-zA-Z0-9_.]+)/
    };

    // Check for URL matches
    for (const [platform, pattern] of Object.entries(urlPatterns)) {
      const match = trimmed.match(pattern);
      if (match) {
        const username = match[1].toLowerCase();
        return {
          platform,
          username,
          isValid: validateUsername(username),
          error: validateUsername(username) ? undefined : 'Invalid username format'
        };
      }
    }

    // Plain username (with or without @)
    const plainUsername = trimmed.replace(/^@/, '').toLowerCase();
    const isValid = validateUsername(plainUsername);
    
    return {
      platform: null,
      username: plainUsername,
      isValid,
      error: isValid ? undefined : 'Username must be 3+ characters, letters/numbers/underscore/period only'
    };
  };

  const validateUsername = (username: string): boolean => {
    if (username.length < 3) return false;
    if (username.length > 30) return false;
    return /^[a-zA-Z0-9_.]+$/.test(username);
  };

  // Initialize from session on load
  useEffect(() => {
    if (!sessionLoading && session.username) {
      setInput(session.username);
      if (session.selectedPlatforms.length > 0) {
        setSelectedPlatforms(session.selectedPlatforms);
        setShowManualOptions(true);
      }
    }
  }, [sessionLoading, session]);

  useEffect(() => {
    const detected = detectPlatformFromInput(input);
    setDetection(detected);
  }, [input]);

  // Rate limit countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (rateLimitCountdown > 0) {
      interval = setInterval(() => {
        setRateLimitCountdown(prev => {
          if (prev <= 1) {
            setError(null);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rateLimitCountdown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!detection.isValid || !detection.username) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // First, validate the username exists on at least one platform
      const validationResponse = await fetch('/api/validate-username', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: detection.username,
          platform: detection.platform
        }),
      });

      const validation = await validationResponse.json();
      
      if (!validation.success) {
        if (validation.error?.code === 'USERNAME_NOT_FOUND') {
          setError({
            type: 'username_not_found',
            message: `@${detection.username} not found${detection.platform ? ` on ${detection.platform}` : ''}`,
            details: validation.error.message
          });
          setIsLoading(false);
          return;
        }
        
        if (validation.error?.code === 'RATE_LIMITED') {
          const retryAfter = validation.error?.retryAfter || 60;
          setRateLimitCountdown(retryAfter);
          setError({
            type: 'rate_limited',
            message: 'Too many requests',
            details: `Please wait ${retryAfter} seconds before trying again`
          });
          setIsLoading(false);
          return;
        }
        
        throw new Error(validation.error?.message || 'Username validation failed');
      }

      // Save to session using hook
      setUsername(detection.username, detection.platform || undefined);
      setSessionPlatforms(showManualOptions ? selectedPlatforms : []);

      // Navigate to discovery page
      redirectToStep('discovery');
      
    } catch (error) {
      console.error('Submission failed:', error);
      setError({
        type: 'network_error',
        message: 'Unable to connect to our servers',
        details: 'Please check your internet connection and try again'
      });
      setIsLoading(false);
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId) 
        ? prev.filter(id => id !== platformId)
        : [...prev, platformId]
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-12">
            <Link href="/" className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-8 transition-colors">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to home
            </Link>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                Let's Find Your Links
              </h1>
              <p className="text-xl text-gray-600">
                Enter your username from any platform and we'll scan everywhere
              </p>
            </motion.div>
          </div>

          {/* Main Form */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Input Field */}
              <div className="space-y-2">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                  Username or Profile URL
                </label>
                <div className="relative">
                  <input
                    id="username"
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Enter your @username or profile URL"
                    className="w-full px-4 py-4 text-lg border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    disabled={isLoading}
                  />
                  
                  {/* Platform Detection Indicator */}
                  <AnimatePresence>
                    {detection.platform && (
                      <motion.div
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2"
                      >
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <span>Detected:</span>
                          <span className="font-semibold capitalize">{detection.platform}</span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                
                {/* Validation Messages */}
                <AnimatePresence>
                  {detection.error && input && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center space-x-2 text-sm text-red-600"
                    >
                      <AlertCircle className="h-4 w-4" />
                      <span>{detection.error}</span>
                    </motion.div>
                  )}
                  
                  {detection.isValid && detection.username && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center space-x-2 text-sm text-green-600"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>Username: {detection.username}</span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Examples */}
              <div className="text-sm text-gray-500">
                <p className="mb-2">Examples:</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>• @therock</div>
                  <div>• instagram.com/therock</div>
                  <div>• tiktok.com/@mrbeast</div>
                  <div>• youtube.com/emmachamberlain</div>
                </div>
              </div>

              {/* Submit Button */}
              <motion.button
                type="submit"
                disabled={!detection.isValid || isLoading || rateLimitCountdown > 0}
                whileHover={{ scale: detection.isValid && rateLimitCountdown === 0 ? 1.02 : 1 }}
                whileTap={{ scale: detection.isValid && rateLimitCountdown === 0 ? 0.98 : 1 }}
                className={`w-full py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                  detection.isValid && rateLimitCountdown === 0
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Starting Discovery...</span>
                  </>
                ) : (
                  <>
                    <span>Start Discovery</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </motion.button>
            </form>

            {/* Error Messages */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.3 }}
                  className="mt-6 p-4 rounded-xl border border-red-200 bg-red-50"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0">
                      {error.type === 'username_not_found' ? (
                        <UserX className="h-5 w-5 text-red-500 mt-0.5" />
                      ) : (
                        <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-red-800">
                        {error.type === 'username_not_found' ? 'Username Not Found' : 
                         error.type === 'rate_limited' ? 'Rate Limited' : 'Connection Error'}
                      </h4>
                      <p className="text-sm text-red-700 mt-1">
                        {error.message}
                      </p>
                      {error.details && (
                        <p className="text-xs text-red-600 mt-2">
                          {error.details}
                        </p>
                      )}
                      {error.type === 'username_not_found' && (
                        <div className="mt-3 text-xs text-red-600">
                          <p className="mb-2">Try these alternatives:</p>
                          <ul className="list-disc list-inside space-y-1">
                            <li>Double-check the username spelling</li>
                            <li>Make sure your profile is public</li>
                            <li>Try with the full URL instead</li>
                            <li>Use manual platform selection below</li>
                          </ul>
                        </div>
                      )}
                      
                      {error.type === 'rate_limited' && (
                        <div className="mt-3 p-3 bg-red-100 rounded-lg">
                          <div className="flex items-center justify-center space-x-2 text-lg font-bold text-red-800">
                            <Clock className="h-5 w-5" />
                            <span>
                              {Math.floor(rateLimitCountdown / 60)}:{(rateLimitCountdown % 60).toString().padStart(2, '0')}
                            </span>
                          </div>
                          <p className="text-xs text-red-600 text-center mt-2">
                            We'll automatically re-enable the button when ready
                          </p>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <AlertCircle className="h-4 w-4" />
                    </button>
                  </div>
                  
                  {error.type === 'network_error' && (
                    <div className="mt-4 flex space-x-3">
                      <motion.button
                        onClick={() => {
                          setError(null);
                          handleSubmit({ preventDefault: () => {} } as React.FormEvent);
                        }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2"
                      >
                        <RefreshCw className="h-4 w-4" />
                        <span>Try Again</span>
                      </motion.button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Manual Options */}
            <div className="mt-8 pt-8 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowManualOptions(!showManualOptions)}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
              >
                {showManualOptions ? 'Hide manual options' : 'Connect platforms individually'}
              </button>

              <AnimatePresence>
                {showManualOptions && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-6 space-y-4"
                  >
                    <p className="text-sm text-gray-600 mb-4">
                      Select which platforms to check:
                    </p>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {platforms.map((platform) => (
                        <motion.button
                          key={platform.id}
                          type="button"
                          onClick={() => togglePlatform(platform.id)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                            selectedPlatforms.includes(platform.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col items-center space-y-2">
                            {typeof platform.icon === 'string' ? (
                              <div className={`w-8 h-8 rounded-lg bg-gradient-to-r ${platform.color} flex items-center justify-center text-white text-xs font-bold`}>
                                {platform.icon}
                              </div>
                            ) : (
                              <platform.icon className="h-8 w-8 text-gray-600" />
                            )}
                            <span className="text-sm font-medium text-gray-700">
                              {platform.name}
                            </span>
                            {selectedPlatforms.includes(platform.id) && (
                              <CheckCircle className="h-4 w-4 text-blue-500" />
                            )}
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>

          {/* How It Works Preview */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-12 text-center"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              What happens next?
            </h3>
            <div className="grid sm:grid-cols-3 gap-6 text-sm">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  1
                </div>
                <p className="text-gray-600">We check all your platforms</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  2
                </div>
                <p className="text-gray-600">Find every affiliate link</p>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
                  3
                </div>
                <p className="text-gray-600">Show you everything we found</p>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-6">
              Average discovery time: 30 seconds • No data stored permanently
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}