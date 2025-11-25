const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const SCREENSHOT_DIR = path.join(__dirname, 'screenshots');

// Crea la cartella screenshots se non esiste
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR);
}

async function testWebsite() {
  console.log('🚀 Avvio test con Puppeteer...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    // Test 1: Homepage
    console.log('📸 Test 1: Verifica Homepage...');
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-homepage.png'),
      fullPage: true
    });

    const homeTitle = await page.$eval('h1', el => el.textContent);
    console.log(`   ✅ Titolo homepage: "${homeTitle}"`);

    // Verifica presenza logo
    const logo = await page.$('img[alt="Cultura Immersiva"]');
    console.log(`   ${logo ? '✅' : '❌'} Logo presente`);

    // Verifica sezioni
    const sections = await page.$$('section');
    console.log(`   ✅ Sezioni trovate: ${sections.length}`);

    // Test 2: Pagina Città
    console.log('\n📸 Test 2: Verifica Pagina Città...');
    await page.goto(`${BASE_URL}/citta`, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '02-citta.png'),
      fullPage: true
    });

    const cityCards = await page.$$('[class*="grid"] > div');
    console.log(`   ✅ Card città trovate: ${cityCards.length}`);

    // Verifica immagini città
    const cityImages = await page.$$('img[alt*="disponibili"], img[alt*="terminato"]');
    console.log(`   ✅ Immagini città caricate: ${cityImages.length}`);

    // Test 3: Dettaglio Napoli
    console.log('\n📸 Test 3: Verifica Dettaglio Città (Napoli)...');
    await page.goto(`${BASE_URL}/citta/napoli`, { waitUntil: 'networkidle2' });

    // Aspetta che le immagini siano caricate
    await page.waitForSelector('img', { timeout: 5000 });

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '03-napoli-detail.png'),
      fullPage: true
    });

    const cityDetailTitle = await page.$eval('h1', el => el.textContent);
    console.log(`   ✅ Titolo città: "${cityDetailTitle}"`);

    // Verifica esperienze
    const experiences = await page.$$('[class*="grid"] > div img');
    console.log(`   ✅ Esperienze con immagini: ${experiences.length}`);

    // Verifica informazioni prezzo
    const pricingElement = await page.$('h3');
    const hasPricing = pricingElement !== null;
    console.log(`   ${hasPricing ? '✅' : '⚠️'} Sezione prezzi ${hasPricing ? 'presente' : 'non trovata'}`);

    // Test 4: Pagina Musei
    console.log('\n📸 Test 4: Verifica Pagina Musei...');
    await page.goto(`${BASE_URL}/musei`, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '04-musei.png'),
      fullPage: true
    });

    const museumsTitle = await page.$eval('h1', el => el.textContent);
    console.log(`   ✅ Titolo musei: "${museumsTitle}"`);

    // Test 5: Pagina Contatti
    console.log('\n📸 Test 5: Verifica Pagina Contatti...');
    await page.goto(`${BASE_URL}/contatti`, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '05-contatti.png'),
      fullPage: true
    });

    const contactForm = await page.$('form');
    console.log(`   ${contactForm ? '✅' : '❌'} Form contatti presente`);

    // Test 6: Verifica immagini caricate
    console.log('\n📸 Test 6: Verifica caricamento immagini...');
    await page.goto(`${BASE_URL}/citta/bologna`, { waitUntil: 'networkidle2' });

    const allImages = await page.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth
      }))
    );

    const loadedImages = allImages.filter(img => img.complete && img.naturalWidth > 0);
    const brokenImages = allImages.filter(img => img.complete && img.naturalWidth === 0);

    console.log(`   ✅ Immagini caricate correttamente: ${loadedImages.length}/${allImages.length}`);
    if (brokenImages.length > 0) {
      console.log(`   ⚠️  Immagini non caricate: ${brokenImages.length}`);
      brokenImages.forEach(img => {
        console.log(`      - ${img.src}`);
      });
    }

    // Test 7: Test responsive
    console.log('\n📸 Test 7: Screenshot responsive (mobile)...');
    await page.setViewport({ width: 375, height: 812 }); // iPhone X
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-mobile-home.png'),
      fullPage: true
    });

    await page.goto(`${BASE_URL}/citta/napoli`, { waitUntil: 'networkidle2' });
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '07-mobile-napoli.png'),
      fullPage: true
    });

    console.log('   ✅ Screenshot mobile completati');

    // Riepilogo
    console.log('\n' + '='.repeat(60));
    console.log('✅ TUTTI I TEST COMPLETATI CON SUCCESSO!');
    console.log('='.repeat(60));
    console.log(`\n📂 Screenshot salvati in: ${SCREENSHOT_DIR}\n`);

  } catch (error) {
    console.error('\n❌ ERRORE durante i test:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

// Esegui i test
testWebsite()
  .then(() => {
    console.log('🎉 Verifica completata!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test falliti:', error);
    process.exit(1);
  });
