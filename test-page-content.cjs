const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Checking page content...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    await page.goto('https://culturaimmersiva-it.web.app/admin/city/new', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get page text
    const pageText = await page.evaluate(() => document.body.innerText);

    console.log('📄 Page content (first 500 characters):\n');
    console.log(pageText.substring(0, 500));
    console.log('\n...\n');

    // Check for specific text
    const checks = [
      { text: 'Login', found: pageText.includes('Login') },
      { text: 'Email', found: pageText.includes('Email') },
      { text: 'Password', found: pageText.includes('Password') },
      { text: 'Nuova Città', found: pageText.includes('Nuova Città') },
      { text: 'Modifica Città', found: pageText.includes('Modifica Città') },
      { text: 'Informazioni Base', found: pageText.includes('Informazioni Base') },
      { text: 'Dati Evento', found: pageText.includes('Dati Evento') }
    ];

    console.log('🔍 Content checks:\n');
    checks.forEach(check => {
      console.log(`   ${check.text}: ${check.found ? '✅' : '❌'}`);
    });

    await browser.close();
    console.log('\n✅ Test completed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
