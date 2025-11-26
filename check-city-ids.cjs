const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBeHOKY-Hu94VljbEQPpGEUivNqTmYQj18",
  authDomain: "culturaimmersiva-it.firebaseapp.com",
  projectId: "culturaimmersiva-it",
  storageBucket: "culturaimmersiva-it.firebasestorage.app",
  messagingSenderId: "502069829629",
  appId: "1:502069829629:web:98e00f748b1c92569d9bc3",
  measurementId: "G-MCSEG2RLEP"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const generateSlug = (name) => {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
};

async function checkCityIds() {
  try {
    const citiesSnapshot = await getDocs(collection(db, 'cities'));

    console.log('\n=== ANALISI IDs CITTÀ IN FIRESTORE ===\n');
    console.log(`Totale città: ${citiesSnapshot.docs.length}\n`);

    const problemCities = [];
    const goodCities = [];

    citiesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const cityId = doc.id;
      const cityName = data.name;
      const expectedSlug = generateSlug(cityName);

      const isCorrect = cityId === expectedSlug;
      const url = `/citta/${cityId}`;

      if (isCorrect) {
        goodCities.push({ cityName, cityId, url });
      } else {
        problemCities.push({ cityName, cityId, expectedSlug, url });
      }
    });

    if (goodCities.length > 0) {
      console.log('✅ CITTÀ CON SLUG CORRETTO:\n');
      goodCities.forEach(({ cityName, cityId, url }) => {
        console.log(`  ${cityName.padEnd(25)} ID: ${cityId.padEnd(30)} URL: ${url}`);
      });
      console.log('');
    }

    if (problemCities.length > 0) {
      console.log('❌ CITTÀ CON ID NON-SLUG (DA CORREGGERE):\n');
      problemCities.forEach(({ cityName, cityId, expectedSlug, url }) => {
        console.log(`  ${cityName.padEnd(25)} ID attuale: ${cityId}`);
        console.log(`  ${''.padEnd(25)} URL attuale: ${url}`);
        console.log(`  ${''.padEnd(25)} Slug atteso: ${expectedSlug}`);
        console.log(`  ${''.padEnd(25)} URL corretto: /citta/${expectedSlug}`);
        console.log('');
      });
    }

    console.log('\n=== RIEPILOGO ===');
    console.log(`Città con slug corretto: ${goodCities.length}`);
    console.log(`Città da correggere: ${problemCities.length}`);

    process.exit(0);
  } catch (error) {
    console.error('Errore:', error);
    process.exit(1);
  }
}

checkCityIds();
