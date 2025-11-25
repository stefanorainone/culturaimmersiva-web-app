import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, updateDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBDQXMlCVOC5Xh1P3e6-TsWk8A8xM6qEGg",
  authDomain: "culturaimmersiva-it.firebaseapp.com",
  projectId: "culturaimmersiva-it",
  storageBucket: "culturaimmersiva-it.firebasestorage.app",
  messagingSenderId: "637735881695",
  appId: "1:637735881695:web:8c5b5e0c5d5e8c5b5e5e5e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateCityDurations() {
  console.log('🔄 Inizio aggiornamento durata esperienze...\n');

  try {
    const snapshot = await getDocs(collection(db, 'cities'));
    const cities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    let updatedCount = 0;
    let skippedCount = 0;

    for (const city of cities) {
      const cityName = city.name || city.id;

      console.log(`\n📍 ${cityName}:`);

      // Check if city has eventData
      if (!city.eventData) {
        console.log(`   ⚠️  Nessun eventData presente - SKIP`);
        skippedCount++;
        continue;
      }

      // Update duration to "20-30 minuti"
      await updateDoc(doc(db, 'cities', city.id), {
        'eventData.duration': '20-30 minuti'
      });

      console.log(`   ✅ Durata aggiornata a "20-30 minuti"`);
      updatedCount++;
    }

    console.log('\n' + '='.repeat(60));
    console.log(`✅ Completato!`);
    console.log(`   Città aggiornate: ${updatedCount}`);
    console.log(`   Città saltate: ${skippedCount}`);
    console.log(`   Totale città: ${cities.length}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('❌ Errore:', error);
    process.exit(1);
  }

  process.exit(0);
}

updateCityDurations();
