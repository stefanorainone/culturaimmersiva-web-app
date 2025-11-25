const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing Alghero city page...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Navigate to Alghero page
    const url = 'https://culturaimmersiva-it.web.app/citta/alghero';
    console.log(`📍 Navigating to: ${url}`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait a bit for React to render
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}\n`);

    // Check for notification form (means city is NOT available)
    const hasNotificationForm = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Ricevi Notifiche') ||
             text.includes('Prossimamente') ||
             text.includes('Avvisami quando disponibile');
    });

    // Check for booking form (means city IS available)
    const hasBookingForm = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Prenota') ||
             text.includes('Seleziona Data') ||
             text.includes('Orario');
    });

    // Check page text content
    const bodyText = await page.evaluate(() => {
      return document.body.innerText.substring(0, 500);
    });

    console.log('📋 Page Status Check:\n');
    console.log(`   Notification Form (NOT available): ${hasNotificationForm ? '✅ YES' : '❌ NO'}`);
    console.log(`   Booking Form (IS available): ${hasBookingForm ? '✅ YES' : '❌ NO'}`);

    console.log('\n📝 Page Content Preview:');
    console.log('   ' + bodyText.replace(/\n/g, '\n   ').substring(0, 300) + '...\n');

    // Determine status
    if (hasNotificationForm && !hasBookingForm) {
      console.log('🔴 RESULT: Alghero is shown as NOT AVAILABLE (notification form)');
    } else if (hasBookingForm && !hasNotificationForm) {
      console.log('🟢 RESULT: Alghero is shown as AVAILABLE (booking form)');
    } else {
      console.log('⚠️  RESULT: UNCLEAR - both or neither forms detected');
    }

    // Check for specific elements
    console.log('\n🔍 Detailed Element Check:');

    const hasTitle = await page.evaluate(() => {
      return document.querySelector('h1, h2')?.innerText || 'Not found';
    });
    console.log(`   Main Title: ${hasTitle}`);

    const hasPricing = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('€') || text.includes('Prezzo') || text.includes('Biglietto');
    });
    console.log(`   Pricing Info: ${hasPricing ? '✅ Found' : '❌ Not found'}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
    console.log('\n✅ Test completed');
  }
})();
