# Step-by-Step Implementation Guide
## Exactly What to Build in What Order

## Hour 1-2: Project Setup

### Initial Setup Commands
```bash
# Create project directory
mkdir affiliate-detector-mvp
cd affiliate-detector-mvp

# Initialize npm project
npm init -y

# Install dependencies
npm install typescript @types/node puppeteer express cors dotenv
npm install -D nodemon ts-node @types/express @types/cors

# Initialize TypeScript
npx tsc --init

# Create folder structure
mkdir -p src/{scraper,detector,analyzer,web/public} data/{cache,reports}

# Create initial files
touch src/scraper/{types.ts,instagram.ts}
touch src/detector/{detector.ts,brands.ts,patterns.ts}
touch src/analyzer/analyzer.ts
touch src/web/{server.ts,public/index.html}
touch src/cli.ts
touch .env.example README.md
```

### Configure tsconfig.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

### Update package.json scripts
```json
{
  "scripts": {
    "dev": "nodemon --exec ts-node src/cli.ts",
    "dev:web": "nodemon --exec ts-node src/web/server.ts",
    "build": "tsc",
    "start": "node dist/web/server.js",
    "test:scrape": "ts-node src/cli.ts scrape cristiano",
    "test:analyze": "ts-node src/cli.ts analyze cristiano",
    "cache:clear": "rm -rf data/cache/*"
  }
}
```

## Hour 3-4: Instagram Scraper

### Step 1: Create Type Definitions
Create `src/scraper/types.ts` with all interfaces from the Technical Spec.

### Step 2: Implement Basic Scraper
Create `src/scraper/instagram.ts`:

1. **Initialize Puppeteer with mobile settings**
2. **Implement profile scraping**
3. **Test with a real account**

### Step 3: Test Profile Scraping
```bash
# Create test file
cat > src/test-scraper.ts << 'EOF'
import { InstagramScraper } from './scraper/instagram';

async function test() {
  const scraper = new InstagramScraper();
  await scraper.initialize();
  
  try {
    const profile = await scraper.scrapeProfile('cristiano');
    console.log('Profile:', JSON.stringify(profile, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await scraper.close();
  }
}

test();
EOF

# Run test
npx ts-node src/test-scraper.ts
```

### Step 4: Add Post Scraping
Once profile works, add post extraction:
1. Navigate to first post
2. Extract caption, likes, comments
3. Navigate between posts
4. Test with 5 posts first

## Hour 5-6: Detection Engine

### Step 1: Create Brand Dictionary
Create `src/detector/brands.ts`:
```typescript
export const SPORTS_BRANDS = [
  // Top Sports Apparel
  'Nike', 'Adidas', 'Under Armour', 'Puma', 'Reebok',
  'New Balance', 'Lululemon', 'Gymshark', 'Fabletics', 'Athleta',
  
  // Sports Nutrition
  'Optimum Nutrition', 'Gatorade', 'Monster Energy', 'Red Bull',
  'Prime', 'Celsius', 'BodyArmor', 'Liquid IV', 'C4', 'Ghost',
  
  // Equipment & Tech
  'Theragun', 'Hyperice', 'Fitbit', 'Garmin', 'Whoop', 'Oura',
  'Peloton', 'Mirror', 'Tonal', 'NordicTrack',
  
  // Retailers
  'Amazon', 'Dick\'s Sporting Goods', 'Foot Locker', 'Finish Line',
  'Eastbay', 'Fanatics', 'Nike Store', 'Adidas Store'
];
```

### Step 2: Create Pattern Definitions
Create `src/detector/patterns.ts`:
```typescript
export const DISCOUNT_PATTERNS = [
  /(?:code|promo|discount|coupon)[\s:]*([A-Z0-9]{4,20})/gi,
  /use\s+([A-Z0-9]{4,20})\s+(?:for|to\s+get|at)/gi,
  /([A-Z0-9]{4,20})\s+(?:saves?|gets?)\s+you/gi,
  /save\s+(?:\d+%\s+)?with\s+([A-Z0-9]{4,20})/gi
];

export const AFFILIATE_URL_PATTERNS = [
  /amazon\.com.*[?&]tag=/,
  /amzn\.to\//,
  /click\.linksynergy\.com/,
  /go\.redirectingat\.com/,
  /[?&]ref=/,
  /[?&]utm_source=/,
  /[?&]affiliate/
];

export const PROMO_KEYWORDS = [
  'link in bio', 'swipe up', 'check out', 'shop now',
  'get yours', 'available at', 'use my code', 'discount',
  'save', 'promo', 'offer', 'deal', 'sale', '% off'
];
```

### Step 3: Implement Detector
Create the detector class with methods for each detection type.

### Step 4: Test Detection
```typescript
// src/test-detector.ts
import { AffiliateDetector } from './detector/detector';

const detector = new AffiliateDetector();

const testCaptions = [
  "Love my new @nike shoes! Use code ATHLETE20 for 20% off #ad",
  "Morning workout with my @gymshark fit 💪",
  "Check out my favorite supplements - link in bio!",
  "Just a regular post with no affiliates"
];

testCaptions.forEach(caption => {
  console.log('\nCaption:', caption);
  const post = { caption, hashtags: [], mentions: [] };
  const detections = detector.detectAffiliates(post);
  console.log('Detections:', detections);
});
```

## Hour 7-8: Integration & Testing

### Step 1: Create Analyzer
Create `src/analyzer/analyzer.ts` to combine scraper and detector:
```typescript
import { InstagramScraper } from '../scraper/instagram';
import { AffiliateDetector } from '../detector/detector';
import { AnalysisReport } from '../scraper/types';

export class Analyzer {
  private scraper: InstagramScraper;
  private detector: AffiliateDetector;
  
  constructor() {
    this.scraper = new InstagramScraper();
    this.detector = new AffiliateDetector();
  }
  
  async analyze(username: string): Promise<AnalysisReport> {
    // 1. Check cache first
    // 2. Scrape profile
    // 3. Scrape posts
    // 4. Detect affiliates
    // 5. Generate summary
    // 6. Cache results
    // 7. Return report
  }
}
```

### Step 2: Create CLI Interface
Create `src/cli.ts` for testing:
```typescript
#!/usr/bin/env node

import { Analyzer } from './analyzer/analyzer';

async function main() {
  const command = process.argv[2];
  const username = process.argv[3];
  
  if (!command || !username) {
    console.log('Usage: npm run dev <command> <username>');
    console.log('Commands: analyze, scrape, detect');
    process.exit(1);
  }
  
  const analyzer = new Analyzer();
  
  switch (command) {
    case 'analyze':
      const report = await analyzer.analyze(username);
      console.log(JSON.stringify(report, null, 2));
      break;
    // Add other commands
  }
}

main().catch(console.error);
```

### Step 3: Test with Real Athletes
```bash
# Test each component
npm run test:scrape
npm run test:analyze

# Test with different athletes
ts-node src/cli.ts analyze cristiano
ts-node src/cli.ts analyze k.mbappe
```

## Day 2, Hour 1-2: Web Interface

### Step 1: Create Express Server
Create `src/web/server.ts`:
```typescript
import express from 'express';
import cors from 'cors';
import path from 'path';
import { Analyzer } from '../analyzer/analyzer';

const app = express();
const analyzer = new Analyzer();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/analyze', async (req, res) => {
  try {
    const { username } = req.body;
    
    // Check cache
    const cached = await checkCache(username);
    if (cached) {
      return res.json(cached);
    }
    
    // Analyze
    const report = await analyzer.analyze(username);
    
    // Cache results
    await saveCache(username, report);
    
    res.json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
```

### Step 2: Test API Endpoint
```bash
# Start server
npm run dev:web

# Test with curl
curl -X POST http://localhost:3000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"username":"cristiano"}'
```

## Hour 3-4: UI Creation

### Create HTML Interface
Create `src/web/public/index.html` - see the full HTML template in the Technical Spec.

### Add Basic Styling
Create `src/web/public/style.css` with clean, minimal design.

### Test Full Flow
1. Open http://localhost:3000
2. Enter username
3. See results
4. Verify all metrics display correctly

## Hour 5-6: Report Generation

### Step 1: Add Summary Calculations
Enhance the analyzer to calculate:
- Total revenue estimates
- Hidden vs obvious affiliates
- Confidence scores
- Top brands

### Step 2: Generate Insights
Add insight generation logic:
```typescript
function generateInsights(report: AnalysisReport): string[] {
  const insights = [];
  
  if (report.summary.hiddenAffiliates > 5) {
    insights.push(`Found ${report.summary.hiddenAffiliates} hidden affiliate relationships`);
  }
  
  if (report.summary.estimatedMonthlyRevenue > 10000) {
    insights.push(`Estimated monthly revenue: $${report.summary.estimatedMonthlyRevenue.toLocaleString()}`);
  }
  
  // Add more insight logic
  
  return insights;
}
```

## Hour 7-8: Demo Preparation

### Step 1: Pre-cache Demo Accounts
```bash
# Cache all demo accounts
for username in cristiano k.mbappe leomessi neymarjr sergioramos; do
  ts-node src/cli.ts analyze $username
done
```

### Step 2: Create Backup Data
Save successful responses to `data/backup/` folder.

### Step 3: Practice Demo Flow
1. Run through demo 5 times
2. Time each run (should be <3 minutes)
3. Prepare for common questions
4. Test error scenarios

### Step 4: Create Demo Script
Write out exactly what to say and when.

## Testing Checklist

Before demo, ensure:
- [ ] All 5 demo accounts work
- [ ] UI loads instantly
- [ ] Results appear in <30 seconds
- [ ] No console errors
- [ ] Cache is working
- [ ] Backup data ready
- [ ] Confident in demo flow

## Common Issues & Solutions

### Rate Limiting
- Add delays between requests
- Use cache aggressively
- Have backup data ready

### Scraping Fails
- Check if Instagram changed layout
- Try different user agent
- Use cached/backup data

### No Affiliates Found
- Verify detection patterns
- Check if account has posts
- Use known good accounts

### Performance Issues
- Reduce number of posts scraped
- Optimize detection algorithms
- Use more aggressive caching