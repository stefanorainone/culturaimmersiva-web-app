const puppeteer = require('puppeteer');

const BASE_URL = 'https://culturaimmersiva-it.web.app';

const pages = [
  { name: 'Homepage', url: '/', checks: ['Cultura Immersiva', 'Esplora le Città'] },
  { name: 'Città', url: '/citta', checks: ['Le Nostre Città', 'disponibili'] },
  { name: 'Scuole', url: '/scuole', checks: ['Scuole'] },
  { name: 'Musei', url: '/musei', checks: ['Musei'] },
  { name: 'Hotel', url: '/hotel', checks: ['Hotel'] },
  { name: 'Contatti', url: '/contatti', checks: ['Contatti'] },
];

async function testPage(browser, page) {
  const browserPage = await browser.newPage();

  // Collect console errors
  const consoleErrors = [];
  browserPage.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Collect network errors
  const networkErrors = [];
  browserPage.on('requestfailed', request => {
    networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log(`\n🔍 Testing: ${page.name} (${page.url})`);

    // Navigate to page
    const response = await browserPage.goto(`${BASE_URL}${page.url}`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Check HTTP status
    const status = response.status();
    if (status === 200) {
      console.log(`  ✅ HTTP Status: ${status}`);
    } else {
      console.log(`  ❌ HTTP Status: ${status}`);
      return { success: false, page: page.name };
    }

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check for expected content
    const content = await browserPage.content();
    let contentChecks = true;

    for (const check of page.checks) {
      if (content.includes(check)) {
        console.log(`  ✅ Content check: "${check}" found`);
      } else {
        console.log(`  ⚠️  Content check: "${check}" NOT found`);
        contentChecks = false;
      }
    }

    // Check images
    const images = await browserPage.$$eval('img', imgs =>
      imgs.map(img => ({
        src: img.src,
        loaded: img.complete && img.naturalHeight !== 0
      }))
    );

    const failedImages = images.filter(img => !img.loaded);
    if (failedImages.length === 0) {
      console.log(`  ✅ All ${images.length} images loaded`);
    } else {
      console.log(`  ⚠️  ${failedImages.length}/${images.length} images failed to load`);
      failedImages.slice(0, 3).forEach(img => {
        console.log(`     - ${img.src}`);
      });
    }

    // Report console errors (filter out common non-critical errors)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('Failed to load resource') &&
      !err.includes('favicon')
    );

    if (criticalErrors.length > 0) {
      console.log(`  ⚠️  Console errors: ${criticalErrors.length}`);
      criticalErrors.slice(0, 3).forEach(err => {
        console.log(`     - ${err.substring(0, 100)}`);
      });
    } else {
      console.log(`  ✅ No critical console errors`);
    }

    // Report network errors
    if (networkErrors.length > 0) {
      console.log(`  ⚠️  Network errors: ${networkErrors.length}`);
      networkErrors.slice(0, 3).forEach(err => {
        console.log(`     - ${err.substring(0, 100)}`);
      });
    } else {
      console.log(`  ✅ No network errors`);
    }

    // Take screenshot
    const screenshotPath = `./test-screenshots/${page.name.replace(/\s+/g, '-').toLowerCase()}.png`;
    await browserPage.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`  📸 Screenshot saved: ${screenshotPath}`);

    await browserPage.close();
    return {
      success: status === 200 && contentChecks,
      page: page.name,
      consoleErrors: criticalErrors.length,
      networkErrors: networkErrors.length,
      imagesFailed: failedImages.length
    };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    await browserPage.close();
    return { success: false, page: page.name, error: error.message };
  }
}

async function testCityDetailPage(browser) {
  const browserPage = await browser.newPage();

  try {
    console.log(`\n🔍 Testing: City Detail Page (dynamic)`);

    // First go to cities page to get a city ID
    await browserPage.goto(`${BASE_URL}/citta`, {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Find first city link
    const cityLink = await browserPage.$('a[href^="/citta/"]');

    if (cityLink) {
      const href = await browserPage.evaluate(el => el.getAttribute('href'), cityLink);
      console.log(`  Found city link: ${href}`);

      const response = await browserPage.goto(`${BASE_URL}${href}`, {
        waitUntil: 'domcontentloaded',
        timeout: 60000
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      const status = response.status();
      console.log(`  ✅ HTTP Status: ${status}`);

      // Check for expected elements
      const hasBookButton = await browserPage.$('button, a').then(async () => {
        const content = await browserPage.content();
        return content.includes('Verifica Disponibilità') || content.includes('Prenota');
      });

      if (hasBookButton) {
        console.log(`  ✅ Booking button found`);
      } else {
        console.log(`  ⚠️  Booking button NOT found`);
      }

      // Take screenshot
      await browserPage.screenshot({
        path: './test-screenshots/city-detail.png',
        fullPage: false
      });
      console.log(`  📸 Screenshot saved: ./test-screenshots/city-detail.png`);

      await browserPage.close();
      return { success: status === 200, page: 'City Detail' };
    } else {
      console.log(`  ⚠️  No city links found on cities page`);
      await browserPage.close();
      return { success: false, page: 'City Detail', error: 'No cities found' };
    }

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    await browserPage.close();
    return { success: false, page: 'City Detail', error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Starting comprehensive site test...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('=' .repeat(60));

  // Create screenshots directory
  const fs = require('fs');
  if (!fs.existsSync('./test-screenshots')) {
    fs.mkdirSync('./test-screenshots');
  }

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const results = [];

  // Test all static pages
  for (const page of pages) {
    const result = await testPage(browser, page);
    results.push(result);
  }

  // Test dynamic city detail page
  const cityDetailResult = await testCityDetailPage(browser);
  results.push(cityDetailResult);

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Passed: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  if (failed > 0) {
    console.log('\n❌ Failed pages:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.page}${r.error ? ': ' + r.error : ''}`);
    });
  }

  // Warnings summary
  const warnings = results.filter(r =>
    r.consoleErrors > 0 || r.networkErrors > 0 || r.imagesFailed > 0
  );

  if (warnings.length > 0) {
    console.log('\n⚠️  Pages with warnings:');
    warnings.forEach(r => {
      const issues = [];
      if (r.consoleErrors > 0) issues.push(`${r.consoleErrors} console errors`);
      if (r.networkErrors > 0) issues.push(`${r.networkErrors} network errors`);
      if (r.imagesFailed > 0) issues.push(`${r.imagesFailed} images failed`);
      console.log(`  - ${r.page}: ${issues.join(', ')}`);
    });
  }

  console.log('\n✨ Test completed!');
  console.log(`📸 Screenshots saved in: ./test-screenshots/\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
