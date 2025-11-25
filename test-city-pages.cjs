const puppeteer = require('puppeteer');

const BASE_URL = 'https://culturaimmersiva-it.web.app';

// Cities to test
const citiesToTest = [
  // Available cities
  { id: 'benevento', name: 'Benevento', status: 'available', expectedContent: ['Prenota', 'Verifica Disponibilità'] },
  { id: 'bologna', name: 'Bologna', status: 'available', expectedContent: ['Prenota'] },
  { id: 'napoli', name: 'Napoli', status: 'available', expectedContent: ['Prenota', 'Verifica Disponibilità'] },

  // Ended cities
  { id: 'genova', name: 'Genova', status: 'ended', expectedContent: ['Prossimamente', 'pianificando un nuovo evento', 'Avvisami quando disponibile'] },
  { id: 'pisa', name: 'Pisa', status: 'ended', expectedContent: ['Prossimamente', 'pianificando un nuovo evento'] },
  { id: 'bari', name: 'Bari', status: 'ended', expectedContent: ['Prossimamente', 'pianificando un nuovo evento'] },
];

async function testCityPage(browser, city) {
  const page = await browser.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  // Collect network errors
  const networkErrors = [];
  page.on('requestfailed', request => {
    networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
  });

  try {
    console.log(`\n🔍 Testing: ${city.name} (${city.status})`);

    const url = `${BASE_URL}/citta/${city.id}`;
    const response = await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 45000
    });

    // Check HTTP status
    const status = response.status();
    if (status === 200) {
      console.log(`  ✅ HTTP Status: ${status}`);
    } else {
      console.log(`  ❌ HTTP Status: ${status}`);
      await page.close();
      return { success: false, city: city.name, status: city.status };
    }

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Check for expected content
    const content = await page.content();
    let contentChecks = true;

    for (const check of city.expectedContent) {
      if (content.includes(check)) {
        console.log(`  ✅ Content check: "${check}" found`);
      } else {
        console.log(`  ⚠️  Content check: "${check}" NOT found`);
        contentChecks = false;
      }
    }

    // Additional checks based on city status
    if (city.status === 'available') {
      // Check for booking button
      const hasBookButton = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons.some(btn =>
          btn.textContent.includes('Prenota') ||
          btn.textContent.includes('Verifica Disponibilità')
        );
      });

      if (hasBookButton) {
        console.log(`  ✅ Booking button found`);
      } else {
        console.log(`  ⚠️  Booking button NOT found`);
        contentChecks = false;
      }
    } else if (city.status === 'ended') {
      // Check for notification form
      const hasNotificationForm = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[type="email"], input[type="tel"]'));
        const submitButton = Array.from(document.querySelectorAll('button')).some(btn =>
          btn.textContent.includes('Avvisami')
        );
        return inputs.length >= 2 && submitButton;
      });

      if (hasNotificationForm) {
        console.log(`  ✅ Notification form found (email + whatsapp + submit button)`);
      } else {
        console.log(`  ⚠️  Notification form NOT found`);
        contentChecks = false;
      }
    }

    // Check images
    const images = await page.$$eval('img', imgs =>
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
    }

    // Report console errors (filter out common non-critical errors)
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('DevTools') &&
      !err.includes('Failed to load resource') &&
      !err.includes('favicon')
    );

    if (criticalErrors.length > 0) {
      console.log(`  ⚠️  Console errors: ${criticalErrors.length}`);
      criticalErrors.slice(0, 2).forEach(err => {
        console.log(`     - ${err.substring(0, 80)}`);
      });
    } else {
      console.log(`  ✅ No critical console errors`);
    }

    // Report network errors
    if (networkErrors.length > 0) {
      console.log(`  ⚠️  Network errors: ${networkErrors.length}`);
    } else {
      console.log(`  ✅ No network errors`);
    }

    // Take screenshot
    const screenshotPath = `./test-screenshots/city-${city.id}-${city.status}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`  📸 Screenshot saved: ${screenshotPath}`);

    await page.close();
    return {
      success: status === 200 && contentChecks,
      city: city.name,
      status: city.status,
      consoleErrors: criticalErrors.length,
      networkErrors: networkErrors.length,
      imagesFailed: failedImages.length
    };

  } catch (error) {
    console.log(`  ❌ Error: ${error.message}`);
    await page.close();
    return {
      success: false,
      city: city.name,
      status: city.status,
      error: error.message
    };
  }
}

async function runTests() {
  console.log('🚀 Testing all city pages (available + ended)...\n');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('=' .repeat(70));

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

  // Test all cities
  for (const city of citiesToTest) {
    const result = await testCityPage(browser, city);
    results.push(result);
  }

  await browser.close();

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\n✅ Passed: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);

  // Group by status
  const availableResults = results.filter(r => r.status === 'available');
  const endedResults = results.filter(r => r.status === 'ended');

  console.log(`\n📍 Available cities tested: ${availableResults.length}`);
  console.log(`   ✅ Passed: ${availableResults.filter(r => r.success).length}`);
  console.log(`   ❌ Failed: ${availableResults.filter(r => !r.success).length}`);

  console.log(`\n📍 Ended cities tested: ${endedResults.length}`);
  console.log(`   ✅ Passed: ${endedResults.filter(r => r.success).length}`);
  console.log(`   ❌ Failed: ${endedResults.filter(r => !r.success).length}`);

  if (failed > 0) {
    console.log('\n❌ Failed pages:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.city} (${r.status})${r.error ? ': ' + r.error : ''}`);
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
      console.log(`  - ${r.city} (${r.status}): ${issues.join(', ')}`);
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
