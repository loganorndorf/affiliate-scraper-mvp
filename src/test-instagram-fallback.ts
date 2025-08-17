import { InstagramExtractor } from './extractors/instagram';

async function testInstagramWithFallback() {
  console.log('🧪 Testing Instagram extraction with graceful fallback...\n');
  
  const extractor = new InstagramExtractor();
  
  try {
    // Since Instagram will likely block, let's simulate the expected flow
    console.log('📱 Attempting Instagram extraction...');
    const profile = await extractor.getProfile('cristiano');
    
    if (profile) {
      console.log(`✅ Got profile data for @${profile.username}`);
      if (profile.bioLink) {
        console.log(`🔗 Found bio link: ${profile.bioLink}`);
      } else {
        console.log('⚠️ No bio link found, will need manual input');
      }
      
      if (profile.warnings.length > 0) {
        console.log(`⚠️ Warnings: ${profile.warnings.join(', ')}`);
      }
    } else {
      console.log('❌ Instagram extraction failed completely');
    }
    
    // Show fallback strategy
    console.log('\n💡 Fallback Strategy:');
    console.log('Since Instagram often blocks scrapers, we can:');
    console.log('1. Skip Instagram and ask user for Linktree URL directly');
    console.log('2. Or use a config file with known athlete bio links');
    console.log('3. Focus on Linktree/Beacons extraction (80% of value)');
    
    // Demonstrate fallback with known Linktree URL
    console.log('\n🔄 Demonstrating fallback: Direct Linktree extraction...');
    
    // We know The Rock's Linktree works
    const { LinktreeExtractor } = await import('./extractors/linktree');
    const linktreeExtractor = new LinktreeExtractor();
    
    const links = await linktreeExtractor.extractLinks('https://linktr.ee/therock');
    console.log(`✅ Fallback successful: Found ${links.length} affiliate links`);
    
    await linktreeExtractor.close();
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await extractor.close();
  }
}

testInstagramWithFallback();