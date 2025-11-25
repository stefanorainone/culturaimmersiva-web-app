const puppeteer = require('puppeteer');

async function testHomeImages() {
  console.log('🔍 Test immagini homepage...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  try {
    await page.goto('http://localhost:5173/', { waitUntil: 'networkidle2' });

    // Scroll fino alla sezione città in evidenza
    await page.evaluate(() => {
      const section = document.querySelector('section:nth-of-type(3)');
      if (section) section.scrollIntoView({ behavior: 'smooth' });
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    // Prendi screenshot della sezione città
    await page.screenshot({
      path: 'screenshots/home-citta-section.png',
      fullPage: false
    });

    // Conta le immagini delle città nella sezione Featured Cities
    const cityImages = await page.$$eval('section:nth-of-type(3) img', imgs =>
      imgs.map(img => ({
        src: img.src,
        alt: img.alt,
        complete: img.complete,
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight
      }))
    );

    console.log(`📊 Immagini città in evidenza: ${cityImages.length}\n`);

    cityImages.forEach((img, i) => {
      const status = img.complete && img.naturalWidth > 0 ? '✅' : '❌';
      console.log(`${status} ${i + 1}. ${img.alt || 'No alt'}`);
      console.log(`   URL: ${img.src}`);
      console.log(`   Size: ${img.naturalWidth}x${img.naturalHeight}\n`);
    });

    const loaded = cityImages.filter(img => img.complete && img.naturalWidth > 0);
    console.log(`\n✅ Immagini caricate: ${loaded.length}/${cityImages.length}`);

  } catch (error) {
    console.error('❌ Errore:', error.message);
  } finally {
    await browser.close();
  }
}

testHomeImages();
