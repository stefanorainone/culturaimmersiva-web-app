const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Lista di tutte le città con URL
const cities = [
  { id: 'benevento', name: 'Benevento', url: 'https://www.culturaimmersiva.it/benevento-2/' },
  { id: 'bologna', name: 'Bologna', url: 'https://www.culturaimmersiva.it/bologna-2/' },
  { id: 'cagliari', name: 'Cagliari', url: 'https://www.culturaimmersiva.it/cagliari' },
  { id: 'chieti', name: 'Chieti', url: 'https://www.culturaimmersiva.it/chieti/' },
  { id: 'ferrara', name: 'Ferrara', url: 'https://www.culturaimmersiva.it/ferrara' },
  { id: 'foligno', name: 'Foligno', url: 'https://www.culturaimmersiva.it/foligno/' },
  { id: 'lucca', name: 'Lucca', url: 'https://www.culturaimmersiva.it/lucca/' },
  { id: 'modena', name: 'Modena', url: 'https://www.culturaimmersiva.it/modena/' },
  { id: 'monopoli', name: 'Monopoli', url: 'https://www.culturaimmersiva.it/monopoli/' },
  { id: 'napoli', name: 'Napoli', url: 'https://www.culturaimmersiva.it/napoli-2/' },
  { id: 'nola', name: 'Nola', url: 'https://www.culturaimmersiva.it/nola/' },
  { id: 'palermo', name: 'Palermo', url: 'https://www.culturaimmersiva.it/palermo' },
  { id: 'termoli', name: 'Termoli', url: 'https://www.culturaimmersiva.it/termoli-2/' },
  { id: 'trieste', name: 'Trieste', url: 'https://www.culturaimmersiva.it/trieste/' },
  { id: 'udine', name: 'Udine', url: 'https://www.culturaimmersiva.it/udine/' }
];

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 200) {
        const fileStream = fs.createWriteStream(filepath);
        response.pipe(fileStream);
        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });
      } else {
        reject(new Error(`Failed to download: ${response.statusCode}`));
      }
    }).on('error', reject);
  });
}

async function downloadCityImages() {
  console.log('🔍 Scarico immagini corrette per ogni città...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  for (const city of cities) {
    console.log(`📥 ${city.name} (${city.id})...`);

    try {
      const page = await browser.newPage();
      await page.goto(city.url, { waitUntil: 'networkidle2', timeout: 30000 });

      // Cerca l'immagine principale della città
      const imageUrl = await page.evaluate(() => {
        // Prova diverse strategie per trovare l'immagine della città

        // 1. Cerca hero image o featured image
        let img = document.querySelector('.elementor-widget-image img');
        if (img && img.src) return img.src;

        // 2. Cerca nella sezione hero
        img = document.querySelector('.hero img, .banner img');
        if (img && img.src) return img.src;

        // 3. Cerca wp-post-image
        img = document.querySelector('.wp-post-image');
        if (img && img.src) return img.src;

        // 4. Prima immagine grande nel contenuto
        const images = Array.from(document.querySelectorAll('img'));
        const largeImage = images.find(img =>
          img.naturalWidth > 500 &&
          !img.src.includes('logo') &&
          !img.src.includes('icon')
        );
        if (largeImage) return largeImage.src;

        // 5. Qualsiasi immagine con alt che contiene il nome della pagina
        img = document.querySelector('img[alt*="Cultura"]');
        if (img && img.src) return img.src;

        return null;
      });

      if (imageUrl) {
        console.log(`   URL trovato: ${imageUrl}`);

        // Download dell'immagine
        const outputPath = path.join(__dirname, 'public', 'images', 'cities', `${city.id}.webp`);

        // Se l'immagine è già in formato webp, scaricala direttamente
        if (imageUrl.includes('.webp')) {
          await downloadImage(imageUrl, outputPath);
          console.log(`   ✅ Salvata in ${city.id}.webp\n`);
        } else {
          // Altrimenti scarica e converti (per ora salviamo l'originale)
          const ext = imageUrl.split('.').pop().split('?')[0];
          const tempPath = path.join(__dirname, 'public', 'images', 'cities', `${city.id}-temp.${ext}`);
          await downloadImage(imageUrl, tempPath);

          // Per ora rinominiamo in .webp (idealmente dovremmo convertire)
          fs.renameSync(tempPath, outputPath);
          console.log(`   ✅ Salvata in ${city.id}.webp\n`);
        }
      } else {
        console.log(`   ⚠️  Nessuna immagine trovata\n`);
      }

      await page.close();

      // Pausa tra le richieste
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.log(`   ❌ Errore: ${error.message}\n`);
    }
  }

  await browser.close();
  console.log('\n✅ Download completato!');
}

downloadCityImages();
