const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing Alghero city page locally...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      const type = msg.type();
      const text = msg.text();
      logs.push(`[${type.toUpperCase()}] ${text}`);
    });

    // Capture errors
    page.on('pageerror', error => {
      logs.push(`[ERROR] ${error.message}`);
    });

    // Navigate to Alghero page
    const url = 'http://localhost:5173/citta/alghero';
    console.log(`📍 Navigating to: ${url}\n`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}\n`);

    // Check what's on the page
    const hasNotificationForm = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Ricevi Notifiche') ||
             text.includes('Prossimamente') ||
             text.includes('Avvisami quando disponibile');
    });

    const hasBookingForm = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Prenota') ||
             text.includes('Verifica Disponibilità') ||
             text.includes('Prezzi');
    });

    const hasError = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Si è verificato un errore');
    });

    // Get main heading
    const mainHeading = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      const h2 = document.querySelector('h2');
      return (h1 && h1.innerText) || (h2 && h2.innerText) || 'No heading found';
    });

    const pageText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 500);
    });

    console.log('📋 Page Status Check:\n');
    console.log(`   Has Error Page: ${hasError ? '❌ YES' : '✅ NO'}`);
    console.log(`   Notification Form: ${hasNotificationForm ? '✅ YES' : '❌ NO'}`);
    console.log(`   Booking Form: ${hasBookingForm ? '✅ YES' : '❌ NO'}`);
    console.log(`\n   Main Heading: ${mainHeading}`);

    console.log('\n📝 Page Content Preview:');
    console.log(`   ${pageText.split('\n').join('\n   ')}`);

    console.log('\n📋 Console Logs:\n');
    logs.forEach(log => console.log(`   ${log}`));

    if (hasError) {
      console.log('\n❌ RESULT: Page is showing ERROR PAGE');
    } else if (hasNotificationForm && !hasBookingForm) {
      console.log('\n✅ RESULT: Page is showing NOTIFICATION FORM (not available)');
    } else if (hasBookingForm && !hasNotificationForm) {
      console.log('\n✅ RESULT: Page is showing BOOKING FORM (available)');
    } else {
      console.log('\n⚠️  RESULT: UNCLEAR status');
    }

    await browser.close();
    console.log('\n✅ Test completed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
