'use client';

import { useState, useEffect } from 'react';

interface InstagramMetrics {
  timestamp: Date;
  currentMethod: 'mobile_api' | 'graphql' | 'scraper_api' | 'all_failed';
  successRate: number;
  bioExtractionRate: number;
  avgPostsRetrieved: number;
  affiliatesDetected: number;
  avgResponseTime: number;
  costs: {
    currentMonthly: number;
    projectedWithPaid: number;
    breakEvenProfiles: number;
  };
  trends: {
    successTrend: 'improving' | 'stable' | 'declining';
    last24h: number[];
  };
  status: 'healthy' | 'degraded' | 'critical';
  recommendation: {
    action: string;
    reasoning: string;
    confidence: number;
    nextEvaluation: Date;
  };
  isTestingActive: boolean;
}

interface MethodSelectorProps {
  currentMethod: string;
  onMethodChange: (method: string) => void;
  isTestingActive: boolean;
}

function MethodSelector({ currentMethod, onMethodChange, isTestingActive }: MethodSelectorProps) {
  const methods = [
    { id: 'mobile_api', name: 'Mobile API', cost: '$0', description: 'Free, rate limited' },
    { id: 'scraper_api', name: 'ScraperAPI', cost: '$29/mo', description: 'Paid, reliable' },
    { id: 'auto', name: 'Auto Fallback', cost: 'Variable', description: 'Smart switching' }
  ];

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">🔄 Extraction Method</h3>
      <div className="space-y-3">
        {methods.map((method) => (
          <label key={method.id} className="flex items-center space-x-3 cursor-pointer">
            <input
              type="radio"
              name="method"
              value={method.id}
              checked={currentMethod === method.id}
              onChange={() => onMethodChange(method.id)}
              disabled={isTestingActive}
              className="text-blue-600 bg-gray-700 border-gray-600 focus:ring-blue-500"
            />
            <div className="flex-1">
              <div className="text-white font-medium">{method.name}</div>
              <div className="text-gray-400 text-sm">{method.description}</div>
            </div>
            <div className="text-green-400 font-mono text-sm">{method.cost}</div>
          </label>
        ))}
      </div>
      {isTestingActive && (
        <div className="mt-4 flex items-center space-x-2 text-blue-400">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
          <span className="text-sm">Currently testing...</span>
        </div>
      )}
    </div>
  );
}

interface MetricsGridProps {
  metrics: InstagramMetrics;
}

function MetricsGrid({ metrics }: MetricsGridProps) {
  const getStatusColor = (rate: number) => {
    if (rate >= 70) return 'text-green-400';
    if (rate >= 50) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getStatusBg = (rate: number) => {
    if (rate >= 70) return 'bg-green-900/20 border-green-500/30';
    if (rate >= 50) return 'bg-yellow-900/20 border-yellow-500/30';
    return 'bg-red-900/20 border-red-500/30';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Success Rate */}
      <div className={`bg-gray-800 rounded-lg p-6 border-2 ${getStatusBg(metrics.successRate)} ${metrics.isTestingActive ? 'animate-pulse' : ''}`}>
        <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Success Rate</div>
        <div className={`text-4xl font-bold ${getStatusColor(metrics.successRate)} mb-2`}>
          {metrics.successRate}%
        </div>
        <div className="text-gray-500 text-xs">
          {metrics.trends.successTrend === 'improving' ? '📈 Improving' : 
           metrics.trends.successTrend === 'declining' ? '📉 Declining' : '➡️ Stable'}
        </div>
      </div>

      {/* Bio Extraction */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Bio Extraction</div>
        <div className="text-3xl font-bold text-white mb-2">{metrics.bioExtractionRate}%</div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              metrics.bioExtractionRate >= 80 ? 'bg-green-500' : 
              metrics.bioExtractionRate >= 60 ? 'bg-yellow-500' : 'bg-red-500'
            }`}
            style={{ width: `${metrics.bioExtractionRate}%` }}
          ></div>
        </div>
        <div className="text-gray-500 text-xs mt-1">Not page titles</div>
      </div>

      {/* Posts Retrieved */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Posts Retrieved</div>
        <div className="text-3xl font-bold text-blue-400 mb-2">{metrics.avgPostsRetrieved}</div>
        <div className="relative w-16 h-16 mx-auto">
          <svg className="transform -rotate-90 w-16 h-16">
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              className="text-gray-700"
            />
            <circle
              cx="32"
              cy="32"
              r="28"
              stroke="currentColor"
              strokeWidth="4"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - Math.min(metrics.avgPostsRetrieved / 30, 1))}`}
              className="text-blue-400 transition-all duration-500"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">
            /30
          </div>
        </div>
      </div>

      {/* Response Time */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-gray-400 text-sm uppercase tracking-wide mb-2">Response Time</div>
        <div className="text-3xl font-bold text-purple-400 mb-2">{metrics.avgResponseTime}ms</div>
        <div className="text-gray-500 text-xs">
          {metrics.avgResponseTime < 3000 ? '⚡ Fast' : 
           metrics.avgResponseTime < 8000 ? '🐌 Slow' : '🔴 Very Slow'}
        </div>
        <div className="mt-2 text-green-400 text-sm">
          🎯 {metrics.affiliatesDetected} affiliates found
        </div>
      </div>
    </div>
  );
}

interface CostAnalysisProps {
  costs: InstagramMetrics['costs'];
  currentMethod: string;
  successRate: number;
}

function CostAnalysis({ costs, currentMethod, successRate }: CostAnalysisProps) {
  const [profilesPerMonth, setProfilesPerMonth] = useState(1000);
  
  const calculateROI = () => {
    const freeReliability = successRate / 100;
    const paidReliability = 0.95; // Assume 95% with paid
    
    const freeSuccesses = profilesPerMonth * freeReliability;
    const paidSuccesses = profilesPerMonth * paidReliability;
    const additionalSuccesses = paidSuccesses - freeSuccesses;
    
    const valuePerProfile = 5; // Assume $5 value per successful extraction
    const additionalValue = additionalSuccesses * valuePerProfile;
    const monthlyCost = costs.projectedWithPaid;
    
    return additionalValue - monthlyCost;
  };

  const roi = calculateROI();

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">💰 Cost Analysis</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-gray-400 text-sm">Current Cost</div>
          <div className="text-2xl font-bold text-green-400">${costs.currentMonthly}</div>
          <div className="text-gray-500 text-xs">Free API</div>
        </div>
        <div className="text-center">
          <div className="text-gray-400 text-sm">With ScraperAPI</div>
          <div className="text-2xl font-bold text-blue-400">${costs.projectedWithPaid}</div>
          <div className="text-gray-500 text-xs">Per month</div>
        </div>
      </div>

      <div className="mb-4">
        <label className="block text-gray-400 text-sm mb-2">
          Monthly Profiles: {profilesPerMonth.toLocaleString()}
        </label>
        <input
          type="range"
          min="100"
          max="10000"
          step="100"
          value={profilesPerMonth}
          onChange={(e) => setProfilesPerMonth(parseInt(e.target.value))}
          className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
        />
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-400">Break-even point:</span>
          <span className="text-white">{costs.breakEvenProfiles} profiles</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Monthly ROI:</span>
          <span className={roi > 0 ? 'text-green-400' : 'text-red-400'}>
            ${roi.toFixed(0)} {roi > 0 ? '📈' : '📉'}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-400">Reliability gain:</span>
          <span className="text-blue-400">+{Math.max(0, 95 - successRate)}%</span>
        </div>
      </div>
    </div>
  );
}

interface TrendChartProps {
  trends: InstagramMetrics['trends'];
}

function TrendChart({ trends }: TrendChartProps) {
  const maxValue = Math.max(...trends.last24h, 100);
  
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">📈 Success Rate Trend</h3>
      
      <div className="relative h-32 mb-4">
        <div className="absolute inset-0 flex items-end justify-between">
          {trends.last24h.map((value, index) => (
            <div
              key={index}
              className="flex flex-col items-center"
              style={{ width: `${90 / trends.last24h.length}%` }}
            >
              <div
                className={`w-full rounded-t transition-all duration-500 ${
                  value >= 70 ? 'bg-green-500' : 
                  value >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ height: `${(value / maxValue) * 100}%` }}
              ></div>
              <div className="text-xs text-gray-500 mt-1">
                {index % 4 === 0 ? `${index}h` : ''}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="flex justify-between text-sm">
        <span className="text-gray-400">24h ago</span>
        <span className="text-gray-400">Now</span>
      </div>
      
      <div className="mt-4 flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded"></div>
          <span className="text-gray-400">Good (70%+)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-yellow-500 rounded"></div>
          <span className="text-gray-400">Fair (50-70%)</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-red-500 rounded"></div>
          <span className="text-gray-400">Poor (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
}

interface RecommendationsProps {
  recommendation: InstagramMetrics['recommendation'];
  status: InstagramMetrics['status'];
}

function Recommendations({ recommendation, status }: RecommendationsProps) {
  const statusConfig = {
    healthy: { icon: '🟢', color: 'text-green-400', bg: 'bg-green-900/20 border-green-500/30' },
    degraded: { icon: '🟡', color: 'text-yellow-400', bg: 'bg-yellow-900/20 border-yellow-500/30' },
    critical: { icon: '🔴', color: 'text-red-400', bg: 'bg-red-900/20 border-red-500/30' }
  };

  const config = statusConfig[status];

  return (
    <div className={`bg-gray-800 rounded-lg p-6 border-2 ${config.bg}`}>
      <h3 className="text-lg font-semibold text-white mb-4">🤖 AI Recommendations</h3>
      
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-xl">{config.icon}</span>
          <span className={`font-semibold ${config.color}`}>
            {status.toUpperCase()}
          </span>
          <span className="text-gray-400 text-sm">
            ({recommendation.confidence}% confidence)
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="text-white font-medium mb-1">💡 Suggested Action:</div>
          <div className="text-gray-300 text-sm bg-gray-700/50 p-3 rounded">
            {recommendation.action}
          </div>
        </div>
        
        <div>
          <div className="text-white font-medium mb-1">🧠 Reasoning:</div>
          <div className="text-gray-400 text-sm">
            {recommendation.reasoning}
          </div>
        </div>
        
        <div className="flex justify-between items-center text-sm pt-2 border-t border-gray-700">
          <span className="text-gray-400">Next evaluation:</span>
          <span className="text-blue-400">
            {new Date(recommendation.nextEvaluation).toLocaleTimeString()}
          </span>
        </div>
      </div>
    </div>
  );
}

interface InstagramMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export default function InstagramMonitor({ 
  autoRefresh = true, 
  refreshInterval = 30000 
}: InstagramMonitorProps) {
  const [metrics, setMetrics] = useState<InstagramMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState('auto');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const response = await fetch('/api/instagram-metrics');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }
      
      const data = await response.json();
      setMetrics(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const exportReport = async () => {
    try {
      const response = await fetch('/api/instagram-metrics/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `instagram-metrics-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Export failed:', err);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400">Loading Instagram metrics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-lg border border-red-500/30 max-w-md text-center">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-white mb-4">Metrics Unavailable</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <div className="space-y-2 text-sm text-gray-500 mb-6">
            <p>Try running:</p>
            <code className="block bg-gray-700 p-2 rounded text-blue-400">
              npm run test:instagram:v2:comprehensive
            </code>
          </div>
          <button 
            onClick={fetchMetrics}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            🔄 Retry
          </button>
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  return (
    <div className="min-h-screen bg-gray-900 py-8">
      <div className="container mx-auto px-4 max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-white mb-2">
            📱 Instagram Extractor Monitor
          </h1>
          <p className="text-gray-400">
            Real-time performance metrics and cost analysis
            {lastUpdated && (
              <span className="ml-2 text-gray-500">
                • Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </p>
        </div>

        {/* Current Status Banner */}
        <div className={`mb-8 p-4 rounded-lg border-2 ${
          metrics.status === 'healthy' ? 'bg-green-900/20 border-green-500/30' :
          metrics.status === 'degraded' ? 'bg-yellow-900/20 border-yellow-500/30' :
          'bg-red-900/20 border-red-500/30'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">
                {metrics.status === 'healthy' ? '🟢' : 
                 metrics.status === 'degraded' ? '🟡' : '🔴'}
              </span>
              <div>
                <div className="text-white font-semibold">
                  System Status: {metrics.status.toUpperCase()}
                </div>
                <div className="text-gray-400 text-sm">
                  Currently using: {metrics.currentMethod.replace('_', ' ').toUpperCase()}
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={fetchMetrics}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors text-sm"
              >
                🔄 Refresh
              </button>
              <button
                onClick={exportReport}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors text-sm"
              >
                📊 Export
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Column - Method Selection */}
          <div className="space-y-6">
            <MethodSelector
              currentMethod={selectedMethod}
              onMethodChange={setSelectedMethod}
              isTestingActive={metrics.isTestingActive}
            />
            
            <CostAnalysis
              costs={metrics.costs}
              currentMethod={metrics.currentMethod}
              successRate={metrics.successRate}
            />
          </div>

          {/* Right Columns - Metrics */}
          <div className="lg:col-span-2 space-y-6">
            <MetricsGrid metrics={metrics} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TrendChart trends={metrics.trends} />
              <Recommendations 
                recommendation={metrics.recommendation}
                status={metrics.status}
              />
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-white mb-4">🔧 Component Performance</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Mobile API</div>
              <div className={`text-2xl font-bold ${
                metrics.currentMethod === 'mobile_api' && metrics.successRate > 50 ? 'text-green-400' : 
                metrics.currentMethod === 'mobile_api' ? 'text-red-400' : 'text-gray-500'
              }`}>
                {metrics.currentMethod === 'mobile_api' ? metrics.successRate : 'Standby'}%
              </div>
              <div className="text-gray-500 text-xs">Primary method</div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">GraphQL Pagination</div>
              <div className={`text-2xl font-bold ${
                metrics.avgPostsRetrieved > 12 ? 'text-green-400' : 
                metrics.avgPostsRetrieved > 0 ? 'text-yellow-400' : 'text-gray-500'
              }`}>
                {metrics.avgPostsRetrieved > 12 ? '✅' : metrics.avgPostsRetrieved > 0 ? '⚠️' : '❌'}
              </div>
              <div className="text-gray-500 text-xs">
                {metrics.avgPostsRetrieved} avg posts
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-gray-400 text-sm mb-1">Affiliate Detection</div>
              <div className="text-2xl font-bold text-blue-400">
                {metrics.affiliatesDetected}
              </div>
              <div className="text-gray-500 text-xs">Avg per profile</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-gray-500 text-sm mt-8">
          <p>
            Instagram V2 Extractor • Mobile API → GraphQL → ScraperAPI Fallback
          </p>
          <p className="mt-1">
            Last updated: {new Date(metrics.timestamp).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}