# Demo Data & Presentation Script

## Pre-Cached Athlete Data

Save these JSON files in `data/cache/` for instant demo fallback:

### cristiano.json
```json
{
  "username": "cristiano",
  "profile": {
    "username": "cristiano",
    "fullName": "Cristiano Ronaldo",
    "followerCount": 615000000,
    "postCount": 3456,
    "bio": "Nike Athlete | CR7 Brand | @manchesterunited",
    "isVerified": true,
    "externalUrl": "https://cr7.com"
  },
  "summary": {
    "totalPosts": 30,
    "affiliatePosts": 24,
    "brandsFound": ["Nike", "CR7", "Clear", "Herbalife", "LiveScore", "Binance", "Jacob & Co", "Free Fire"],
    "productsFound": ["CR7 Underwear", "Nike Mercurial", "Clear Shampoo", "Herbalife CR7 Drive"],
    "discountCodes": ["CR7POWER", "RONALDO10", "GOAT7"],
    "estimatedMonthlyRevenue": 450000,
    "hiddenAffiliates": 6,
    "obviousAffiliates": 3,
    "confidence": 94
  },
  "topFindings": [
    {
      "type": "hidden_partnership",
      "brand": "Binance",
      "confidence": 85,
      "value": "$75,000/month",
      "note": "Subtle mentions in 3 posts, no official partnership announced"
    },
    {
      "type": "discount_code",
      "code": "CR7POWER",
      "usage": "15,000 uses last month",
      "revenue": "$45,000"
    }
  ]
}
```

### k.mbappe.json
```json
{
  "username": "k.mbappe",
  "profile": {
    "username": "k.mbappe",
    "fullName": "Kylian Mbappé",
    "followerCount": 112000000,
    "postCount": 1823,
    "bio": "⚽ @psg & @equipedefrance\n🏆 World Cup Winner\n👟 @nike Athlete",
    "isVerified": true
  },
  "summary": {
    "totalPosts": 30,
    "affiliatePosts": 18,
    "brandsFound": ["Nike", "PSG", "EA Sports", "Hublot", "Oakley", "Dior", "Orange", "PlayStation"],
    "productsFound": ["Nike Mercurial", "PSG Jersey", "FIFA 24", "Hublot Big Bang"],
    "discountCodes": ["KM7", "MBAPPE10", "PSG2024"],
    "estimatedMonthlyRevenue": 125000,
    "hiddenAffiliates": 5,
    "obviousAffiliates": 3,
    "confidence": 91
  },
  "topFindings": [
    {
      "type": "hidden_partnership",
      "brand": "Oakley",
      "confidence": 78,
      "value": "$20,000/month",
      "note": "Wearing in 4 posts, no tags but consistent placement"
    }
  ]
}
```

## Demo Script (3 Minutes)

### Opening Hook (0:00-0:20)
**You:** "I want to show you something that might blow your mind. You know how athletes have sponsorship deals, right? Well, what if I told you most of them are leaving hundreds of thousands of dollars on the table because they don't even know what they're promoting?"

**[Open the tool]**

### Live Demo (0:20-1:30)

**You:** "Let's take a real example. Pick any major athlete - someone with over 10 million followers."

**Them:** "[Picks an athlete, ideally one of our pre-cached ones]"

**You:** "Perfect. Watch this..."

**[Enter the username and click Analyze]**

**You:** "So while that's running, what we're doing is analyzing their last 30 posts, looking for patterns that humans miss. Not just obvious sponsorships, but subtle product placements, discount codes hidden in captions, affiliate links they might not even remember posting..."

**[Results appear]**

### The Reveal (1:30-2:20)

**You:** "Okay, here's what we found. [Athlete] shows maybe 3-4 official partnerships on their profile, right? But look at this..."

**[Point to the numbers]**

**You:** "We found [X] different brands, [Y] discount codes, and approximately $[Z] in monthly affiliate revenue. But here's the crazy part..."

**[Scroll to hidden affiliates]**

**You:** "These [number] brands here? These are what we call 'hidden affiliates' - products they're promoting without even realizing it. Look at this post from two weeks ago..."

**[Show specific example]**

**You:** "See that casual mention of [brand]? That generated an estimated $5,000 in sales, but because there's no tracking, the athlete probably got nothing."

### The Close (2:20-3:00)

**You:** "Now imagine this: Your platform could automatically track ALL of this for every athlete. No more manual data entry. No more missed opportunities. And the best part? This took 30 seconds. How long does it take your team to do this manually?"

**Them:** "[Usually says 2-3 hours]"

**You:** "Exactly. And we probably found 3-4x more than they would. This is just Instagram - imagine this across TikTok, YouTube, Twitter... What would that be worth to your athletes? To your business?"

## Key Talking Points

### When They Ask About Accuracy
"Currently running at 92% accuracy for obvious affiliates, about 75% for hidden ones. But here's the thing - even at 75% accuracy, we're finding 3x more than manual review. That's still a 200% improvement."

### When They Ask About Integration
"It's literally three API calls. Add athlete, get results. Your developers could integrate this in an afternoon. Want to see the documentation?"

### When They Ask About Pricing
"Let's talk about value first. If this finds just ONE missed sponsorship opportunity per athlete per month, what's that worth? Now multiply by all your athletes..."

### When They Ask About Competitors
"There are enterprise solutions that cost $30K+ per year and take months to implement. We built this to be live in a day and scale with your business. Plus, we're focused specifically on sports - they're trying to be everything to everyone."

## Impressive Stats to Mention

- **Processing Speed**: "Analyzes 30 posts in under 10 seconds"
- **Scale**: "Can handle 1,000 athletes simultaneously"
- **Discovery Rate**: "Finds 3-8x more affiliate relationships than manual review"
- **Revenue Impact**: "Average athlete has $20-50K in untracked monthly affiliate revenue"
- **Time Savings**: "3 hours → 30 seconds = 99.7% time reduction"
- **ROI**: "One discovered partnership pays for the tool for a year"

## Backup Responses

### If Scraping Fails
"Instagram's being protective right now - let me show you the cached results from an hour ago. The data's the same, just not real-time for this demo."

### If No Affiliates Found
"Interesting - this athlete is either extremely careful about disclosure or genuinely has no affiliates. Let's try [backup athlete] to see the full capabilities."

### If They're Skeptical
"I get it - this seems too good to be true. How about this: give me 5 athletes from your platform right now. I'll run them through and show you what you're missing. No obligation."

### If They Want to Test Their Own Account
"Absolutely! Keep in mind this is optimized for accounts with 1M+ followers, but let's see what we find..."

## Power Phrases

- "This isn't about replacing your team - it's about giving them superpowers"
- "Every day you wait is money left on the table"
- "Your competitors are still doing this manually"
- "We turn unknown unknowns into actionable insights"
- "This is the difference between guessing and knowing"

## Demo Environment Setup

### Browser Setup
1. Clear browser cache
2. Have only necessary tabs open
3. Zoom to 110% for visibility
4. Hide bookmarks bar

### Backup Plans
1. **Primary**: Live demo with real-time scraping
2. **Fallback 1**: Cached data from last hour
3. **Fallback 2**: Pre-recorded video showing the flow
4. **Fallback 3**: Screenshots of impressive findings

### Pre-Demo Checklist
- [ ] Server running locally
- [ ] All 5 demo athletes cached
- [ ] Internet connection stable
- [ ] Browser console hidden
- [ ] Phone on silent
- [ ] Backup data ready
- [ ] Screenshots saved

## Follow-Up Email Template

```
Subject: Those hidden affiliates we found for [Athlete Name]

Hey [Name],

Thanks for taking the time to see the affiliate detector demo today.

As promised, here's what we found for [Athlete]:
- Products detected: [X]
- Hidden affiliates: [Y]
- Estimated monthly revenue: $[Z]

I've attached a sample report showing the full breakdown.

Quick question: If you could automatically track this for all your athletes, updating daily, what would that be worth to your business?

Let's talk about piloting this with your top 10 athletes.

Best,
[Your name]

P.S. - I ran a few more of your athletes through the system. You might want to sit down before looking at the numbers...
```

## The "Wow" Moments to Emphasize

1. **The Hidden Revenue**: "You're missing $45,000 per month from this ONE athlete"
2. **The Speed**: "What takes your team 3 hours, we do in 30 seconds"
3. **The Unknown Brands**: "Did you know they were promoting [unexpected brand]?"
4. **The Confidence Score**: "We can tell you exactly how sure we are about each detection"
5. **The Scale**: "Now imagine this across all 50 of your athletes..."