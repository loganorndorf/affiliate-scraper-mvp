# MVP Testing Checklist
## Must Work Before Demo

## Core Functionality Tests

### Scraping Capability
- [ ] Can access Instagram without login
- [ ] Successfully scrapes public profiles
- [ ] Extracts correct follower counts
  - [ ] Handles K notation (10.5K = 10,500)
  - [ ] Handles M notation (1.5M = 1,500,000)
- [ ] Retrieves last 30 posts
- [ ] Extracts post captions completely
- [ ] Captures all hashtags
- [ ] Identifies all @mentions
- [ ] Gets engagement metrics (likes, comments)
- [ ] Handles different post types (image, video, carousel)

### Detection Accuracy
- [ ] Detects obvious discount codes (CODE: ATHLETE20)
- [ ] Finds subtle discount codes (save with SUMMER20)
- [ ] Identifies #ad and #sponsored hashtags
- [ ] Recognizes brand @mentions
- [ ] Detects "link in bio" references
- [ ] Finds promo language ("check out", "get yours")
- [ ] Calculates confidence scores correctly
- [ ] No false positives on regular words

### Performance Requirements
- [ ] Profile loads in <5 seconds
- [ ] Post scraping completes in <20 seconds
- [ ] Detection runs in <2 seconds
- [ ] Total analysis under 30 seconds
- [ ] UI responsive during processing
- [ ] Results render smoothly

## Edge Cases to Handle

### Account Issues
- [ ] Private accounts
  - Shows clear message: "This account is private"
  - Doesn't crash
- [ ] Non-existent accounts
  - Shows: "Account not found"
  - Suggests checking spelling
- [ ] Accounts with no posts
  - Shows: "No posts to analyze"
  - Displays profile info anyway
- [ ] Suspended accounts
  - Handles gracefully
  - Shows appropriate message

### Data Issues
- [ ] Empty captions
  - Doesn't crash detector
  - Still checks images
- [ ] Non-English posts
  - Still detects codes and brands
  - Handles special characters
- [ ] Very long captions
  - Processes completely
  - Doesn't timeout
- [ ] Posts with 30+ hashtags
  - Captures all of them
  - Doesn't duplicate

### Network Issues
- [ ] Slow connection
  - Shows progress indicator
  - Doesn't timeout too early
- [ ] Instagram rate limiting
  - Falls back to cache
  - Shows appropriate message
- [ ] Complete network failure
  - Catches error
  - Shows offline message

## Demo-Specific Requirements

### Must Work With These Accounts
- [ ] **cristiano**
  - Loads profile ✓
  - Finds Nike partnership ✓
  - Detects CR7 brand ✓
  - Shows 400M+ followers correctly ✓
- [ ] **k.mbappe**
  - Loads profile ✓
  - Finds Nike deal ✓
  - Detects PSG merchandise ✓
  - Hidden affiliates found ✓
- [ ] **leomessi**
  - Loads profile ✓
  - Finds Adidas ✓
  - Detects Budweiser ✓
  - Processes Spanish captions ✓
- [ ] **neymarjr**
  - Loads profile ✓
  - Complex affiliates detected ✓
  - Portuguese captions handled ✓
- [ ] **sergioramos**
  - Loads profile ✓
  - Finds hidden partnerships ✓
  - Spanish content processed ✓

### UI Requirements
- [ ] Input field clearly visible
- [ ] Analyze button prominent
- [ ] Loading state shows progress
- [ ] Results layout clean
- [ ] Numbers formatted with commas
- [ ] Dollar amounts show currency symbol
- [ ] Confidence scores show as percentages
- [ ] Brand list readable
- [ ] No horizontal scrolling needed
- [ ] Works on 1920x1080 resolution
- [ ] Works on 1366x768 resolution

### Cache Functionality
- [ ] First analysis caches results
- [ ] Second request uses cache
- [ ] Cache expires after 1 hour
- [ ] Can force refresh if needed
- [ ] Cached results load instantly

## Pre-Demo Validation

### Technical Checks
- [ ] No console errors in browser
- [ ] No TypeScript errors
- [ ] Server stays running
- [ ] Memory usage stable
- [ ] CPU usage reasonable
- [ ] No memory leaks after multiple runs

### Data Quality
- [ ] Revenue estimates seem reasonable
- [ ] Confidence scores make sense
- [ ] Brand detection accurate
- [ ] No duplicate detections
- [ ] Insights are meaningful

### Backup Systems
- [ ] Cached data files exist
- [ ] Backup JSON files ready
- [ ] Screenshots captured
- [ ] Video demo recorded
- [ ] Offline mode works

## Demo Day Checklist

### 1 Hour Before
- [ ] Restart computer
- [ ] Clear browser cache
- [ ] Test internet connection
- [ ] Close unnecessary apps
- [ ] Charge laptop
- [ ] Test with one account
- [ ] Verify cache is fresh

### 30 Minutes Before
- [ ] Server running
- [ ] Browser ready (zoom at 110%)
- [ ] Test account loaded
- [ ] Backup files open
- [ ] Phone on silent
- [ ] Water nearby

### 5 Minutes Before
- [ ] Deep breath
- [ ] Review opening line
- [ ] Confirm screen sharing works
- [ ] Have backup plan ready
- [ ] Smile

## Success Metrics

### Must Have (Demo Fails Without)
- ✅ Analyzes at least 1 athlete successfully
- ✅ Finds at least 5 affiliate signals
- ✅ Shows revenue estimate
- ✅ Completes in under 1 minute
- ✅ No crashes during demo

### Should Have (Demo Better With)
- ✅ All 5 demo athletes work
- ✅ Finds hidden affiliates
- ✅ Shows confidence scores
- ✅ Instant cache response
- ✅ Clean, professional UI

### Nice to Have (Bonus Points)
- ✅ Live progress updates
- ✅ Animated transitions
- ✅ Export functionality
- ✅ Comparison between athletes
- ✅ Trending brands section

## Post-Demo Review

### What Worked
- [ ] Record what impressed them most
- [ ] Note which features they asked about
- [ ] Remember their specific use cases
- [ ] Document any feature requests

### What Didn't
- [ ] List any errors encountered
- [ ] Note confusing UI elements
- [ ] Record performance issues
- [ ] Document missing features they expected

### Follow-Up Items
- [ ] Features to add before next demo
- [ ] Bugs to fix immediately
- [ ] Performance improvements needed
- [ ] Additional athletes to pre-cache

## Emergency Procedures

### If Instagram Blocks You
1. Say: "Instagram's being protective - let me show you our cached results from an hour ago"
2. Load cached data
3. Continue demo normally

### If Nothing Works
1. Say: "Let me show you what this normally looks like"
2. Open backup video or screenshots
3. Walk through the features
4. Offer to schedule a live demo later

### If They Want Different Athlete
1. Try to run it live
2. If it fails, say: "Let me analyze this after our call and send you the results"
3. Redirect to pre-cached athlete
4. Make note to analyze their requested athlete

### If They're Unimpressed
1. Ask: "What would make this valuable for you?"
2. Listen carefully
3. Show how it could address their specific need
4. If not fit: "Sounds like you need something different. Let me think about this and get back to you."

## Final Confidence Check

Rate your confidence (1-10) in:
- [ ] Technical demo working: ___/10
- [ ] Your presentation skills: ___/10
- [ ] Handling questions: ___/10
- [ ] Recovery from errors: ___/10
- [ ] Overall demo success: ___/10

**If any score is below 7, practice that area more!**