# YouTube API Key Setup

## Step 1: Create Your .env File

Create a `.env` file in the project root (same directory as package.json):

```bash
# Copy the example file
cp .env.example .env
```

## Step 2: Add Your API Key

Open the `.env` file and replace the placeholder with your actual API key:

```bash
# YouTube Data API v3 Key
YOUTUBE_API_KEY=AIzaSyD_your_actual_api_key_here

# Optional settings (use defaults)
REQUEST_TIMEOUT=15000
CONCURRENT_LIMIT=5
```

## Step 3: Test the Integration

After setting up your API key, test with a creator who has YouTube content:

```bash
# Test single creator
npm run discover MrBeast

# Test batch (includes YouTube API testing)
npm run batch-test quick
```

## What the YouTube Integration Provides:

1. **Channel Information**: 
   - Subscriber count
   - Channel description links
   - Channel banner links

2. **Recent Video Analysis**:
   - Video description links  
   - Affiliate links in descriptions
   - Product mentions

3. **Enhanced Intelligence**:
   - YouTube-specific engagement metrics
   - Video content analysis for brand partnerships
   - Revenue estimation from video descriptions

## Troubleshooting:

**If you see "YouTube API key not provided":**
- Check that `.env` file exists in project root
- Verify `YOUTUBE_API_KEY=` line has your actual key
- No spaces around the `=` sign
- Restart the process after adding the key

**If you see "API quota exceeded":**
- YouTube API has daily quotas
- Each creator search uses ~10-50 quota units
- Consider testing with fewer creators or spread testing across days

**If you see "API key invalid":**
- Verify the key is correct (starts with `AIzaSy`)
- Check that YouTube Data API v3 is enabled in Google Cloud Console
- Ensure the API key has YouTube Data API v3 permissions

## Security Note:

- `.env` file is already in `.gitignore` so your API key won't be committed
- Never share your API key or commit it to version control
- Regenerate the key if accidentally exposed