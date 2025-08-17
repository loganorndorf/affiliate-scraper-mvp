import { chromium } from 'playwright';

async function debugNitter() {
  console.log('🔍 Debugging Nitter selectors...\n');
  
  const browser = await chromium.launch({ headless: false }); // Watch it work
  const page = await browser.newPage();
  
  try {
    // Test with a known account
    console.log('📱 Loading @therock on Nitter...');
    await page.goto('https://nitter.net/therock');
    
    // Wait for page load
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Debug: Check what's actually on the page
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        bodyText: document.body.textContent?.substring(0, 200),
        hasProfileContent: document.body.textContent?.includes('Following') || false
      };
    });
    
    console.log('📊 Page Debug Info:');
    console.log(`Title: ${pageInfo.title}`);
    console.log(`Body text: ${pageInfo.bodyText}`);
    console.log(`Has profile content: ${pageInfo.hasProfileContent}`);
    
    // Try to find working selectors
    console.log('\n🧪 Testing selectors...');
    const selectorTests = [
      '.profile-bio',
      '.profile-description', 
      '.bio',
      '[class*="bio"]',
      '.profile-stat-num',
      '.stat-num',
      '[class*="stat"]'
    ];
    
    for (const selector of selectorTests) {
      const found = await page.$$(selector);
      console.log(`  ${selector}: ${found.length} elements`);
      
      if (found.length > 0) {
        const text = await found[0].textContent();
        console.log(`    Content: "${text?.substring(0, 50)}..."`);
      }
    }
    
  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    await browser.close();
  }
}

debugNitter();