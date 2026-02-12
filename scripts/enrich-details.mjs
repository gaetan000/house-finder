import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { writeFileSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, '..', 'data', 'houses.json');

puppeteer.use(StealthPlugin());

async function enrichDetails() {
  console.log('🔍 Enriching house details...');
  
  let data;
  try {
    data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
  } catch {
    console.log('❌ Could not read data file');
    return;
  }
  
  // Filter houses that need enrichment (from bienici with no details)
  const housesToEnrich = data.houses.filter(h => 
    h.source === 'bienici' && 
    h.url.includes('bienici.com') &&
    !h.landM2
  );
  
  console.log(`📋 ${housesToEnrich.length} houses to enrich`);
  
  if (housesToEnrich.length === 0) {
    console.log('✅ All houses already have details');
    return;
  }
  
  const browser = await puppeteer.launch({ 
    headless: 'new',
    executablePath: '/usr/bin/chromium-browser',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  
  for (const house of housesToEnrich.slice(0, 10)) {
    console.log(`\n🏠 Processing: ${house.title}`);
    console.log(`   URL: ${house.url}`);
    
    try {
      await page.goto(house.url, { waitUntil: 'networkidle2', timeout: 30000 });
      await new Promise(r => setTimeout(r, 2000));
      
      // Accept cookies if needed
      try {
        await page.click('#didomi-notice-agree-button', { timeout: 2000 });
      } catch {}
      
      const details = await page.evaluate(() => {
        const getText = (selector) => document.querySelector(selector)?.textContent?.trim() || '';
        const content = document.body.textContent || '';
        
        // Extract from the page
        const surfaceMatch = content.match(/Surface terrain[:\s]+(\d+(?:\s*\d+)?)\s*m²/i);
        const landM2 = surfaceMatch ? parseInt(surfaceMatch[1].replace(/\s/g, '')) : null;
        
        const roomsMatch = content.match(/(\d+)\s*pièces?/i);
        const rooms = roomsMatch ? parseInt(roomsMatch[1]) : 5;
        
        const bedroomsMatch = content.match(/(\d+)\s*chambres?/i);
        const bedrooms = bedroomsMatch ? parseInt(bedroomsMatch[1]) : (rooms > 1 ? rooms - 1 : 5);
        
        const surfaceHabitMatch = content.match(/Surface habitable[:\s]+(\d+)\s*m²/i) ||
                                  content.match(/(\d+)\s*m².*habitable/i);
        const livingArea = surfaceHabitMatch ? parseInt(surfaceHabitMatch[1]) : null;
        
        // Bonuses
        const hasPool = /piscine/i.test(content);
        const hasGarage = /garage/i.test(content);
        const garageMatch = content.match(/garage[:\s]*(\d+)\s*m²/i);
        const garageM2 = garageMatch ? parseInt(garageMatch[1]) : (hasGarage ? 25 : null);
        
        const hasView = /vue\s+(dégagée|panoramique|dominante|pyrénées)/i.test(content);
        const isTreed = /arboré|arbres|boisé/i.test(content);
        const southFacing = /exposition?\s+sud|plein\s+sud|orienté\s+sud/i.test(content);
        const noVisAVis = /sans\s+vis[- ]à[- ]vis|pas\s+de\s+vis/i.test(content);
        
        // Images
        const images = Array.from(document.querySelectorAll('img[src*="bienici"], img[src*="ubiflow"]'))
          .map(img => img.src)
          .filter(src => src.includes('annonce') || src.includes('photo'))
          .slice(0, 8);
        
        // Description
        const descEl = document.querySelector('[class*="description"], .annonce-description, p');
        const description = descEl?.textContent?.trim().slice(0, 500) || '';
        
        return {
          landM2,
          bedrooms,
          livingAreaM2: livingArea,
          garageM2,
          hasPool,
          hasView,
          isTreed,
          southFacing,
          noVisAVis,
          images,
          description
        };
      });
      
      // Update house data
      const idx = data.houses.findIndex(h => h.id === house.id);
      if (idx >= 0) {
        Object.assign(data.houses[idx], {
          landM2: details.landM2 || data.houses[idx].landM2,
          bedrooms: details.bedrooms || data.houses[idx].bedrooms,
          livingAreaM2: details.livingAreaM2 || data.houses[idx].livingAreaM2,
          garageM2: details.garageM2 || data.houses[idx].garageM2,
          hasPool: details.hasPool,
          hasView: details.hasView,
          isTreed: details.isTreed,
          southFacing: details.southFacing,
          noVisAVis: details.noVisAVis,
          images: details.images.length > 0 ? details.images : data.houses[idx].images,
          description: details.description || data.houses[idx].description
        });
        
        console.log(`   ✅ ${details.bedrooms} ch, ${details.landM2}m² terrain, ${details.hasPool ? '🏊' : ''}`);
      }
      
      await new Promise(r => setTimeout(r, 1500));
      
    } catch (err) {
      console.log(`   ❌ Error: ${err.message}`);
    }
  }
  
  data.lastUpdated = new Date().toISOString();
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
  console.log('\n💾 Data saved');
  
  await browser.close();
}

enrichDetails();
