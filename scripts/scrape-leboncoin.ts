import { chromium } from 'playwright';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface House {
  id: string;
  url: string;
  title: string;
  price: number;
  location: string;
  distanceMinutes?: number;
  bedrooms: number;
  livingAreaM2?: number;
  garageM2?: number;
  landM2?: number;
  hasPool?: boolean;
  hasView?: boolean;
  isTreed?: boolean;
  southFacing?: boolean;
  noVisAVis?: boolean;
  estimatedWorkCost?: number;
  source: 'leboncoin' | 'seloger' | 'pap' | 'bienici' | 'ouestfrance' | 'other';
  images: string[];
  description?: string;
  addedAt: string;
  status: 'pending' | 'ok' | 'ko';
  notes?: string;
}

const DATA_PATH = join(__dirname, '..', 'data', 'houses.json');

async function scrapeLeBonCoin() {
  console.log('🚀 Starting Le Bon Coin scraper...');
  
  const browser = await chromium.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 },
    locale: 'fr-FR',
  });
  
  const page = await context.newPage();
  
  // Search URL with criteria:
  // - Category 9 = Ventes immobilières
  // - real_estate_type=1 = Maison
  // - locations=r_30_4 = Haute-Garonne
  // - price max 450000
  // - rooms 5+
  // - land_plot_surface 1000+
  const searchUrl = 'https://www.leboncoin.fr/recherche?category=9&real_estate_type=1&locations=r_30_4&price=min-450000&rooms=5-max&land_plot_surface=1000-max&owner_type=all';
  
  console.log(`📍 Navigating to: ${searchUrl}`);
  
  try {
    await page.goto(searchUrl, { waitUntil: 'networkidle', timeout: 60000 });
    
    // Wait for page to load
    await page.waitForTimeout(3000);
    
    // Check for cookie consent
    const cookieButton = page.locator('button:has-text("Accepter")').first();
    if (await cookieButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log('🍪 Accepting cookies...');
      await cookieButton.click();
      await page.waitForTimeout(1000);
    }
    
    // Wait for listings
    await page.waitForSelector('[data-qa-id="aditem_container"]', { timeout: 30000 }).catch(() => {
      console.log('⚠️ No listings found with standard selector, trying alternative...');
    });
    
    // Get all listing links
    const listings = await page.$$eval('a[href*="/ad/ventes_immobilieres/"]', (links) => {
      return links.slice(0, 20).map(link => ({
        url: link.getAttribute('href') || '',
        title: link.querySelector('[data-qa-id="aditem_title"]')?.textContent?.trim() || 
               link.querySelector('p')?.textContent?.trim() || '',
        price: parseInt(
          (link.querySelector('[data-qa-id="aditem_price"]')?.textContent || '0')
            .replace(/[^0-9]/g, '')
        ) || 0,
        location: link.querySelector('[data-qa-id="aditem_location"]')?.textContent?.trim() || ''
      }));
    });
    
    console.log(`📋 Found ${listings.length} listings`);
    
    const houses: House[] = [];
    
    for (const listing of listings) {
      if (!listing.url || listing.price === 0) continue;
      
      const fullUrl = listing.url.startsWith('http') 
        ? listing.url 
        : `https://www.leboncoin.fr${listing.url}`;
      
      console.log(`\n🏠 Processing: ${listing.title}`);
      console.log(`   Price: ${listing.price}€`);
      console.log(`   Location: ${listing.location}`);
      
      // Visit each listing to get details
      try {
        await page.goto(fullUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2000);
        
        // Extract details
        const details = await page.evaluate(() => {
          const getText = (selector: string) => 
            document.querySelector(selector)?.textContent?.trim() || '';
          
          const description = getText('[data-qa-id="adview_description_container"]') ||
                             getText('.styles_description__Uttij') || '';
          
          // Get images
          const images = Array.from(document.querySelectorAll('img[src*="leboncoin"]'))
            .map(img => img.getAttribute('src') || '')
            .filter(src => src.includes('image') && !src.includes('avatar'));
          
          // Parse attributes
          const attrs: Record<string, string> = {};
          document.querySelectorAll('[data-qa-id="criteria_item"]').forEach(el => {
            const label = el.querySelector('[data-qa-id="criteria_item_label"]')?.textContent?.trim() || '';
            const value = el.querySelector('[data-qa-id="criteria_item_value"]')?.textContent?.trim() || '';
            if (label && value) attrs[label.toLowerCase()] = value;
          });
          
          return { description, images, attrs };
        });
        
        // Parse bedrooms, surface, etc.
        const bedrooms = parseInt(details.attrs['chambres'] || '0') || 
                        parseInt(details.attrs['pièces'] || '0') - 1 || 5;
        const surface = parseInt(details.attrs['surface habitable']?.replace(/[^0-9]/g, '') || '0');
        const landSurface = parseInt(details.attrs['surface du terrain']?.replace(/[^0-9]/g, '') || '0');
        
        // Check for pool, garage in description
        const descLower = details.description.toLowerCase();
        const hasPool = descLower.includes('piscine');
        const hasGarage = descLower.includes('garage');
        const garageMatch = descLower.match(/garage\s*(?:de\s*)?(\d+)\s*m/);
        const garageM2 = garageMatch ? parseInt(garageMatch[1]) : (hasGarage ? 30 : 0);
        
        const house: House = {
          id: `lbc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          url: fullUrl,
          title: listing.title,
          price: listing.price,
          location: listing.location,
          bedrooms,
          livingAreaM2: surface > 0 ? Math.round(surface * 0.3) : undefined,
          garageM2: garageM2 || undefined,
          landM2: landSurface || undefined,
          hasPool,
          source: 'leboncoin',
          images: details.images.slice(0, 10),
          description: details.description.slice(0, 500),
          addedAt: new Date().toISOString(),
          status: 'pending',
        };
        
        houses.push(house);
        console.log(`   ✅ Added: ${bedrooms} ch, ${landSurface}m² terrain, ${hasPool ? '🏊 piscine' : ''}`);
        
      } catch (err) {
        console.log(`   ❌ Error processing listing: ${err}`);
      }
      
      // Be nice to the server
      await page.waitForTimeout(1500 + Math.random() * 1500);
    }
    
    // Load existing data and merge
    let data;
    try {
      data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'));
    } catch {
      data = {
        lastUpdated: new Date().toISOString(),
        targetAddress: "10 Imp. André Marestan, 31100 Toulouse",
        criteria: {
          maxPrice: 450000,
          minBedrooms: 5,
          minLivingAreaM2: 40,
          minGarageM2: 40,
          minLandM2: 1000,
          maxDistanceMinutes: 40,
          maxWorkCost: 10000
        },
        houses: []
      };
    }
    
    // Add new houses (avoid duplicates by URL)
    const existingUrls = new Set(data.houses.map((h: House) => h.url));
    const newHouses = houses.filter(h => !existingUrls.has(h.url));
    
    data.houses = [...data.houses, ...newHouses];
    data.lastUpdated = new Date().toISOString();
    
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2));
    console.log(`\n✅ Added ${newHouses.length} new houses (${data.houses.length} total)`);
    
  } catch (err) {
    console.error('❌ Error:', err);
  } finally {
    await browser.close();
  }
}

scrapeLeBonCoin().catch(console.error);
