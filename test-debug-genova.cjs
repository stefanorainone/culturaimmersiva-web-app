const puppeteer = require('puppeteer');

const BASE_URL = 'https://culturaimmersiva-it.web.app';

async function debugPage() {
  console.log('🔍 Debugging Genova page...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  // Capture ALL console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[CONSOLE ${type.toUpperCase()}]: ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR]: ${error.message}`);
    console.log(`Stack: ${error.stack}`);
  });

  // Capture failed requests
  page.on('requestfailed', request => {
    console.log(`[REQUEST FAILED]: ${request.url()}`);
    console.log(`  Reason: ${request.failure().errorText}`);
  });

  try {
    console.log('Navigating to Genova page...');
    await page.goto(`${BASE_URL}/citta/genova`, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    console.log('\nWaiting 5 seconds for page to load...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    console.log('\nChecking page content...');
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body text length:', bodyText.length);
    console.log('Body text (first 500 chars):', bodyText.substring(0, 500));

    // Check for specific elements
    const hasHeader = await page.$('header') !== null;
    const hasMain = await page.$('main') !== null;
    const hasForm = await page.$('form') !== null;

    console.log('\nElement checks:');
    console.log('  Has header:', hasHeader);
    console.log('  Has main:', hasMain);
    console.log('  Has form:', hasForm);

    // Get HTML
    const html = await page.content();
    console.log('\nHTML length:', html.length);

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
}

debugPage().catch(console.error);
