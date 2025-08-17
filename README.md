# Affiliate Link Scraper

Automated extraction of affiliate links from social media profiles and link aggregation platforms.

## Overview

This tool discovers and extracts affiliate links from creator social media profiles, automatically analyzing bio links, Linktree pages, and other content sources to output structured data.

## Features

- Extract links from Linktree, Beacons, and other link aggregators
- Instagram bio link discovery
- URL expansion and affiliate parameter detection
- Brand identification and link classification
- JSON output for easy integration

## Tech Stack

- **Backend**: Node.js + TypeScript
- **Scraping**: Puppeteer for web automation
- **Processing**: URL expansion and affiliate detection
- **Output**: Structured JSON format

## Installation

```bash
npm install
```

## Usage

### Basic extraction
```bash
npm run extract <username>
```

### Example
```bash
npm run extract cristiano
```

## Output

The tool outputs JSON data with discovered affiliate links:

```json
{
  "athlete": {
    "username": "cristiano",
    "platform": "instagram",
    "followerCount": 615000000
  },
  "affiliates": [
    {
      "name": "Nike Mercurial",
      "brand": "Nike", 
      "url": "https://nike.com/...",
      "source": "linktree",
      "confidence": 95
    }
  ],
  "summary": {
    "totalProducts": 15,
    "fromBioLinks": 12,
    "fromPosts": 3
  }
}
```

## License

[Add your license information here]

---

*This project was built as a 2-day MVP to demonstrate the feasibility of automated creator onboarding at scale. It successfully transforms a 3-hour manual process into a 30-second automated workflow.*
