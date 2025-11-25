const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const fullUrl = url.startsWith('http') ? url : `https://www.culturaimmersiva.it/${url}`;

    https.get(fullUrl, (response) => {
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

async function downloadCitiesFromHome() {
  console.log('🔍 Scarico immagini delle città dalla homepage...\n');

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();
  await page.goto('https://www.culturaimmersiva.it', { waitUntil: 'networkidle2', timeout: 30000 });

  // Estrae tutte le città con le loro immagini
  const cities = await page.evaluate(() => {
    const cityCards = Array.from(document.querySelectorAll('.city-card, [class*="city"], .elementor-widget-container'));
    const citiesData = [];

    // Cerca in tutte le card/contenitori
    const allContainers = Array.from(document.querySelectorAll('.elementor-element'));

    allContainers.forEach(container => {
      const heading = container.querySelector('h1, h2, h3, h4, .city-name');
      const image = container.querySelector('img');

      if (heading && image && heading.textContent.trim()) {
        const cityName = heading.textContent.trim();
        const imageUrl = image.src || image.dataset.src || '';

        if (imageUrl && !imageUrl.includes('logo')) {
          citiesData.push({
            name: cityName,
            imageUrl: imageUrl
          });
        }
      }
    });

    return citiesData;
  });

  console.log(`📊 Trovate ${cities.length} città con immagini\n`);

  // Mappa dei nomi città agli ID
  const cityIdMap = {
    'Alghero': 'alghero',
    'Bari': 'bari',
    'Benevento': 'benevento',
    'Bologna': 'bologna',
    'Brindisi': 'brindisi',
    'Cagliari': 'cagliari',
    'Cassino': 'cassino',
    'Catania': 'catania',
    'Chieti': 'chieti',
    'Cosenza': 'cosenza',
    'Creazzo': 'creazzo',
    'Empoli': 'empoli',
    'Ferrara': 'ferrara',
    'Foligno': 'foligno',
    'Genova': 'genova',
    'Grottaglie': 'grottaglie',
    'Isernia': 'isernia',
    "L'Aquila": 'laquila',
    'Lentini': 'lentini',
    'Livorno': 'livorno',
    'Lucca': 'lucca',
    'Modena': 'modena',
    'Monopoli': 'monopoli',
    'Montescaglioso': 'montescaglioso',
    'Napoli': 'napoli',
    'Nola': 'nola',
    'Palermo': 'palermo',
    'Pisa': 'pisa',
    'Pompei': 'pompei',
    'Ragusa': 'ragusa',
    'Reggio di Calabria': 'reggio-calabria',
    'Reggio Emilia': 'reggio-emilia',
    'Salerno': 'salerno',
    'Santa Maria Capua Vetere': 'santa-maria-capua-vetere',
    'Sassari': 'sassari',
    'Savona': 'savona',
    'Siracusa': 'siracusa',
    'Taranto': 'taranto',
    'Termoli': 'termoli',
    'Trieste': 'trieste',
    'Udine': 'udine',
    'Venezia Mestre': 'venezia-mestre',
    'Viterbo': 'viterbo'
  };

  for (const city of cities) {
    const cityId = cityIdMap[city.name];

    if (!cityId) {
      console.log(`⚠️  ${city.name} - ID non trovato, skipped\n`);
      continue;
    }

    console.log(`📥 ${city.name} (${cityId})...`);
    console.log(`   URL: ${city.imageUrl}`);

    try {
      const outputPath = path.join(__dirname, 'public', 'images', 'cities', `${cityId}.webp`);
      await downloadImage(city.imageUrl, outputPath);
      console.log(`   ✅ Salvata\n`);
    } catch (error) {
      console.log(`   ❌ Errore: ${error.message}\n`);
    }

    // Pausa tra download
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  await browser.close();
  console.log('\n✅ Download completato!');
}

downloadCitiesFromHome();
