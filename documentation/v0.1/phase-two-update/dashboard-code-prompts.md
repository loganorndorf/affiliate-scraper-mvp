# Dashboard Code Generation Prompts
## AI Prompts for Building the UI

## Prompt 1: Database Schema & Setup

```
Create a complete PostgreSQL schema for a creator intelligence platform using Supabase.

Requirements:
1. Store creator profiles from multiple platforms
2. Track affiliate links and products
3. Store revenue estimates with calculation history
4. Save sales pitches and intelligence
5. Cache scraping results

Tables needed:
- creators (main entity)
- platform_profiles (Instagram, TikTok, etc.)
- affiliates (detected affiliate links)
- revenue_estimates (calculations)
- sales_intelligence (pitches, recommendations)
- scraping_jobs (track analysis status)

Include:
- UUID primary keys using uuid-ossp extension
- Proper foreign key relationships
- created_at/updated_at timestamps
- Indexes for performance
- Views for common queries
- JSONB columns for flexible data

Also provide:
1. Supabase client setup code for Next.js
2. TypeScript types matching schema
3. Basic CRUD functions
4. Connection pooling config

Make it production-ready with proper constraints and indexes.
```

## Prompt 2: Next.js Dashboard Shell

```
Create a Next.js 14 dashboard application with TypeScript and Tailwind CSS.

Project structure:
- App directory (not pages)
- TypeScript strict mode
- Tailwind with dark theme default
- Supabase integration

Create these routes:
1. / - Landing page with search
2. /creators/[username] - Individual creator analysis
3. /analytics - Portfolio overview
4. /api/analyze - Trigger analysis endpoint
5. /api/creators/[username] - Get creator data

Landing page requirements:
- Hero section with gradient background
- "$56,000/month discovered" as main headline
- Central search bar with autocomplete
- Animated stats cards below
- Suggested creators grid
- Mobile responsive

Use this color scheme:
- Background: gray-900
- Cards: gray-800 with gray-700 borders
- Primary: blue-600
- Accent: purple-600
- Success: green-500
- Text: gray-100

Include loading states, error boundaries, and smooth transitions.
```

## Prompt 3: Creator Dashboard Page

```
Create a comprehensive creator dashboard page for Next.js that displays intelligence data.

Path: app/creators/[username]/page.tsx

Requirements:
1. Fetch creator data from Supabase on load
2. If creator doesn't exist, trigger analysis
3. Show loading skeleton while analyzing
4. Display real-time progress updates

Layout sections:
HEADER:
- Creator profile (photo, name, verified badge)
- Primary platform indicator
- Last updated timestamp

KEY METRICS (4 cards grid):
- Estimated Monthly Revenue (LARGE, GREEN, with up arrow)
- Total Followers (sum across platforms)
- Active Affiliates (count with brands)
- Sales Priority (HIGH/MED/LOW with color coding)

REVENUE VISUALIZATION:
- Line chart comparing actual vs potential revenue
- Show last 6 months of data (or mock if new)
- Highlight the gap as opportunity

PLATFORM BREAKDOWN:
- Card for each platform found
- Show followers, engagement rate
- Indicate if links found
- Use platform colors

TABS SECTION:
- Overview: Summary stats and charts
- Revenue: Detailed breakdown by category
- Affiliates: List of all detected affiliates
- Sales Pitch: Generated pitch with talking points

ACTION BUTTONS:
- Refresh Analysis
- Export Report (PDF/CSV)
- Share
- Add to CRM

Make it beautiful with:
- Framer Motion animations
- Glass morphism effects
- Smooth transitions
- Loading skeletons
- Error states
```

## Prompt 4: Revenue Chart Component

```
Create a RevenueChart component using Recharts that visualizes creator revenue potential.

File: components/analytics/RevenueChart.tsx

Requirements:
1. Display actual vs potential revenue over time
2. Use Recharts library (already installed)
3. Responsive and animated
4. Dark theme styling

Chart specifications:
- Type: Line chart with 2 lines
- Line 1: Actual Revenue (solid green line, #10b981)
- Line 2: Potential Revenue (dashed blue line, #3b82f6)
- X-axis: Months (Jan-Jun or last 6 months)
- Y-axis: Dollar amounts (format: $50K, $100K)
- Grid: Subtle gray lines (#374151)
- Tooltip: Dark background, show both values
- Legend: Bottom, clear labels

Additional features:
- Show opportunity gap (shaded area between lines)
- Display "+$14,000/month opportunity" badge
- Animate on mount (lines draw in)
- Handle no data gracefully (show mock data)

Also create a CategoryBreakdown pie chart:
- Shows revenue by category (Fashion, Tech, Beauty, etc.)
- Use distinct colors
- Show percentages
- Interactive hover states

Export both as reusable components with TypeScript props.
```

## Prompt 5: Real-time Analysis Progress

```
Create a real-time progress component that shows analysis status while scraping.

File: components/analysis/ProgressTracker.tsx

Requirements:
1. Show which platform is currently being scraped
2. Update in real-time (polling or websocket)
3. Beautiful animations
4. Clear status indicators

UI Design:
- Glass morphism card container
- List of platforms with status:
  ✓ Completed (green)
  ⟳ In Progress (blue, spinning)
  ○ Pending (gray)
  ✗ Failed (red, but continue)

For each platform show:
- Platform icon/name
- Status indicator
- Time taken
- Links found count

Additional elements:
- Overall progress bar at top (0-100%)
- Elapsed time counter
- Cancel button
- "Almost done..." encouragement messages

Animations:
- Smooth progress bar fills
- Platforms slide in as they start
- Checkmark animation on complete
- Gentle pulse on active platform

Handle edge cases:
- Partial failures (continue with others)
- Timeout after 30 seconds
- Network disconnection
- Show cached data if available
```

## Prompt 6: Sales Pitch Display Component

```
Create a SalesPitch component that displays AI-generated sales intelligence.

File: components/sales/PitchDisplay.tsx

Requirements:
1. Display personalized pitch for approaching creator
2. Show key talking points
3. Include objection handlers
4. Beautiful, professional formatting

Layout:
TOP SECTION - Intelligence Score:
- Close Probability: 73% (big, with gauge chart)
- Deal Size: $8,500/month
- Priority: HIGH (colored badge)
- Best Contact Method: Email/DM

PITCH SECTION:
- Formatted email/message template
- Personalized with creator name
- Highlighted key points (use yellow)
- Copy button for entire pitch

TALKING POINTS:
- Bulleted list with icons
- Color-coded by importance
- Examples:
  "📊 Missing 40% revenue without aggregator"
  "💰 Similar creators earning $15K+/month"
  "🎯 Your 5.2% engagement = 3x average"

OBJECTION HANDLERS:
- Common objections with responses
- Expandable accordion format
- "If they say X, respond with Y"

ACTION ITEMS:
- Checklist of next steps
- Checkable items
- Priority order

Styling:
- Professional but modern
- Easy to read (good contrast)
- Copy functionality throughout
- Export as PDF option
```

## Prompt 7: Search with Autocomplete

```
Create an intelligent search component with autocomplete and suggestions.

File: components/search/CreatorSearch.tsx

Requirements:
1. Central search bar on landing page
2. Autocomplete from database
3. Show suggested creators
4. Handle various input formats

Features:
INPUT HANDLING:
- Accept: @username, username, "Real Name"
- Strip unnecessary characters
- Case insensitive
- Debounced API calls (300ms)

AUTOCOMPLETE:
- Query Supabase for existing creators
- Show top 5 matches
- Display with mini stats (followers, platform)
- Keyboard navigation (up/down arrows)

SUGGESTIONS:
- Show trending creators
- Recently analyzed
- Categories (Gaming, Fashion, Tech)
- Quick select buttons

SEARCH STATES:
- Idle: Show placeholder
- Typing: Show autocomplete
- Searching: Loading spinner
- Not Found: Suggest similar or start analysis
- Error: Friendly message with retry

UI Design:
- Large, prominent input
- Glass morphism style
- Smooth animations
- Mobile-friendly touch targets
- Clear button (X) when typing

Integration:
- On select: Navigate to creator page
- If new: Trigger analysis
- Save recent searches
- Track popular searches
```

## Prompt 8: Export Report Generator

```
Create a PDF report generator for creator intelligence data.

File: components/export/ReportGenerator.tsx

Requirements:
1. Generate professional PDF reports
2. Include all dashboard data
3. Formatted for business use
4. Charts and visualizations included

Report Sections:

COVER PAGE:
- Creator name and photo
- Date generated
- Total revenue potential
- Executive summary

OVERVIEW:
- Key metrics grid
- Platform breakdown
- Total reach
- Engagement rates

REVENUE ANALYSIS:
- Revenue chart (convert to static image)
- Category breakdown pie chart
- Month-over-month growth
- Opportunity analysis

AFFILIATE BREAKDOWN:
- Table of all affiliates found
- Brands and products
- Confidence scores
- Links and sources

SALES INTELLIGENCE:
- Recommended approach
- Talking points
- Estimated deal value
- Contact information

APPENDIX:
- Raw data tables
- Methodology notes
- Timestamp and version

Technical Requirements:
- Use react-pdf or jsPDF
- Handle chart conversion to images
- A4 format, professional layout
- Company branding optional
- < 5 second generation

Also create CSV export:
- Flatten nested data
- Include all metrics
- Proper headers
- UTF-8 encoding
```

## Prompt 9: API Route Handler

```
Create the main API route for triggering creator analysis.

File: app/api/analyze/route.ts

Requirements:
1. Accept POST with creator username
2. Check if exists in database
3. Trigger backend scraping if needed
4. Handle concurrent requests properly
5. Return appropriate status codes

Flow:
1. Validate input (username required)
2. Check Supabase for existing creator
3. If exists and recent (<24h), return cached
4. If stale or missing, trigger analysis:
   - Call your Node.js backend
   - Create job in database
   - Return 202 Accepted with job ID
5. Setup polling endpoint for status

Error Handling:
- Rate limiting (max 10/minute per IP)
- Timeout after 30 seconds
- Duplicate request detection
- Invalid username format
- Backend service down

Response Format:
Success (200):
{
  creator: { full data },
  cached: boolean,
  analyzedAt: timestamp
}

Analyzing (202):
{
  status: "analyzing",
  jobId: "uuid",
  estimatedTime: 30
}

Error (400/500):
{
  error: "message",
  code: "ERROR_CODE"
}

Include logging, monitoring, and graceful degradation.
```

## Prompt 10: Mobile Responsive Layout

```
Create responsive mobile layouts for all dashboard components.

Requirements:
1. Works on phones (320px minimum)
2. Touch-friendly (44px tap targets)
3. Optimized performance
4. Native feel

Mobile Adaptations:

LANDING PAGE:
- Stack hero content vertically
- Full-width search bar
- Horizontal scroll for creator cards
- Larger touch targets

CREATOR DASHBOARD:
- Single column layout
- Collapsible sections
- Swipeable tabs
- Bottom sheet for actions
- Sticky header with key metric

CHARTS:
- Horizontal scroll for wide charts
- Simplified mobile versions
- Touch to see details
- Pinch to zoom

TABLES:
- Horizontal scroll
- Frozen first column
- Expandable rows
- Mobile-optimized columns

NAVIGATION:
- Bottom tab bar
- Hamburger menu
- Gesture navigation
- Pull to refresh

Performance:
- Lazy load images
- Virtualized lists
- Reduced animations
- Progressive enhancement

Test on:
- iPhone SE (375px)
- iPhone 14 (390px)
- Android (360px)
- Tablet (768px)
```

## Usage Instructions

### For Best Results:

1. **Start with Setup** - Database schema and Next.js shell first
2. **Build Core Pages** - Landing and creator dashboard
3. **Add Visualizations** - Charts and metrics
4. **Polish** - Animations, mobile, exports

### Quick Test Commands:
```bash
# Start development
npm run dev

# Test API
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"username":"therock"}'

# Build and preview
npm run build && npm start
```

### Remember:
- **Show the $56K number HUGE** - It's your hero metric
- **Make it beautiful** - First impressions matter
- **Keep it fast** - <3 second load times
- **Mobile matters** - Test on phone before demo