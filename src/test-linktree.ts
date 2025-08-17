import puppeteer from 'puppeteer';

async function testLinktree() {
  console.log('🚀 Testing Linktree extraction...');
  
  const browser = await puppeteer.launch({ 
    headless: true,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--ignore-certificate-errors',
      '--ignore-ssl-errors',
      '--disable-web-security'
    ]
  });
  const page = await browser.newPage();
  
  try {
    console.log('📱 Navigating to a test Linktree...');
    await page.goto('https://linktr.ee/therock', { waitUntil: 'networkidle2' });
    
    console.log('⏳ Waiting for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Debug: Check page content
    const pageTitle = await page.title();
    console.log(`📄 Page title: ${pageTitle}`);
    
    // Try to accept cookies if present
    try {
      await page.waitForSelector('button', { timeout: 2000 });
      const buttons = await page.$$('button');
      for (const button of buttons) {
        const text = await button.evaluate(el => el.textContent?.toLowerCase() || '');
        if (text.includes('accept') || text.includes('cookie')) {
          await button.click();
          console.log('🍪 Accepted cookies');
          await new Promise(resolve => setTimeout(resolve, 2000));
          break;
        }
      }
    } catch {
      console.log('🍪 No cookie banner found');
    }
    
    console.log('🔗 Extracting links...');
    const links = await page.evaluate(() => {
      // Try multiple selectors that Linktree might use
      const selectors = [
        'a[data-testid="LinkButton"]',
        'a[data-testid*="link"]',
        'a[role="button"]',
        'div[data-testid*="link"] a',
        '.styled__LinkButtonContainer a'
      ];
      
      let elements: NodeListOf<Element> | null = null;
      
      for (const selector of selectors) {
        elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          console.log(`Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }
      
      if (!elements || elements.length === 0) {
        // Fallback: get all links and filter
        elements = document.querySelectorAll('a[href]');
        console.log(`Fallback: Found ${elements.length} total links`);
      }
      
      return Array.from(elements)
        .map(el => {
          const href = (el as HTMLAnchorElement).href;
          const text = el.textContent?.trim() || '';
          return { title: text, url: href };
        })
        .filter(link => {
          // Filter out internal Linktree links and empty ones
          return link.url && 
                 !link.url.includes('linktr.ee') && 
                 !link.url.includes('cookiepedia') &&
                 !link.url.includes('onetrust') &&
                 link.url.startsWith('http') &&
                 link.title.length > 0;
        });
    });
    
    console.log(`✅ Found ${links.length} links:`);
    links.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.title}`);
      console.log(`     ${link.url}`);
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await browser.close();
  }
}

testLinktree();