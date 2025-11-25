const puppeteer = require('puppeteer');

async function testCityImages() {
  console.log('🔍 Test immagini città...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto('http://localhost:5173/citta', { waitUntil: 'networkidle2' });

    // Aspetta che le immagini siano caricate
    await page.waitForSelector('img', { timeout: 5000 });

    // Prendi screenshot
    await page.screenshot({
      path: 'screenshots/citta-test.png',
      fullPage: false
    });

    // Conta le immagini
    const images = await page.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }))
    );

    console.log(`📊 Totale immagini trovate: ${images.length}\n`);

    images.forEach((img, i) => {
      const status = img.complete && img.naturalWidth > 0 ? '✅' : '❌';
      console.log(`${status} ${i + 1}. ${img.alt || 'No alt'}`);
      console.log(`   URL: ${img.src}`);
      console.log(`   Size: ${img.naturalWidth}x${img.naturalHeight}\n`);
    });

    const loaded = images.filter(img => img.complete && img.naturalWidth > 0);
    console.log(`\n✅ Immagini caricate: ${loaded.length}/${images.length}`);

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await browser.close();
  }
}

testCityImages();
