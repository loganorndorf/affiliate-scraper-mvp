# Affiliate Link Scraper - 2-Day MVP

A comprehensive creator onboarding system that automatically discovers and extracts affiliate links across multiple social media platforms, turning hours of manual work into seconds of automated intelligence.

## Project Overview

This system automates the traditionally labor-intensive process of creator onboarding by automatically discovering affiliate links, brand partnerships, and product recommendations from a creator's social media presence. Built with a focus on the 80/20 principle - capturing 80% of the value with 20% of the complexity.

### What This System Does

- **Multi-Platform Discovery**: Automatically searches across 6+ platforms (Instagram, TikTok, YouTube, Twitter, Linktree, Beacons) to find affiliate links
- **Intelligent Link Extraction**: Discovers affiliate links from bio links, post captions, video descriptions, and other content
- **Link Intelligence**: Expands shortened URLs, detects affiliate parameters, identifies brands, and classifies link types
- **Deduplication Engine**: Smart consolidation of duplicate links found across different platforms
- **Creator Intelligence**: Generates actionable insights about creator value, platform usage, and business potential
- **Self-Service Onboarding Flow**: Frontend interface allowing creators to import all their links automatically

## Architecture Overview

The system consists of three main components:

### 1. Backend Discovery Engine (`/src/`)
- **Multi-Platform Extractors**: Individual scrapers for each platform (Instagram, TikTok, YouTube, etc.)
- **Universal Orchestrator**: Coordinates parallel extraction across all platforms
- **Link Processing Pipeline**: URL expansion, affiliate detection, brand identification
- **Intelligence Layer**: Deduplication, creator analysis, and competitive insights

### 2. Creator Onboarding Frontend (`/creator-onboarding/`)
- **Next.js Application**: React-based self-service onboarding interface
- **Real-time Progress**: Live updates showing discovery progress across platforms
- **Link Management**: Review, edit, and select discovered links
- **Integration Ready**: API endpoints for importing data to external systems

### 3. Documentation & Testing (`/documentation/`)
- Comprehensive implementation guides
- Testing checklists and validation procedures
- Technical specifications and API documentation

## Technology Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Web Scraping**: Puppeteer, Playwright for browser automation
- **API Integration**: YouTube Data API, other platform APIs where available
- **Processing**: Parallel extraction, intelligent deduplication
- **Data Output**: Structured JSON with comprehensive metadata

### Frontend
- **Framework**: Next.js 15 with React 19
- **Styling**: Tailwind CSS
- **UI Components**: Lucide React icons, Framer Motion animations
- **State Management**: SWR for data fetching, custom hooks
- **Real-time Updates**: Polling-based progress tracking

### Development Tools
- **TypeScript**: Full type safety across the stack
- **ESLint**: Code quality and consistency
- **Environment Management**: dotenv for configuration

## Setup and Installation

### Prerequisites
- Node.js 18+ and npm
- YouTube Data API key (optional, for YouTube extraction)

### Backend Setup
```bash
# Clone the repository
git clone [repository-url]
cd affiliate-scraper/2-day-mvp

# Install backend dependencies
npm install

# Copy environment file (if using YouTube API)
cp .env.example .env
# Add your YOUTUBE_API_KEY to .env

# Build TypeScript
npm run build
```

### Frontend Setup
```bash
# Navigate to frontend directory
cd creator-onboarding

# Install frontend dependencies
npm install

# Start development server
npm run dev
```

## Usage Instructions

### Command Line Interface

#### Basic Extraction
```bash
# Extract from a single creator
npm run extract cristiano

# With manual bio link
npm run extract therock https://linktr.ee/therock

# Universal discovery across all platforms
npm run discover MrBeast
```

#### Batch Testing
```bash
# Test multiple creators at once
npm run batch-test
```

### Web Interface

1. Start the frontend development server: `npm run dev` in `/creator-onboarding/`
2. Visit `http://localhost:3000`
3. Enter a creator's username or Instagram handle
4. Watch real-time discovery across platforms
5. Review and select discovered links
6. Export or integrate with your system

## Key Features and Functionality

### 🎯 Multi-Platform Discovery
- **Linktree/Beacons**: Extracts all links from link aggregation platforms
- **Instagram**: Bio link discovery (when accessible)
- **TikTok**: Bio links and video descriptions
- **YouTube**: Channel info and video descriptions via official API
- **Twitter/X**: Bio links and pinned tweets via Nitter
- **Website Discovery**: Finds personal websites and additional link sources
- **Amazon Storefronts**: Specialized Amazon influencer storefront detection

### 🔍 Intelligent Processing
- **URL Expansion**: Follows redirects to reveal final destinations
- **Affiliate Detection**: Identifies Amazon, ShareASale, and custom affiliate parameters
- **Brand Recognition**: Matches links to known brands and retailers
- **Link Classification**: Categorizes links by type (affiliate, social, e-commerce, etc.)
- **Deduplication**: Smart removal of duplicate links found across platforms

### 📊 Creator Intelligence
- **Competitive Analysis**: Identifies current platform usage (Linktree competitor detection)
- **Value Estimation**: Calculates potential annual affiliate revenue
- **Platform Insights**: Primary platform identification and total reach calculation
- **Business Recommendations**: Priority scoring for business development

### ⚡ Performance Optimized
- **Parallel Processing**: All platforms checked simultaneously
- **Graceful Degradation**: Continues processing even when individual platforms fail
- **Speed Optimized**: Complete discovery in under 30 seconds
- **Rate Limiting**: Respectful of platform limitations

## API Endpoints

### Discovery API
- `POST /api/discover` - Start link discovery for a creator
- `GET /api/status/[jobId]` - Check discovery progress
- `POST /api/validate-username` - Validate creator username format

### Integration API
- `POST /api/faves/import` - Import discovered links to Faves platform

### Response Format
```json
{
  "searchQuery": "creator_name",
  "summary": {
    "totalLinks": 47,
    "uniqueLinks": 31,
    "platformsFound": ["instagram", "youtube", "tiktok"],
    "totalReach": 15000000,
    "primaryPlatform": "youtube",
    "usingCompetitor": "Linktree"
  },
  "allLinks": [...],
  "intelligenceReport": {...},
  "recommendation": {
    "favesPriority": "high",
    "reason": "High-value creator with significant reach",
    "estimatedValue": 150000
  }
}
```

## Current Limitations and Known Issues

### Platform-Specific Limitations
- **Instagram**: Limited by anti-bot measures, bio link extraction may be inconsistent
- **TikTok**: Platform restrictions may affect success rates
- **Twitter/X**: Relies on Nitter proxy which may be unreliable
- **Rate Limits**: Some platforms have strict rate limiting that affects batch processing

### Technical Limitations
- **Authentication**: Currently focused on publicly available data only
- **Real-time Data**: Some platforms may show cached or delayed information
- **JavaScript-Heavy Sites**: Some modern sites may not render properly in headless browsers
- **Mobile vs Desktop**: Different layouts may affect extraction reliability

### Data Quality Issues
- **Link Validation**: Some discovered links may be inactive or expired
- **Brand Detection**: May miss newer brands or misspelled brand names
- **Duplicate Detection**: Complex redirect chains may not always be properly handled

## Future Improvements

### Testing and Reliability
- **Enhanced Test Coverage**: Need to add comprehensive automated tests to prevent data flow issues like we recently experienced with the extraction pipeline
- **Integration Testing**: Improve end-to-end testing of the discovery flow from frontend to backend
- **Error Handling**: Better recovery mechanisms for partial failures

### Platform Improvements
- **Instagram Extractor Reliability**: Update the Instagram extraction logic to handle the platform's evolving anti-bot measures more effectively
- **YouTube Enhancements**: Expand video description parsing to catch more affiliate mentions
- **New Platform Support**: Add support for LinkedIn, Pinterest, and Snapchat

### Data Quality Enhancements
- **Link Validation**: Add better validation of discovered links since they will be displayed in a frontend grid of cards and need to be more reliable overall
- **Real-time Verification**: Implement link checking to ensure discovered URLs are active and accessible
- **Brand Database**: Expand the brand recognition database with more retailers and affiliate programs

### User Experience
- **Batch Import UI**: Frontend interface for processing multiple creators
- **Link Editing**: Enhanced editing capabilities for discovered links
- **Export Options**: Multiple export formats (CSV, JSON, direct API integration)
- **Analytics Dashboard**: Usage statistics and success rate tracking

### Performance and Scale
- **Caching Layer**: Implement Redis-based caching for frequently accessed creator data
- **Background Processing**: Move heavy extraction work to background job queues
- **API Rate Management**: Better handling of platform rate limits with queuing
- **Database Integration**: Store results in PostgreSQL for better querying and management

### Integration Enhancements
- **Webhook Support**: Real-time notifications when discovery completes
- **Multiple Export Targets**: Support for various CRM and marketing platforms
- **API Authentication**: Secure API access for enterprise customers
- **White-label Options**: Customizable branding for different client implementations

## Contributing

This project follows a modular architecture making it easy to add new platforms or improve existing functionality. Key areas for contribution:

1. **New Platform Extractors**: Add support for emerging social platforms
2. **Improved Detection Logic**: Enhance affiliate link and brand detection algorithms
3. **UI/UX Improvements**: Enhance the creator onboarding interface
4. **Performance Optimization**: Improve extraction speed and reliability

## License

[Add your license information here]

---

*This project was built as a 2-day MVP to demonstrate the feasibility of automated creator onboarding at scale. It successfully transforms a 3-hour manual process into a 30-second automated workflow.*