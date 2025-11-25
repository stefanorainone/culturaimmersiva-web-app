const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Debug Alghero page...\n');

  const browser = await puppeteer.launch({
    headless: false,  // Apri browser visibile
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capture console logs
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      console.log(`[BROWSER ${type.toUpperCase()}]`, text);
    });

    // Capture errors
    page.on('pageerror', error => {
      console.log(`[PAGE ERROR]`, error.message);
    });

    // Navigate to Alghero page
    const url = 'https://culturaimmersiva-it.web.app/citta/alghero';
    console.log(`📍 Navigating to: ${url}\n`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait to see logs
    console.log('\n⏳ Waiting 10 seconds to see logs...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));

    console.log('\n✅ Done - check browser');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
})();
