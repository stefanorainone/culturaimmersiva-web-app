const puppeteer = require('puppeteer');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function waitForEnter(message) {
  return new Promise((resolve) => {
    rl.question(message, () => {
      resolve();
    });
  });
}

(async () => {
  console.log('🔍 Testing New City Form fields...\n');
  console.log('📌 This test will open a browser window.');
  console.log('📌 Please login manually when the browser opens.\n');

  const browser = await puppeteer.launch({
    headless: false,  // Browser visibile
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });

  try {
    const page = await browser.newPage();

    // Step 1: Navigate to login
    console.log('📍 Step 1: Navigating to login page...');
    await page.goto('https://culturaimmersiva-it.web.app/admin/login', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('\n⏸️  Please login in the browser window that just opened.');
    await waitForEnter('   Press ENTER after you have logged in and see the dashboard...\n');

    // Step 2: Navigate to New City
    console.log('📍 Step 2: Navigating to New City form...');
    await page.goto('https://culturaimmersiva-it.web.app/admin/city/new', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Step 3: Check page title
    const title = await page.title();
    console.log(`📄 Page title: ${title}\n`);

    // Step 4: Get all labels
    const labels = await page.evaluate(() => {
      const labelElements = document.querySelectorAll('label');
      return Array.from(labelElements).map(label => ({
        text: label.innerText.trim(),
        visible: label.offsetParent !== null
      }));
    });

    const visibleLabels = labels.filter(l => l.visible && l.text);

    console.log('📋 All visible field labels found on page:\n');
    visibleLabels.forEach((label, index) => {
      console.log(`   ${index + 1}. ${label.text}`);
    });

    // Step 5: Check for specific fields
    console.log('\n✅ Checking for required fields in "Dati Evento" section:\n');

    const checks = [
      { field: 'Titolo Evento', found: visibleLabels.some(l => l.text.includes('Titolo Evento')) },
      { field: 'Descrizione', found: visibleLabels.some(l => l.text === 'Descrizione') },
      { field: 'Date', found: visibleLabels.some(l => l.text === 'Date') },
      { field: 'Durata', found: visibleLabels.some(l => l.text.includes('Durata') && !l.text.includes('Esperienza')) },
      { field: 'Durata Esperienza', found: visibleLabels.some(l => l.text === 'Durata Esperienza') },
      { field: 'Prezzo Individuale', found: visibleLabels.some(l => l.text.includes('Prezzo Individuale')) },
      { field: 'Prezzo a Coppia', found: visibleLabels.some(l => l.text.includes('Prezzo a Coppia')) },
      { field: 'Nome Location', found: visibleLabels.some(l => l.text.includes('Nome Location')) },
      { field: 'Nome Organizzatore', found: visibleLabels.some(l => l.text.includes('Nome Organizzatore')) },
      { field: 'Descrizione Organizzatore', found: visibleLabels.some(l => l.text.includes('Descrizione Organizzatore')) }
    ];

    checks.forEach(check => {
      const status = check.found ? '✅ FOUND' : '❌ NOT FOUND';
      console.log(`   ${check.field}: ${status}`);
    });

    // Step 6: Count sections
    const sections = await page.evaluate(() => {
      const h2Elements = document.querySelectorAll('h2');
      const h3Elements = document.querySelectorAll('h3');
      return {
        h2: Array.from(h2Elements).map(h => h.innerText.trim()).filter(t => t),
        h3: Array.from(h3Elements).map(h => h.innerText.trim()).filter(t => t)
      };
    });

    console.log('\n📑 Form sections found:');
    console.log('\n   Main sections (h2):');
    sections.h2.forEach(section => console.log(`   - ${section}`));
    console.log('\n   Subsections (h3):');
    sections.h3.forEach(section => console.log(`   - ${section}`));

    console.log('\n⏸️  Browser will stay open for 10 seconds so you can inspect...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browser.close();
    rl.close();

    console.log('\n✅ Test completed\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    await browser.close();
    rl.close();
    process.exit(1);
  }
})();
