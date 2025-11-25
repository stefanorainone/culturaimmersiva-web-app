const puppeteer = require('puppeteer');

(async () => {
  console.log('🔍 Testing New City Form (automated check)...\n');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Capture console logs
    const logs = [];
    page.on('console', msg => {
      logs.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Try to go directly to new city form
    console.log('📍 Attempting to access: /admin/city/new\n');

    await page.goto('https://culturaimmersiva-it.web.app/admin/city/new', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check current URL
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}\n`);

    // Get page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}\n`);

    // Check if redirected to login
    const isLoginPage = currentUrl.includes('/login') || currentUrl.includes('/admin/login');

    if (isLoginPage) {
      console.log('🔒 Redirected to login page (expected without authentication)\n');
      console.log('ℹ️  To properly test, you need to:');
      console.log('   1. Open: https://culturaimmersiva-it.web.app/admin/login');
      console.log('   2. Login with admin credentials');
      console.log('   3. Navigate to: Admin > Nuova Città');
      console.log('   4. Check for these fields in "Dati Evento" section:');
      console.log('      - Durata Esperienza (should show input with default "20-30 minuti")');
      console.log('      - Prezzo a Coppia (€) (should show input with default "20")');
      console.log('      - Nome Organizzatore');
      console.log('      - Descrizione Organizzatore\n');

      // Try to read the login page to confirm
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('📋 Login page confirmation:');
      if (pageText.includes('Login') || pageText.includes('Email')) {
        console.log('   ✅ Confirmed: Login page is showing\n');
      }
    } else {
      // We somehow got to the form, check fields
      const labels = await page.evaluate(() => {
        const labelElements = document.querySelectorAll('label');
        return Array.from(labelElements).map(label => label.innerText.trim()).filter(t => t);
      });

      console.log('📋 Field labels found:\n');
      labels.forEach((label, i) => console.log(`   ${i + 1}. ${label}`));

      const hasDurataEsperienza = labels.some(l => l.includes('Durata Esperienza'));
      const hasPrezzoACoppia = labels.some(l => l.includes('Prezzo a Coppia'));
      const hasOrganizerName = labels.some(l => l.includes('Nome Organizzatore'));
      const hasOrganizerDesc = labels.some(l => l.includes('Descrizione Organizzatore'));

      console.log('\n✅ Critical field check:');
      console.log(`   Durata Esperienza: ${hasDurataEsperienza ? '✅' : '❌'}`);
      console.log(`   Prezzo a Coppia: ${hasPrezzoACoppia ? '✅' : '❌'}`);
      console.log(`   Nome Organizzatore: ${hasOrganizerName ? '✅' : '❌'}`);
      console.log(`   Descrizione Organizzatore: ${hasOrganizerDesc ? '✅' : '❌'}`);
    }

    // Show console logs if any
    if (logs.length > 0) {
      console.log('\n📋 Browser console logs:');
      logs.slice(0, 10).forEach(log => console.log(`   ${log}`));
    }

    await browser.close();
    console.log('\n✅ Test completed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    process.exit(1);
  }
})();
