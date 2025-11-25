const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    slowMo: 50
  });

  try {
    const page = await browser.newPage();

    // Enable console logging
    page.on('console', msg => {
      console.log('Browser console:', msg.text());
    });

    console.log('Navigating to admin login...');
    // Use Firebase hosting URL to avoid WordPress redirects
    await page.goto('https://culturaimmersiva-it.web.app/admin', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check if we're already logged in or need to login
    const currentUrl = page.url();
    console.log('Current URL after navigation:', currentUrl);

    const hasLoginForm = await page.evaluate(() => {
      return document.querySelector('input[type="email"]') !== null;
    });

    console.log('Has login form:', hasLoginForm);

    if (!hasLoginForm) {
      console.log('Already logged in or redirected, current URL:', currentUrl);
      // Take screenshot to see what we have
      await page.screenshot({ path: 'admin-no-login.png', fullPage: true });

      // If we're already on the dashboard, continue
      if (!currentUrl.includes('/admin/dashboard')) {
        console.log('Not on dashboard, navigating...');
        await page.goto('https://culturaimmersiva-it.web.app/admin/dashboard', {
          waitUntil: 'networkidle0',
          timeout: 30000
        });
      }
    } else {
      console.log('Waiting for login form...');
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.waitForSelector('input[type="password"]', { timeout: 10000 });

      console.log('Filling login form...');
      await page.type('input[type="email"]', 'admin@culturaimmersiva.it', { delay: 100 });
      await page.type('input[type="password"]', 'Admin123!', { delay: 100 });

      console.log('Clicking login button...');
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      console.log('Logged in successfully');

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Find and click on Alghero edit button
    console.log('Looking for Alghero in the city list...');

    // Take a screenshot to see what's on the page
    await page.screenshot({ path: 'dashboard-page.png', fullPage: true });
    console.log('📸 Dashboard screenshot saved as dashboard-page.png');

    // Check what's actually on the page
    const pageContent = await page.evaluate(() => {
      return {
        hasGrid: document.querySelector('.grid') !== null,
        hasLoginForm: document.querySelector('input[type="email"]') !== null,
        bodyText: document.body.textContent.substring(0, 500),
        title: document.title
      };
    });

    console.log('Page content:', pageContent);

    if (pageContent.hasLoginForm) {
      console.log('Login form detected, filling in credentials...');
      await page.type('input[type="email"]', 'admin@culturaimmersiva.it', { delay: 100 });
      await page.type('input[type="password"]', 'Admin123!', { delay: 100 });

      console.log('Clicking login button...');
      await page.click('button[type="submit"]');

      // Wait for navigation to dashboard after login
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      console.log('Logged in successfully');

      await new Promise(resolve => setTimeout(resolve, 3000));

      // Take another screenshot after login
      await page.screenshot({ path: 'dashboard-after-login.png', fullPage: true });
      console.log('📸 Post-login screenshot saved as dashboard-after-login.png');
    }

    // Wait for the cities grid to load
    console.log('Waiting for cities grid to load...');
    await page.waitForSelector('.grid', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('Cities grid loaded successfully');

    // Find the Alghero card and click edit
    const algheroCityCard = await page.evaluateHandle(() => {
      const cards = Array.from(document.querySelectorAll('.bg-white'));
      return cards.find(card => card.textContent.includes('Alghero'));
    });

    if (algheroCityCard) {
      console.log('Found Alghero card, clicking edit button...');
      const editButton = await algheroCityCard.asElement().waitForSelector('button:has-text("Modifica")').catch(() => {
        return algheroCityCard.asElement().$('button[class*="bg-blue"]');
      });

      if (editButton) {
        await editButton.click();
      } else {
        // Try alternative method
        await page.evaluate((card) => {
          const buttons = card.querySelectorAll('button');
          const editBtn = Array.from(buttons).find(btn =>
            btn.textContent.includes('Modifica') || btn.className.includes('bg-blue')
          );
          if (editBtn) editBtn.click();
        }, algheroCityCard);
      }

      console.log('Waiting for edit form to load...');
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 30000 });
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('\n=== CHECKING FOR NEW FIELDS ===\n');

      // Check for the new fields
      const fieldsCheck = await page.evaluate(() => {
        const results = {
          url: window.location.href,
          allLabels: [],
          foundFields: {
            durataEsperienza: false,
            prezzoCoppia: false,
            organizzatoreNome: false,
            organizzatoreDescrizione: false
          }
        };

        // Get all labels
        const labels = document.querySelectorAll('label');
        labels.forEach(label => {
          const text = label.textContent.trim();
          results.allLabels.push(text);

          if (text.includes('Durata esperienza') || text.includes('Durata Esperienza')) {
            results.foundFields.durataEsperienza = true;
          }
          if (text.includes('Prezzo a coppia') || text.includes('Prezzo Coppia')) {
            results.foundFields.prezzoCoppia = true;
          }
          if (text.includes('Nome Organizzatore')) {
            results.foundFields.organizzatoreNome = true;
          }
          if (text.includes('Descrizione Organizzatore')) {
            results.foundFields.organizzatoreDescrizione = true;
          }
        });

        return results;
      });

      console.log('Current URL:', fieldsCheck.url);
      console.log('\nAll labels found on page:');
      fieldsCheck.allLabels.forEach((label, i) => {
        console.log(`  ${i + 1}. ${label}`);
      });

      console.log('\n=== NEW FIELDS STATUS ===');
      console.log('✓ Durata Esperienza:', fieldsCheck.foundFields.durataEsperienza ? 'FOUND' : 'NOT FOUND');
      console.log('✓ Prezzo a Coppia:', fieldsCheck.foundFields.prezzoCoppia ? 'FOUND' : 'NOT FOUND');
      console.log('✓ Nome Organizzatore:', fieldsCheck.foundFields.organizzatoreNome ? 'FOUND' : 'NOT FOUND');
      console.log('✓ Descrizione Organizzatore:', fieldsCheck.foundFields.organizzatoreDescrizione ? 'FOUND' : 'NOT FOUND');

      const allFound = Object.values(fieldsCheck.foundFields).every(v => v);
      console.log('\n=== RESULT ===');
      if (allFound) {
        console.log('✅ ALL NEW FIELDS ARE VISIBLE!');
      } else {
        console.log('❌ SOME FIELDS ARE MISSING!');
      }

      // Take a screenshot
      await page.screenshot({ path: 'alghero-edit-form.png', fullPage: true });
      console.log('\n📸 Screenshot saved as alghero-edit-form.png');

    } else {
      console.log('❌ Could not find Alghero city card');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await browser.close();
  }
})();
