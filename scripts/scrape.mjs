import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'houses.json');

puppeteer.use(StealthPlugin());

async function scrape() {
  console.log('🚀 Starting scraper with stealth mode...');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--window-size=1920,1080'
    ]
  });
  
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  });
  
  // Try Le Bon Coin with specific filters for Haute-Garonne, houses, 5+ rooms, land 1000m2+, price < 450k
  const url = 'https://www.leboncoin.fr/recherche?category=9&real_estate_type=1&locations=r_30_4&price=min-450000&rooms=5-max&land_plot_surface=1000-max';
  
  console.log(`📍 Going to: ${url}`);
  
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    console.log('✅ Page loaded');
    
    // Wait a bit for JS to render
    await new Promise(r => setTimeout(r, 5000));
    
    // Take a screenshot for debugging
    await page.screenshot({ path: '/tmp/leboncoin.png', fullPage: false });
    console.log('📸 Screenshot saved to /tmp/leboncoin.png');
    
    // Try to find and click cookie consent
    try {
      const acceptButton = await page.$('button[id*="accept"], button:has-text("Accepter"), #didomi-notice-agree-button');
      if (acceptButton) {
        await acceptButton.click();
        console.log('🍪 Clicked cookie consent');
        await new Promise(r => setTimeout(r, 2000));
      }
    } catch (e) {
      console.log('No cookie banner found');
    }
    
    // Get page content
    const content = await page.content();
    console.log(`📄 Page content length: ${content.length}`);
    
    // Check if we're blocked
    if (content.includes('Veuillez activer JavaScript') || content.includes('captcha')) {
      console.log('❌ Blocked by anti-bot');
      await page.screenshot({ path: '/tmp/blocked.png', fullPage: true });
      await browser.close();
      return;
    }
    
    // Try to extract listings
    const listings = await page.evaluate(() => {
      const results = [];
      
      // Try various selectors
      const cards = document.querySelectorAll('[data-qa-id="aditem_container"], [data-test-id="ad"], .styles_adCard__HQRFN, a[href*="/ad/ventes_immobilieres"]');
      
      console.log('Found cards:', cards.length);
      
      cards.forEach((card, i) => {
        if (i >= 20) return;
        
        const link = card.tagName === 'A' ? card : card.querySelector('a');
        const url = link?.getAttribute('href') || '';
        
        const titleEl = card.querySelector('[data-qa-id="aditem_title"], h2, .styles_title__zbtR2, p');
        const title = titleEl?.textContent?.trim() || '';
        
        const priceEl = card.querySelector('[data-qa-id="aditem_price"], .styles_price__b2Pcx, [data-test-id="price"]');
        const priceText = priceEl?.textContent || '0';
        const price = parseInt(priceText.replace(/[^0-9]/g, '')) || 0;
        
        const locationEl = card.querySelector('[data-qa-id="aditem_location"], .styles_location__fPK8M');
        const location = locationEl?.textContent?.trim() || '';
        
        if (url && title) {
          results.push({ url, title, price, location });
        }
      });
      
      return results;
    });
    
    console.log(`📋 Found ${listings.length} listings`);
    
    if (listings.length === 0) {
      // Save HTML for debugging
      writeFileSync('/tmp/leboncoin.html', content);
      console.log('💾 HTML saved to /tmp/leboncoin.html for debugging');
    }
    
    // Process listings
    const houses = [];
    
    for (const listing of listings.slice(0, 10)) {
      const fullUrl = listing.url.startsWith('http') 
        ? listing.url 
        : `https://www.leboncoin.fr${listing.url}`;
      
      console.log(`\n🏠 ${listing.title}`);
      console.log(`   💰 ${listing.price}€ | 📍 ${listing.location}`);
      
      houses.push({
        id: `lbc-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        url: fullUrl,
        title: listing.title,
        price: listing.price,
        location: listing.location,
        bedrooms: 5,
        source: 'leboncoin',
        images: [],
        addedAt: new Date().toISOString(),
        status: 'pending',
      });
      
      await new Promise(r => setTimeout(r, 500));
    }
    
    // Save to JSON
    if (houses.length > 0) {
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
      
      const existingUrls = new Set(data.houses.map(h => h.url));
      const newHouses = houses.filter(h => !existingUrls.has(h.url));
      
      data.houses = [...data.houses, ...newHouses];
      data.lastUpdated = new Date().toISOString();
      
      writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
      console.log(`\n✅ Added ${newHouses.length} new houses`);
    }
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    await page.screenshot({ path: '/tmp/error.png', fullPage: true });
  }
  
  await browser.close();
}

scrape();
