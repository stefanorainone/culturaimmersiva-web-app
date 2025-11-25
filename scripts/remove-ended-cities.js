import admin from 'firebase-admin';
import { readFileSync } from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync('./serviceAccountKey.json', 'utf8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// List of ended cities that should NOT be in Firestore
const endedCities = [
  'alghero', 'bari', 'brindisi', 'cassino', 'catania', 'creazzo',
  'cosenza', 'empoli', 'genova', 'grottaglie', 'isernia', 'laquila',
  'lentini', 'livorno', 'montescaglioso', 'pisa', 'pompei', 'ragusa',
  'reggio-calabria', 'reggio-emilia', 'sassari', 'salerno', 'savona',
  'santa-maria-capua-vetere', 'siracusa', 'taranto', 'venezia-mestre', 'viterbo'
];

async function removeEndedCities() {
  console.log('🗑️  Removing ended cities from Firestore...\n');

  let removedCount = 0;
  let notFoundCount = 0;

  for (const cityId of endedCities) {
    const cityRef = db.collection('cities').doc(cityId);
    const cityDoc = await cityRef.get();

    if (cityDoc.exists()) {
      console.log(`   Removing: ${cityId}`);
      await cityRef.delete();
      removedCount++;
    } else {
      notFoundCount++;
    }
  }

  console.log(`\n✅ Complete!`);
  console.log(`   Removed: ${removedCount} cities`);
  console.log(`   Not found: ${notFoundCount} cities`);
  console.log(`\nEnded cities should only exist in src/data/cities.js as static data.`);

  process.exit(0);
}

removeEndedCities().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
