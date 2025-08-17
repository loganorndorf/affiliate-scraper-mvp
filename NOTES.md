# Development Notes

## Instagram Scraper Investigation Needed

### Current Status
- Basic Instagram scraper implemented but has limited success
- Can reach profile pages but Instagram shows login walls
- Meta tag extraction works but misses bio links
- Currently fails to extract the most important data (bio links)

### Issues to Investigate
1. **Login Wall Bypass**: Research methods to avoid Instagram's login requirements
   - Different user agents (mobile vs desktop)
   - Using Instagram Basic Display API instead of scraping
   - Rotating IP addresses or proxies
   - Session management techniques

2. **Alternative Data Sources**: 
   - Instagram embeds (instagram.com/p/embed)
   - Third-party Instagram tools/APIs
   - Social media aggregation services

3. **Rate Limiting**: 
   - Optimal request timing between profiles
   - Browser fingerprint randomization
   - Request header variation

4. **Selector Updates**:
   - Instagram frequently changes their HTML structure
   - Need more robust selector strategies
   - Backup extraction methods

### Priority
- **Low priority for MVP** - Linktree extraction provides 80% of value
- **Medium priority for production** - Would significantly improve automation
- **Consider paid solutions** - Instagram APIs or third-party services

### Fallback Strategy (Current)
- Try Instagram first, continue if fails
- Ask user for Linktree URL manually
- Focus on Linktree/Beacons extraction (proven to work)

### Next Steps
- Research Instagram scraping best practices
- Investigate official Instagram APIs
- Test with different user agents and request patterns
- Consider headless browser alternatives (Playwright, etc.)

## YouTube API Key Required

### Status
- YouTube extractor implemented and ready
- Structure tested with mock data
- URL extraction and affiliate detection working
- **NEEDS**: YouTube Data API v3 key for testing

### To Get API Key
1. Go to https://console.cloud.google.com
2. Create new project or select existing
3. Enable YouTube Data API v3
4. Create credentials (API key)
5. Set YOUTUBE_API_KEY environment variable
6. Test with: `YOUTUBE_API_KEY=your_key npx ts-node src/extractors/social/youtube.ts`

### Expected Results
- MrBeast: 10+ affiliate links per video description
- MKBHD: Tech affiliate links
- Emma Chamberlain: Brand partnership links