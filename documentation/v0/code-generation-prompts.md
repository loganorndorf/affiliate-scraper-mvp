# AI Code Generation Prompts
## Copy-Paste Ready Prompts for Each Component

## Prompt 1: Instagram Scraper

```
Create a TypeScript class called InstagramScraper using Puppeteer that scrapes Instagram profiles and posts without authentication. Requirements:

1. Use Puppeteer with these specific settings:
   - Headless mode
   - Mobile iPhone user agent
   - 390x844 viewport
   - Disable GPU and sandbox for performance

2. Implement these methods:
   - initialize(): Set up browser and page
   - scrapeProfile(username: string): Get profile data including follower count, bio, post count
   - scrapePosts(username: string, limit: number = 30): Get recent posts with captions and engagement
   - close(): Clean up browser

3. Handle follower count formatting:
   - Convert "10.5K" to 10500
   - Convert "1.5M" to 1500000
   - Handle regular numbers with commas

4. For each post, extract:
   - Caption text
   - Hashtags (regex: #\w+)
   - Mentions (regex: @[\w.]+)
   - Likes and comments count
   - Post ID and URL
   - Timestamp

5. Error handling:
   - Catch rate limiting (429 errors)
   - Handle private accounts
   - Timeout after 30 seconds
   - Return structured error objects

6. Use these TypeScript interfaces:
interface AthleteProfile {
  username: string;
  fullName: string;
  bio: string;
  followerCount: number;
  postCount: number;
  isVerified: boolean;
}

interface Post {
  id: string;
  caption: string;
  likes: number;
  comments: number;
  hashtags: string[];
  mentions: string[];
}

Include delays between actions to avoid rate limiting. Make it production-ready with proper error handling.
```

## Prompt 2: Affiliate Detection Engine

```
Create a TypeScript class called AffiliateDetector that identifies affiliate content in social media posts. Requirements:

1. Detect these affiliate signals:
   - Discount codes (patterns like "CODE: ATHLETE20", "use SUMMER20", "save with FITFAM")
   - Brand mentions (check against provided brand list)
   - Promo language ("link in bio", "swipe up", "check out", "get yours")
   - Affiliate hashtags (#ad, #sponsored, #partner)
   - Affiliate URLs (amazon.com?tag=, amzn.to, click.linksynergy.com)

2. Use these detection patterns:
const DISCOUNT_PATTERNS = [
  /(?:code|promo|discount)[\s:]*([A-Z0-9]{4,20})/gi,
  /use\s+([A-Z0-9]{4,20})\s+(?:for|to\s+get)/gi,
  /save\s+(?:with\s+)?([A-Z0-9]{4,20})/gi
];

const BRANDS = ['Nike', 'Adidas', 'Gymshark', 'Lululemon', ...];

3. Calculate confidence scores:
   - Explicit #ad = 95% confidence
   - Discount code found = 90% confidence
   - Brand + promo language = 75% confidence
   - Multiple signals = additive boost
   - Return 0-100 score

4. Return this structure:
interface AffiliateDetection {
  type: 'discount_code' | 'brand_mention' | 'promo_text' | 'hashtag';
  value: string;
  confidence: number;
  brand?: string;
  context?: string;
}

5. Implement methods:
   - detectAffiliates(post: Post): AffiliateDetection[]
   - detectDiscountCodes(text: string): AffiliateDetection[]
   - detectBrandMentions(text: string, mentions: string[]): AffiliateDetection[]
   - calculateOverallConfidence(detections: AffiliateDetection[]): number

6. Focus on high precision - better to miss some than have false positives.

Make it fast and accurate for real-time processing.
```

## Prompt 3: Express API Server

```
Create an Express server in TypeScript for the affiliate detection API. Requirements:

1. Setup Express with:
   - CORS enabled for all origins
   - JSON body parsing
   - Static file serving for public folder
   - Port 3000 (configurable via env)

2. Implement these endpoints:

POST /api/analyze
- Body: { username: string }
- Process: 
  1. Check cache first (data/cache/{username}.json)
  2. If not cached or expired (>1 hour):
     - Run Instagram scraper
     - Run affiliate detector
     - Generate summary
     - Save to cache
  3. Return AnalysisReport
- Error handling with proper status codes

GET /api/status
- Return { status: 'healthy', timestamp: Date }

GET /api/cache/:username
- Return cached data if exists
- 404 if not found

3. Implement caching:
   - Save to data/cache/ as JSON files
   - Include timestamp
   - Expire after 1 hour
   - Return cached data instantly

4. Structure responses like:
{
  success: boolean,
  data?: AnalysisReport,
  error?: { message: string, code: string },
  cached: boolean,
  timestamp: Date
}

5. Error handling:
   - Rate limiting: 429 with retry-after header
   - Not found: 404 with helpful message
   - Server error: 500 with error ID
   - Validation error: 400 with details

6. Add request logging with timestamp, method, path, duration

Include middleware for request timing and error handling. Make it production-ready.
```

## Prompt 4: Web UI Interface

```
Create a single-page HTML interface for the affiliate detector with embedded CSS and JavaScript. Requirements:

1. Design:
   - Clean, minimal, professional
   - Mobile-responsive
   - Color scheme: white background, green (#10b981) for success, blue for primary
   - System font stack
   - No external dependencies

2. Layout sections:
   - Header: "🔍 Affiliate Detector" title
   - Input section: Text input + Analyze button
   - Loading state: Spinner + progress message
   - Results section: Hidden initially, shows after analysis

3. Results display:
   - Large metric cards showing:
     * Products Found
     * Brands Detected  
     * Hidden Revenue (formatted as currency)
     * Confidence Score (as percentage)
   - List of detections with confidence indicators
   - Key insights section

4. JavaScript functionality:
async function analyze() {
  - Get username from input
  - Show loading state
  - Call POST /api/analyze
  - Handle errors gracefully
  - Display results with animation
  - Format numbers with commas
  - Show confidence with color coding
}

5. Loading states:
   - Disable button during processing
   - Show progress messages ("Analyzing profile...", "Detecting affiliates...")
   - Smooth transitions

6. Error handling:
   - Network errors: "Connection failed. Please try again."
   - Rate limiting: "Too many requests. Please wait..."
   - Not found: "Account not found. Check the username."
   - Empty results: "No affiliates detected for this account."

7. Responsive breakpoints:
   - Mobile: <768px (stack cards vertically)
   - Desktop: ≥768px (grid layout)

Include inline CSS and JavaScript. No build step required. Make it look professional and trustworthy.
```

## Prompt 5: Analyzer Integration Class

```
Create a TypeScript class called Analyzer that combines the scraper and detector. Requirements:

1. Integrate these components:
   - InstagramScraper for data collection
   - AffiliateDetector for analysis
   - Cache system for performance

2. Main method - analyze(username: string):
   - Check cache first (if less than 1 hour old, return it)
   - Initialize scraper
   - Scrape profile
   - Scrape posts (limit 30)
   - Run detection on each post
   - Aggregate results
   - Calculate summary metrics
   - Generate insights
   - Save to cache
   - Return complete AnalysisReport

3. Calculate these metrics:
   - Total posts analyzed
   - Posts with affiliates (count and percentage)
   - Unique brands found
   - Unique discount codes
   - Estimated monthly revenue (based on engagement)
   - Hidden vs obvious affiliates
   - Overall confidence score

4. Generate insights like:
   - "Found X hidden affiliate relationships"
   - "Estimated $Y in monthly untracked revenue"
   - "Most promoted brand: Z (N mentions)"
   - "Peak affiliate activity: [time period]"

5. Revenue estimation formula:
   - Base: (likes + comments) * $0.01
   - Multiply by confidence score
   - Adjust for follower count tier
   - Sum across all affiliate posts

6. Implement caching:
   - Save to data/cache/{username}.json
   - Include timestamp
   - Compress if over 1MB
   - Auto-cleanup old cache files

7. Error handling:
   - Graceful degradation if scraping fails
   - Partial results if some posts fail
   - Always return something useful

8. Performance targets:
   - Complete analysis in <30 seconds
   - Use Promise.all for parallel processing
   - Efficient memory usage

Return comprehensive AnalysisReport with all findings. Make it robust and production-ready.
```

## Prompt 6: Brand Dictionary and Patterns

```
Create a comprehensive brand dictionary and pattern file for sports/fitness affiliate detection. Requirements:

1. Create brands.ts with categorized lists:

export const SPORTS_BRANDS = {
  apparel: ['Nike', 'Adidas', 'Under Armour', 'Puma', 'Reebok', ...],
  athleisure: ['Lululemon', 'Gymshark', 'Fabletics', 'Athleta', ...],
  nutrition: ['Optimum Nutrition', 'Gatorade', 'Prime', 'Celsius', ...],
  equipment: ['Theragun', 'Hyperice', 'Fitbit', 'Garmin', ...],
  retailers: ['Amazon', 'Dick\'s Sporting Goods', 'Foot Locker', ...]
};

2. Create patterns.ts with regex patterns:

export const DISCOUNT_PATTERNS = [
  // Direct mentions
  /(?:code|promo|coupon)[\s:]*([A-Z0-9]{4,20})/gi,
  // Action phrases
  /use\s+([A-Z0-9]{4,20})\s+(?:for|to\s+get|at\s+checkout)/gi,
  // Savings language
  /save\s+(?:\d+%\s+)?with\s+([A-Z0-9]{4,20})/gi,
  // Percentage patterns
  /([A-Z0-9]{4,20})\s+for\s+\d{1,2}%\s+off/gi
];

export const AFFILIATE_URL_PATTERNS = [
  /amazon\.com.*[?&]tag=/,
  /amzn\.to\//,
  // Add more affiliate networks
];

export const PROMO_KEYWORDS = [
  'link in bio',
  'swipe up',
  'check out',
  // Add more promo language
];

3. Include brand variations:
   - Handle case variations (Nike, nike, NIKE)
   - Include social handles (@nike, @nikefootball)
   - Common misspellings
   - Abbreviations (ON for Optimum Nutrition)

4. Add helper functions:
   - normalizeBrand(text: string): string
   - isBrandMention(text: string): boolean
   - findAllBrands(text: string): string[]
   - expandBrandAbbreviations(text: string): string

Include at least 100 major sports/fitness brands. Make it comprehensive for sports influencers.
```

## Prompt 7: CLI Testing Tool

```
Create a TypeScript CLI tool for testing the affiliate detector. Requirements:

1. Command structure:
   npm run cli <command> <username> [options]

2. Commands:
   - analyze <username>: Full analysis with pretty output
   - scrape <username>: Just scrape and show profile
   - detect <username>: Run detection on cached data
   - cache:list: Show all cached usernames
   - cache:clear [username]: Clear specific or all cache

3. Pretty console output:
   - Use colors (green for success, red for errors)
   - Format numbers with commas
   - Show progress spinner
   - Display results in tables
   - Highlight key findings

4. Example output format:
   
   ✅ Analysis Complete for @cristiano
   ════════════════════════════════════
   
   📊 METRICS
   Posts Analyzed:     30
   Affiliate Posts:    24 (80%)
   Brands Found:       8
   Revenue Est:        $450,000/month
   
   🏷️ TOP BRANDS
   1. Nike            (12 mentions)
   2. CR7             (8 mentions)
   3. Clear           (5 mentions)
   
   💰 DISCOUNT CODES
   - CR7POWER (confidence: 95%)
   - NIKE20   (confidence: 88%)
   
   🔍 KEY INSIGHTS
   • Found 6 hidden affiliate relationships
   • Peak posting time: 2-4 PM EST
   • Highest engagement: Video posts

5. Options:
   --json: Output as JSON
   --verbose: Show detailed logs
   --no-cache: Force fresh scrape
   --limit <n>: Number of posts to analyze

6. Error handling:
   - Clear error messages
   - Suggest fixes
   - Non-zero exit codes

Make it useful for development and debugging.
```

## Prompt 8: Testing Data Generator

```
Create a TypeScript script that generates realistic test data for the affiliate detector. Requirements:

1. Generate mock Instagram data:
   - Athlete profiles with realistic follower counts
   - Posts with varied caption styles
   - Mix of affiliate and non-affiliate content
   - Realistic engagement numbers

2. Create test fixtures:

export function generateMockProfile(username: string): AthleteProfile {
  // Generate realistic profile data
  // Follower counts between 10K - 100M
  // Verified accounts for >1M followers
  // Bio with emojis and brand mentions
}

export function generateMockPosts(count: number, affiliateRate: number = 0.3): Post[] {
  // Mix of post types
  // Varied caption lengths
  // Realistic hashtag usage
  // Some with discount codes
  // Some with brand mentions
  // Engagement based on follower count
}

3. Caption templates:

const AFFILIATE_TEMPLATES = [
  "Just crushed my workout in @{brand} gear! Use code {code} for 20% off",
  "My favorite {product} from @{brand} - link in bio!",
  "AD: Training with @{brand} #{brand}athlete #{sponsored}"
];

const NORMAL_TEMPLATES = [
  "Great training session today! 💪",
  "Blessed to be here 🙏",
  "Hard work pays off!"
];

4. Generate edge cases:
   - Empty captions
   - Foreign languages
   - Special characters
   - Very long captions
   - Many hashtags
   - No engagement

5. Save test data:
   - Output to data/test/
   - Different athlete profiles
   - Varied affiliate densities
   - Include timestamps

6. Validation:
   - Ensure data is realistic
   - Proper JSON structure
   - Consistent relationships

Create comprehensive test data covering all scenarios.
```

## How to Use These Prompts

### For Best Results:

1. **Use with Claude 3.5 or GPT-4**: These models understand the context better
2. **Provide Context**: Start with "I'm building a 2-day MVP for affiliate detection"
3. **Iterate**: If the first output isn't perfect, ask for specific improvements
4. **Combine Outputs**: Use multiple prompts together for the complete system

### Prompt Chaining Example:

```
First: "Use Prompt 1 to create the scraper"
Then: "Now use Prompt 2 to create the detector that works with this scraper"
Then: "Create the analyzer class that combines these two components"
Finally: "Create the web interface that calls the analyzer"
```

### Customization:

Feel free to modify these prompts based on:
- Specific requirements you discover
- Performance constraints
- Additional features needed
- Feedback from testing

### Testing Each Component:

After generating each component:
1. Test it in isolation first
2. Fix any syntax errors
3. Verify it meets requirements
4. Then integrate with other components

Remember: These prompts are optimized for quick generation of working code, not perfect production code. You'll need to refine and optimize after the initial generation.