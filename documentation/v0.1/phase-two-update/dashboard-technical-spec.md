# Dashboard Technical Specification
## Architecture and Interfaces

## System Architecture

```
Frontend (Vercel)
    ├── Next.js 14 App
    ├── React Components
    └── API Routes
          ↓
Backend Services (Your Existing)
    ├── Scraping Engine
    ├── Revenue Calculator
    └── Pitch Generator
          ↓
Database (Supabase)
    ├── PostgreSQL
    ├── Real-time Subscriptions
    └── Row Level Security
          ↓
Cache Layer (Redis/Memory)
    └── API Response Cache
```

## Core TypeScript Interfaces

```typescript
// types/creator.ts
interface Creator {
  id: string;
  username: string;
  displayName: string;
  tier: 'micro' | 'mid' | 'macro' | 'mega';
  category: string;
  profileImage?: string;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface PlatformProfile {
  id: string;
  creatorId: string;
  platform: 'instagram' | 'tiktok' | 'youtube' | 'twitter' | 'linktree' | 'beacons';
  username: string;
  followers: number;
  following?: number;
  engagementRate?: number;
  bio?: string;
  externalUrl?: string;
  isVerified: boolean;
  lastScraped: Date;
  metrics: {
    avgLikes?: number;
    avgComments?: number;
    postsPerWeek?: number;
  };
}

interface RevenueEstimate {
  id: string;
  creatorId: string;
  estimatedMonthly: number;
  estimatedYearly: number;
  confidence: number; // 0-100
  calculationMethod: 'engagement' | 'comparable' | 'product_pricing';
  breakdown: {
    category: string;
    amount: number;
    percentage: number;
  }[];
  opportunities: {
    description: string;
    potentialValue: number;
    priority: 'high' | 'medium' | 'low';
  }[];
  calculatedAt: Date;
}

interface Affiliate {
  id: string;
  creatorId: string;
  brand: string;
  productName?: string;
  productUrl: string;
  productImage?: string;
  category: string;
  discountCode?: string;
  commissionRate?: number;
  source: 'post' | 'story' | 'bio' | 'linktree' | 'video';
  platform: string;
  confidence: number;
  detectedAt: Date;
}

interface SalesIntelligence {
  id: string;
  creatorId: string;
  priority: 'high' | 'medium' | 'low';
  priorityScore: number; // 0-100
  personalizedPitch: string;
  talkingPoints: string[];
  objectionHandlers: {
    objection: string;
    response: string;
  }[];
  estimatedDealSize: number;
  closeProbability: number; // 0-100
  bestContactMethod: 'email' | 'dm' | 'agent';
  nextAction: string;
  generatedAt: Date;
}

interface AnalysisJob {
  id: string;
  creatorUsername: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  platformsCompleted: string[];
  startedAt: Date;
  completedAt?: Date;
  error?: string;
  results?: {
    linksFound: number;
    platformsAnalyzed: number;
    revenueEstimated: number;
  };
}
```

## API Response Formats

```typescript
// GET /api/creators/[username]
interface CreatorResponse {
  success: boolean;
  data?: {
    creator: Creator;
    platforms: PlatformProfile[];
    revenue: RevenueEstimate;
    affiliates: Affiliate[];
    salesPitch: SalesIntelligence;
    lastAnalyzed: Date;
  };
  error?: {
    code: string;
    message: string;
  };
}

// POST /api/analyze
interface AnalyzeRequest {
  username: string;
  options?: {
    platforms?: string[];
    forceRefresh?: boolean;
  };
}

interface AnalyzeResponse {
  success: boolean;
  data?: {
    jobId: string;
    status: 'queued' | 'processing';
    estimatedTime: number; // seconds
    queuePosition?: number;
  };
  error?: {
    code: string;
    message: string;
  };
}

// GET /api/jobs/[jobId]
interface JobStatusResponse {
  job: AnalysisJob;
  creator?: Creator; // If completed
}
```

## Database Schema Essentials

```sql
-- Key tables structure (simplified)
creators
  - id (UUID, PK)
  - username (UNIQUE, INDEXED)
  - data (JSONB for flexibility)

platform_profiles
  - creator_id (FK, INDEXED)
  - platform (INDEXED)
  - metrics (JSONB)

revenue_estimates
  - creator_id (FK)
  - calculations (JSONB)
  - created_at (INDEXED DESC)

-- Crucial indexes
CREATE INDEX idx_creators_username ON creators(username);
CREATE INDEX idx_revenue_latest ON revenue_estimates(creator_id, calculated_at DESC);

-- View for quick lookups
CREATE VIEW creator_summary AS
  SELECT ... aggregate data ...
```

## State Management

```typescript
// hooks/useCreator.ts
interface UseCreatorReturn {
  creator: Creator | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  isAnalyzing: boolean;
  analysisProgress: number;
}

// Real-time updates
const useCreatorAnalysis = (username: string) => {
  // Poll for updates while analyzing
  // Subscribe to Supabase real-time
  // Update UI automatically
}
```

## Performance Requirements

```typescript
interface PerformanceTargets {
  initialPageLoad: '<2s';
  searchResponse: '<200ms'; // with cache
  fullAnalysis: '<30s';
  chartRender: '<500ms';
  apiResponse: '<500ms';
  databaseQuery: '<100ms';
}
```

## Cache Strategy

```typescript
// Cache layers
enum CacheLevel {
  BROWSER = 5 * 60,        // 5 minutes
  CDN = 10 * 60,          // 10 minutes  
  API = 60 * 60,          // 1 hour
  DATABASE = 24 * 60 * 60  // 24 hours
}

// Cache keys
const cacheKeys = {
  creator: (username: string) => `creator:${username}`,
  revenue: (id: string) => `revenue:${id}`,
  search: (query: string) => `search:${query}`
};
```

## Component Props Interfaces

```typescript
// components/RevenueChart.tsx
interface RevenueChartProps {
  data?: {
    month: string;
    actual: number;
    potential: number;
  }[];
  height?: number;
  showLegend?: boolean;
  animated?: boolean;
}

// components/CreatorCard.tsx
interface CreatorCardProps {
  creator: Creator;
  showRevenue?: boolean;
  onClick?: () => void;
  variant?: 'compact' | 'full';
}

// components/PlatformBreakdown.tsx
interface PlatformBreakdownProps {
  platforms: PlatformProfile[];
  showMetrics?: boolean;
  layout?: 'grid' | 'list';
}
```

## Error Handling

```typescript
enum ErrorCode {
  CREATOR_NOT_FOUND = 'CREATOR_NOT_FOUND',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  RATE_LIMITED = 'RATE_LIMITED',
  INVALID_USERNAME = 'INVALID_USERNAME',
  BACKEND_UNAVAILABLE = 'BACKEND_UNAVAILABLE'
}

class AppError extends Error {
  constructor(
    public code: ErrorCode,
    public message: string,
    public statusCode: number
  ) {
    super(message);
  }
}
```

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_KEY=
BACKEND_API_URL=http://localhost:4000
REDIS_URL=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Security Considerations

```typescript
// Row Level Security
"Enable RLS on all tables"
"Use Supabase auth for admin actions"
"Rate limit API endpoints"
"Validate all inputs"
"Sanitize username inputs"

// API Security
"Use API routes as proxy"
"Never expose backend directly"
"Implement CORS properly"
"Add request signing if needed"
```

## Deployment Configuration

```yaml
# vercel.json
{
  "functions": {
    "app/api/analyze/route.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "BACKEND_API_URL": "@backend-api-url"
  }
}
```

## Testing Requirements

```typescript
// Critical paths to test
const testScenarios = [
  'Search for existing creator',
  'Analyze new creator',
  'View revenue dashboard',
  'Export PDF report',
  'Handle API timeout',
  'Mobile responsive view'
];

// Performance benchmarks
const benchmarks = {
  searchToResults: 3000, // ms
  dashboardLoad: 2000,
  chartRender: 500,
  exportPDF: 5000
};
```

## Integration Points

```typescript
// Connect to existing backend
class BackendService {
  async analyzeCreator(username: string) {
    // Call your Node.js service
    return fetch(`${BACKEND_URL}/analyze/${username}`);
  }
  
  async getRevenueEstimate(data: any) {
    // Use your existing calculator
    return this.revenueCalculator.calculate(data);
  }
  
  async generatePitch(creator: any) {
    // Use your pitch generator
    return this.pitchGenerator.generate(creator);
  }
}
```