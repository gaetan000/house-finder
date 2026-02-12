import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'houses.json');

puppeteer.use(StealthPlugin());

async function scrape() {
  console.log('🚀 Starting Logic-Immo scraper...');
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  // Logic-Immo URL with filters
  const url = 'https://www.logic-immo.com/vente-immobilier-haute-garonne,31_99/options/groupprptypesalialialialialialialialialialialialialialialialialialialialialialialialialialialialia,5-pieces-et-plus,prix-mini_0,prix-maxi_450000,surfaceterrain-mini_1000.htm';
  
  console.log(`📍 Going to Logic-Immo`);
  
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    console.log('✅ Page loaded');
    
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/tmp/logicimmo.png' });
    
    // Accept cookies
    try {
      await page.click('#didomi-notice-agree-button', { timeout: 3000 });
      await new Promise(r => setTimeout(r, 1000));
    } catch {}
    
    const listings = await page.evaluate(() => {
      const results = [];
      const cards = document.querySelectorAll('.announceCard, [class*="offer"], article');
      
      cards.forEach((card, i) => {
        if (i >= 20) return;
        
        const link = card.querySelector('a');
        const url = link?.getAttribute('href') || '';
        if (!url.includes('detail') && !url.includes('annonce')) return;
        
        const title = card.querySelector('h2, h3, .title, [class*="title"]')?.textContent?.trim() || '';
        const priceText = card.textContent?.match(/[\d\s]+€/) || ['0'];
        const price = parseInt(priceText[0].replace(/[^0-9]/g, '')) || 0;
        const location = card.querySelector('.city, .location, [class*="city"]')?.textContent?.trim() || '';
        
        if (url) results.push({ url, title, price, location });
      });
      
      return results;
    });
    
    console.log(`📋 Found ${listings.length} listings`);
    
    // Load data
    let data;
    try { data = JSON.parse(readFileSync(DATA_PATH, 'utf-8')); } 
    catch { data = { houses: [] }; }
    
    const houses = listings.map(l => ({
      id: `logicimmo-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      url: l.url.startsWith('http') ? l.url : `https://www.logic-immo.com${l.url}`,
      title: l.title || 'Maison',
      price: l.price,
      location: l.location,
      bedrooms: 5,
      source: 'other',
      images: [],
      addedAt: new Date().toISOString(),
      status: 'pending',
    }));
    
    const existingUrls = new Set(data.houses.map(h => h.url));
    const newHouses = houses.filter(h => !existingUrls.has(h.url));
    
    data.houses = [...data.houses, ...newHouses];
    data.lastUpdated = new Date().toISOString();
    
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`✅ Added ${newHouses.length} houses from Logic-Immo`);
    
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
  
  await browser.close();
}

scrape();
