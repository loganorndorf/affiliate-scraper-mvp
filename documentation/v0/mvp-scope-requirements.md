# 2-Day MVP: Affiliate Detection Proof of Concept
## Version 0.1.0 - Minimal Viable Demo

## What We're Building

A simple tool that:
1. Takes an Instagram username
2. Scrapes their last 30 posts
3. Detects affiliate content with high accuracy
4. Outputs a report showing hidden revenue opportunities
5. Runs locally with minimal setup

## What We're NOT Building (Yet)

- Authentication/user management
- Database persistence (use JSON files)
- Multiple platforms (Instagram only)
- API (CLI or simple web UI only)
- Scaling infrastructure
- Payment processing
- Real-time updates
- Email notifications

## Success Criteria

- Can analyze 5 athletes in demo
- Finds 3x more affiliates than visible
- Generates one "holy shit" insight
- Runs without errors for 10 minutes
- Takes < 30 seconds per athlete

## The Demo Flow

1. User enters: "k.mbappe"
2. System shows: "Analyzing Kylian Mbappé..."
3. Progress bar shows scraping
4. Results appear with:
   - Products found: 23
   - Brands detected: 8
   - Hidden revenue: $45,000/month
   - Confidence scores
5. User reaction: "How did you find all that?"

## Tech Stack (Simplest Possible)

- **Runtime**: Node.js + TypeScript
- **Scraping**: Puppeteer
- **Web Server**: Express
- **Database**: None (JSON files)
- **Cache**: In-memory + JSON files
- **Deployment**: Local only

## Time Allocation

### Day 1 (8 hours)
- **2h**: Setup & Instagram scraper
- **3h**: Affiliate detection logic
- **2h**: Data processing
- **1h**: Testing with real accounts

### Day 2 (8 hours)
- **2h**: Simple web UI
- **2h**: Report generation
- **2h**: Polish & error handling
- **2h**: Demo preparation & testing

## Demo Athletes (Pre-Researched)

1. **@cristiano** - Obvious affiliates (control)
2. **@k.mbappe** - Mix of obvious and hidden
3. **@sergioramos** - Hidden affiliates
4. **@leomessi** - Subtle brand partnerships
5. **@neymarjr** - Complex affiliate network

## Key Metrics to Achieve

- **Scraping Speed**: <30 seconds per athlete
- **Detection Accuracy**: >90% for obvious, >70% for hidden
- **False Positive Rate**: <10%
- **UI Response Time**: <2 seconds
- **Cache Hit Rate**: >80% during demo

## Risk Mitigation

### Primary Risks
1. **Instagram blocks scraping**: Use mobile user agents, add delays
2. **Rate limiting**: Implement caching, have backup data
3. **No affiliates found**: Pre-validate demo accounts
4. **Technical failure during demo**: Have video backup

### Backup Plans
- Pre-scraped JSON data for all demo accounts
- Screenshots of impressive findings
- Local video demonstration
- Cached results from previous runs

## Definition of Done

- [ ] Scrapes Instagram without authentication
- [ ] Detects 5+ affiliate patterns
- [ ] Generates revenue estimates
- [ ] Simple but professional UI
- [ ] Works for 5 pre-selected athletes
- [ ] Demo runs smoothly 3 times in a row
- [ ] Backup data prepared
- [ ] 3-minute demo script ready