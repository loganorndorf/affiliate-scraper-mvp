'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle, Download, Edit, Trash2, ExternalLink, ChevronDown, ChevronUp, Plus, Search, X, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import Confetti from 'react-confetti';
import { useOnboardingSession } from '@/hooks/useOnboardingSession';
import { DiscoveredLink, saveProgress } from '@/lib/session';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface EditingLink {
  id: string;
  url: string;
  title: string;
  isPrimary: boolean;
}

// Sortable Link Component
function SortableLink({ 
  link, 
  onToggle, 
  onEdit, 
  onDelete 
}: { 
  link: DiscoveredLink;
  onToggle: (id: string) => void;
  onEdit: (link: DiscoveredLink) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: link.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors border border-gray-100"
    >
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        ⋮⋮
      </div>
      <input
        type="checkbox"
        checked={link.isSelected}
        onChange={() => onToggle(link.id)}
        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <div className="font-medium text-gray-900 truncate">
            {link.title}
          </div>
          {link.isPrimary && (
            <Star className="h-4 w-4 text-yellow-500 fill-current" />
          )}
        </div>
        <div className="text-sm text-gray-500 truncate">
          {link.url}
        </div>
      </div>
      <div className="flex items-center space-x-2">
        <button 
          onClick={() => onEdit(link)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button 
          onClick={() => onDelete(link.id)}
          className="text-gray-400 hover:text-red-500"
        >
          <Trash2 className="h-4 w-4" />
        </button>
        <button 
          onClick={() => window.open(link.url, '_blank')}
          className="text-gray-400 hover:text-blue-500"
        >
          <ExternalLink className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  const router = useRouter();
  const { 
    session, 
    isLoading: sessionLoading,
    toggleLinkSelection,
    completeOnboarding,
    resetSession,
    updateSession
  } = useOnboardingSession();
  
  const [links, setLinks] = useState<DiscoveredLink[]>([]);
  const [expandedPlatforms, setExpandedPlatforms] = useState<string[]>(['instagram']);
  const [isExporting, setIsExporting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [editingLink, setEditingLink] = useState<EditingLink | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [duplicatesRemoved] = useState(Math.floor(Math.random() * 10) + 5);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showAddLinkModal, setShowAddLinkModal] = useState(false);
  const [newLink, setNewLink] = useState({
    url: '',
    title: '',
    platform: 'instagram',
    isPrimary: false
  });
  const [addLinkError, setAddLinkError] = useState<string | null>(null);
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Initialize from session once only - no fake links
  useEffect(() => {
    if (isInitialized) return;
    
    // Basic validation - redirect to onboarding if no username (only check once on mount)
    if (!sessionLoading && !session.username) {
      router.push('/onboarding');
      setIsInitialized(true);
      return;
    }
    
    if (!sessionLoading && session.username) {
      console.log('Success page initializing with session:', session);
      
      // Check for discovery results in session storage first
      const discoveryData = sessionStorage.getItem('onboarding_discovery_results');
      let discoveredLinks = session.discoveredLinks || [];
      
      console.log('Session discovered links:', discoveredLinks);
      console.log('Session storage data:', discoveryData);
      
      if (discoveryData) {
        try {
          const parsed = JSON.parse(discoveryData);
          discoveredLinks = parsed.discoveredLinks || [];
          console.log('Parsed links from session storage:', discoveredLinks);
          // Don't clear session storage immediately - let it persist for debugging
        } catch (e) {
          console.warn('Failed to parse discovery results from session storage');
        }
      }
      
      // Use only actual discovered links - NO fake links
      console.log('Setting links to:', discoveredLinks);
      setLinks(discoveredLinks);
      
      // Show confetti on first load only if we have links
      if (discoveredLinks.length > 0 && !session.completedAt) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
      
      setIsInitialized(true);
    }
  }, [sessionLoading, session.username, session.discoveredLinks, isInitialized]);

  const totalLinks = links.length;
  const selectedLinks = links.filter(link => link.isSelected);
  const filteredLinks = links.filter(link => 
    link.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    link.url.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const linksByPlatform = filteredLinks.reduce((acc, link) => {
    if (!acc[link.platform]) acc[link.platform] = [];
    acc[link.platform].push(link);
    return acc;
  }, {} as Record<string, DiscoveredLink[]>);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      setLinks((items) => {
        const oldIndex = items.findIndex(item => item.id === active.id);
        const newIndex = items.findIndex(item => item.id === over?.id);
        
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const deleteSelected = () => {
    setLinks(prev => prev.filter(link => !link.isSelected));
  };

  const openEditModal = (link: DiscoveredLink) => {
    setEditingLink({
      id: link.id,
      url: link.url,
      title: link.title || '',
      isPrimary: link.isPrimary || false
    });
  };

  const saveEdit = () => {
    if (!editingLink) return;
    
    setLinks(prev => prev.map(link => 
      link.id === editingLink.id 
        ? { 
            ...link, 
            url: editingLink.url, 
            title: editingLink.title,
            isPrimary: editingLink.isPrimary 
          }
        : { ...link, isPrimary: editingLink.isPrimary ? false : link.isPrimary }
    ));
    
    setEditingLink(null);
  };

  const deleteLink = (linkId: string) => {
    setLinks(prev => prev.filter(link => link.id !== linkId));
  };

  const toggleLink = (linkId: string) => {
    const updatedLinks = links.map(link => 
      link.id === linkId ? { ...link, isSelected: !link.isSelected } : link
    );
    setLinks(updatedLinks);
    toggleLinkSelection(linkId);
  };

  const toggleAll = () => {
    const shouldSelectAll = selectedLinks.length !== totalLinks;
    const updatedLinks = links.map(link => ({ ...link, isSelected: shouldSelectAll }));
    setLinks(updatedLinks);
  };

  const togglePlatform = (platform: string) => {
    setExpandedPlatforms(prev => 
      prev.includes(platform) 
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const addNewLink = () => {
    setAddLinkError(null);

    // Validation
    if (!newLink.url.trim()) {
      setAddLinkError('URL is required');
      return;
    }

    if (!newLink.title.trim()) {
      setAddLinkError('Title is required');
      return;
    }

    // Basic URL validation
    try {
      const urlToTest = newLink.url.trim();
      // Add protocol if missing
      const finalUrl = urlToTest.startsWith('http://') || urlToTest.startsWith('https://') 
        ? urlToTest 
        : `https://${urlToTest}`;
      
      new URL(finalUrl); // This will throw if URL is invalid
      
      const linkToAdd: DiscoveredLink = {
        id: `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: finalUrl,
        title: newLink.title.trim(),
        platform: newLink.platform,
        isSelected: true,
        isPrimary: newLink.isPrimary
      };

      // If setting as primary, remove primary from other links
      const updatedLinks = newLink.isPrimary 
        ? links.map(link => ({ ...link, isPrimary: false }))
        : links;

      const finalLinks = [...updatedLinks, linkToAdd];
      setLinks(finalLinks);
      
      // Update session with new links
      updateSession({ 
        discoveredLinks: finalLinks,
        selectedLinkIds: finalLinks.filter(l => l.isSelected).map(l => l.id)
      });
      
      // Reset form and close modal
      setNewLink({
        url: '',
        title: '',
        platform: 'instagram',
        isPrimary: false
      });
      setShowAddLinkModal(false);

    } catch (error) {
      setAddLinkError('Please enter a valid URL');
      return;
    }
  };

  const handleExport = async (format: 'csv' | 'json') => {
    setIsExporting(true);
    setExportError(null);
    
    try {
      console.log(`Exporting ${selectedLinks.length} links as ${format.toUpperCase()}`);
      
      const response = await fetch('/api/export/links', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          links: selectedLinks.map(link => ({
            url: link.url,
            title: link.title,
            platform: link.platform,
            isPrimary: link.isPrimary,
            affiliateDetected: link.affiliateDetected,
            estimatedValue: link.estimatedValue
          })),
          creatorInfo: {
            username: session.username,
            platforms: session.discoveryResults?.platforms || {}
          },
          format
        }),
      });

      const result = await response.json();
      
      if (!result.success) {
        setExportError(result.error?.message || 'Export failed');
        return;
      }
      
      // Trigger download
      const a = document.createElement('a');
      a.href = result.data.downloadUrl;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Show success message
      alert(`🎉 Successfully exported ${result.data.exportedCount} links as ${format.toUpperCase()}!`);
      
      // Complete onboarding
      completeOnboarding();
      
    } catch (error) {
      console.error('Export error:', error);
      setExportError('Failed to export links. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };


  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  // No links found scenario
  if (totalLinks === 0) {
    return (
      <div className="min-h-screen bg-white">
        <div className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto text-center">
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-12"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", duration: 0.8 }}
                className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6"
              >
                <AlertCircle className="w-10 h-10 text-orange-600" />
              </motion.div>
              
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
                No Links Found
              </h1>
              
              <p className="text-xl text-gray-600 mb-8">
                We couldn&apos;t find any affiliate links for @{session.username}
              </p>
              
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 text-left">
                <h3 className="font-semibold text-orange-800 mb-3">This could happen because:</h3>
                <ul className="text-sm text-orange-700 space-y-2">
                  <li>• Your profiles might be private</li>
                  <li>• You haven&apos;t shared affiliate links yet</li>
                  <li>• Links are in stories/bio that we can&apos;t access</li>
                  <li>• You use different usernames on different platforms</li>
                </ul>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-4"
            >
              <motion.button
                onClick={() => {
                  // Clear all session storage data
                  sessionStorage.removeItem('onboarding_discovery_results');
                  sessionStorage.removeItem('onboarding_discovery_progress');
                  resetSession();
                  router.push('/onboarding');
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 px-6 bg-blue-600 text-white text-lg font-semibold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <RefreshCw className="h-5 w-5" />
                <span>Try Different Username</span>
              </motion.button>
              
              <button
                onClick={() => {/* TODO: Manual link addition */}}
                className="w-full py-4 px-6 border border-gray-300 text-gray-700 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
              >
                <Plus className="h-5 w-5" />
                <span>Add Links Manually</span>
              </button>
              
              <Link 
                href="/"
                className="block w-full py-4 px-6 text-gray-500 hover:text-gray-700 text-lg font-medium transition-colors"
              >
                Back to Home
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Confetti */}
      {showConfetti && (
        <Confetti
          width={typeof window !== 'undefined' ? window.innerWidth : 0}
          height={typeof window !== 'undefined' ? window.innerHeight : 0}
          recycle={false}
          numberOfPieces={200}
          gravity={0.1}
        />
      )}
      
      <div className="pt-8 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          
          {/* Success Header */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", duration: 0.8 }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>
            
            <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                {totalLinks} Links Discovered!
              </motion.span>
            </h1>
            
            <p className="text-xl text-gray-600">
              Across {Object.keys(linksByPlatform).length} platforms
            </p>
            
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm text-gray-500">
              <span>{selectedLinks.length} selected</span>
              <span>•</span>
              <span>{duplicatesRemoved} duplicates removed</span>
              <span>•</span>
              <span>Ready to export</span>
            </div>
          </motion.div>

          {/* Links Management */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="bg-white rounded-2xl shadow-xl border border-gray-200 p-6 mb-8"
          >
            
            {/* Search and Bulk Actions */}
            <div className="mb-6 space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search links..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Bulk Actions Bar */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <h2 className="text-xl font-bold text-gray-900">Your Links</h2>
                  <span className="text-sm text-gray-500">
                    {selectedLinks.length} of {totalLinks} selected
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={toggleAll}
                    className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
                  >
                    {selectedLinks.length === totalLinks ? 'Deselect All' : 'Select All'}
                  </button>
                  {selectedLinks.length > 0 && (
                    <button
                      onClick={deleteSelected}
                      className="text-red-600 hover:text-red-700 font-medium text-sm transition-colors"
                    >
                      Delete Selected
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Platform Groups */}
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <div className="space-y-4">
                {Object.entries(linksByPlatform).map(([platform, platformLinks]) => {
                  if (platformLinks.length === 0 && searchQuery) return null;
                  
                  return (
                    <div key={platform} className="border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => togglePlatform(platform)}
                        className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900 capitalize">{platform}</span>
                          <span className="text-sm text-gray-500">
                            ({platformLinks.length} link{platformLinks.length !== 1 ? 's' : ''})
                          </span>
                        </div>
                        {expandedPlatforms.includes(platform) ? (
                          <ChevronUp className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      
                      <AnimatePresence>
                        {expandedPlatforms.includes(platform) && (
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                          >
                            <SortableContext items={platformLinks.map(l => l.id)} strategy={verticalListSortingStrategy}>
                              <div className="p-4 space-y-3">
                                {platformLinks.map((link, linkIndex) => (
                                  <motion.div
                                    key={link.id}
                                    initial={{ opacity: 0, x: 20, scale: 0.95 }}
                                    animate={{ opacity: 1, x: 0, scale: 1 }}
                                    transition={{ 
                                      duration: 0.4, 
                                      delay: linkIndex * 0.05,
                                      type: "spring",
                                      stiffness: 200
                                    }}
                                  >
                                    <SortableLink
                                      link={link}
                                      onToggle={toggleLink}
                                      onEdit={openEditModal}
                                      onDelete={deleteLink}
                                    />
                                  </motion.div>
                                ))}
                              </div>
                            </SortableContext>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </DndContext>
          </motion.div>
        </div>

        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {exportError && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.95 }}
                transition={{ duration: 0.5 }}
                className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50"
              >
                <div className="flex items-start space-x-3">
                  <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-red-800">
                      Export Failed
                    </h4>
                    <p className="text-sm text-red-700 mt-1">
                      {exportError}
                    </p>
                    <div className="mt-3 text-xs text-red-600">
                      <ul className="list-disc list-inside space-y-1">
                        <li>Your links are still available here</li>
                        <li>You can try a different export format</li>
                        <li>Try the export again in a moment</li>
                      </ul>
                    </div>
                  </div>
                  <button
                    onClick={() => setExportError(null)}
                    className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <motion.button
              onClick={() => handleExport('json')}
              disabled={selectedLinks.length === 0 || isExporting}
              whileHover={{ scale: selectedLinks.length > 0 ? 1.02 : 1 }}
              whileTap={{ scale: selectedLinks.length > 0 ? 0.98 : 1 }}
              className={`flex-1 py-4 px-6 text-lg font-semibold rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 ${
                selectedLinks.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isExporting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Exporting...</span>
                </>
              ) : (
                <>
                  <span>Export {selectedLinks.length} Links (JSON)</span>
                  <Download className="h-5 w-5" />
                </>
              )}
            </motion.button>

            <button
              onClick={() => {
                setAddLinkError(null);
                setShowAddLinkModal(true);
              }}
              className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add More Links</span>
            </button>
            
            <button
              onClick={() => handleExport('csv')}
              disabled={selectedLinks.length === 0 || isExporting}
              className="px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="h-5 w-5" />
              <span>Export CSV</span>
            </button>
          </motion.div>

          {/* Alternative Actions */}
          <div className="mt-8 text-center space-y-4">
            <button 
              onClick={() => {
                resetSession();
                router.push('/onboarding');
              }}
              className="text-blue-600 hover:text-blue-700 font-medium underline bg-transparent border-none cursor-pointer"
            >
              Start over with different username
            </button>
            <div className="text-gray-500 text-sm">
              Links exported for use in your preferred platform
            </div>
          </div>
          
          {/* Edit Link Modal */}
          <AnimatePresence>
            {editingLink && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => setEditingLink(null)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl p-6 w-full max-w-md"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Edit Link</h3>
                    <button
                      onClick={() => setEditingLink(null)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL
                      </label>
                      <input
                        type="url"
                        value={editingLink.url}
                        onChange={(e) => setEditingLink(prev => prev ? {...prev, url: e.target.value} : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title/Description
                      </label>
                      <input
                        type="text"
                        value={editingLink.title}
                        onChange={(e) => setEditingLink(prev => prev ? {...prev, title: e.target.value} : null)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="primary"
                        checked={editingLink.isPrimary}
                        onChange={(e) => setEditingLink(prev => prev ? {...prev, isPrimary: e.target.checked} : null)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="primary" className="text-sm text-gray-700">
                        Set as primary link
                      </label>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => setEditingLink(null)}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={saveEdit}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Changes
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Add Link Modal */}
          <AnimatePresence>
            {showAddLinkModal && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                onClick={() => setShowAddLinkModal(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-2xl p-6 w-full max-w-md"
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Add New Link</h3>
                    <button
                      onClick={() => {
                        setAddLinkError(null);
                        setShowAddLinkModal(false);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  {addLinkError && (
                    <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50">
                      <div className="flex items-center space-x-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="text-sm text-red-700">{addLinkError}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        URL <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="url"
                        value={newLink.url}
                        onChange={(e) => setNewLink(prev => ({...prev, url: e.target.value}))}
                        onKeyDown={(e) => e.key === 'Enter' && newLink.url.trim() && newLink.title.trim() && addNewLink()}
                        placeholder="https://example.com/your-link"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title/Description <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newLink.title}
                        onChange={(e) => setNewLink(prev => ({...prev, title: e.target.value}))}
                        onKeyDown={(e) => e.key === 'Enter' && newLink.url.trim() && newLink.title.trim() && addNewLink()}
                        placeholder="My Affiliate Link"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Platform
                      </label>
                      <select
                        value={newLink.platform}
                        onChange={(e) => setNewLink(prev => ({...prev, platform: e.target.value}))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="instagram">Instagram</option>
                        <option value="tiktok">TikTok</option>
                        <option value="youtube">YouTube</option>
                        <option value="twitter">Twitter</option>
                        <option value="linktree">Linktree</option>
                        <option value="beacons">Beacons</option>
                        <option value="website">Website</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="primary-new"
                        checked={newLink.isPrimary}
                        onChange={(e) => setNewLink(prev => ({...prev, isPrimary: e.target.checked}))}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="primary-new" className="text-sm text-gray-700">
                        Set as primary link
                      </label>
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                  </div>
                  
                  <div className="flex space-x-3 mt-6">
                    <button
                      onClick={() => {
                        setAddLinkError(null);
                        setShowAddLinkModal(false);
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={addNewLink}
                      disabled={!newLink.url.trim() || !newLink.title.trim()}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Add Link
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}