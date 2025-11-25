const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing City Form fields...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Note: This test requires authentication
    // For now, let's just check if the form loads
    const url = 'https://culturaimmersiva-it.web.app/admin/city/alghero';
    console.log(`📍 Navigating to: ${url}\n`);

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}\n`);

    // Check if we're on login page
    const isLoginPage = await page.evaluate(() => {
      return document.body.innerText.includes('Login') || document.body.innerText.includes('Email');
    });

    if (isLoginPage) {
      console.log('🔒 Requires authentication - showing login page');
      console.log('\nTo properly test, you need to:');
      console.log('1. Login to admin dashboard');
      console.log('2. Navigate to a city edit page');
      console.log('3. Check for these fields in "Dati Evento" section:');
      console.log('   - Durata Esperienza (default: 20-30 minuti)');
      console.log('   - Prezzo a Coppia (€) (default: 20)');
    } else {
      // Try to find field labels
      const labels = await page.evaluate(() => {
        const labelElements = document.querySelectorAll('label');
        return Array.from(labelElements).map(label => label.innerText.trim());
      });

      console.log('📋 Found labels on page:');
      labels.forEach(label => {
        if (label) console.log(`   - ${label}`);
      });

      // Check for specific fields
      const hasDurataEsperienza = labels.some(l => l.includes('Durata Esperienza'));
      const hasPrezzoACoppia = labels.some(l => l.includes('Prezzo a Coppia'));

      console.log('\n✅ Field Check:');
      console.log(`   Durata Esperienza: ${hasDurataEsperienza ? '✅ FOUND' : '❌ NOT FOUND'}`);
      console.log(`   Prezzo a Coppia: ${hasPrezzoACoppia ? '✅ FOUND' : '❌ NOT FOUND'}`);
    }

    await browser.close();
    console.log('\n✅ Test completed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
