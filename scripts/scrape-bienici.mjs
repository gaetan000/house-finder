import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'houses.json');

puppeteer.use(StealthPlugin());

async function scrape() {
  console.log('🚀 Starting Bien\'ici scraper...');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Bien'ici search URL - Haute-Garonne, houses, 5+ rooms, 1000m2+ land, < 450k
  const url = 'https://www.bienici.com/recherche/achat/haute-garonne-31/maison?prix-max=450000&nb-pieces-min=5&surface-terrain-min=1000';
  
  console.log(`📍 Going to: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');
    
    await new Promise(r => setTimeout(r, 3000));
    
    // Screenshot
    await page.screenshot({ path: '/tmp/bienici.png' });
    console.log('📸 Screenshot saved');
    
    // Accept cookies if present
    try {
      await page.click('#didomi-notice-agree-button', { timeout: 3000 });
      console.log('🍪 Accepted cookies');
      await new Promise(r => setTimeout(r, 1000));
    } catch {}
    
    const content = await page.content();
    console.log(`📄 Content length: ${content.length}`);
    
    // Extract listings
    const listings = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('article, [class*="realEstateAd"], a[href*="/annonce/"]');
      
      cards.forEach((card, i) => {
        if (i >= 15) return;
        
        const link = card.tagName === 'A' ? card : card.querySelector('a');
        const url = link?.getAttribute('href') || '';
        if (!url.includes('/annonce/')) return;
        
        const title = card.querySelector('h2, [class*="title"]')?.textContent?.trim() || 
                     card.querySelector('span')?.textContent?.trim() || '';
        
        const priceText = card.textContent?.match(/[\d\s]+€/) || ['0'];
        const price = parseInt(priceText[0].replace(/[^0-9]/g, '')) || 0;
        
        const locationMatch = card.textContent?.match(/\d{5}\s+[\wÀ-ÿ-]+/);
        const location = locationMatch ? locationMatch[0] : '';
        
        if (url) results.push({ url, title, price, location });
      });
      
      return results;
    });
    
    console.log(`📋 Found ${listings.length} listings on Bien'ici`);
    
    if (listings.length === 0) {
      writeFileSync('/tmp/bienici.html', content);
      console.log('💾 HTML saved for debugging');
    }
    
    // Load existing data
    let data;
    try {
      data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    } catch {
      data = {
        lastUpdated: new Date().toISOString(),
        targetAddress: "10 Imp. André Marestan, 31100 Toulouse",
        criteria: { maxPrice: 450000, minBedrooms: 5, minLivingAreaM2: 40, minGarageM2: 40, minLandM2: 1000, maxDistanceMinutes: 40, maxWorkCost: 10000 },
        houses: []
      };
    }
    
    const houses = [];
    
    for (const listing of listings) {
      const fullUrl = listing.url.startsWith('http') ? listing.url : `https://www.bienici.com${listing.url}`;
      
      console.log(`🏠 ${listing.title || 'Sans titre'} - ${listing.price}€`);
      
      houses.push({
        id: `bienici-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        url: fullUrl,
        title: listing.title || `Maison ${listing.location}`,
        price: listing.price,
        location: listing.location,
        bedrooms: 5,
        source: 'bienici',
        images: [],
        addedAt: new Date().toISOString(),
        status: 'pending',
      });
    }
    
    // Merge and save
    const existingUrls = new Set(data.houses.map(h => h.url));
    const newHouses = houses.filter(h => !existingUrls.has(h.url));
    
    data.houses = [...data.houses, ...newHouses];
    data.lastUpdated = new Date().toISOString();
    
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`\n✅ Added ${newHouses.length} houses from Bien'ici`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await page.screenshot({ path: '/tmp/bienici-error.png' });
  }
  
  await browser.close();
}

scrape();
