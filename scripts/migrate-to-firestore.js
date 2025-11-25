import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';
import { cities } from '../src/data/cities.js';
import { cityDetails } from '../src/data/cityDetails.js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env') });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrateCities() {
  console.log('🔄 Starting migration to Firestore...\n');

  let successCount = 0;
  let errorCount = 0;

  for (const city of cities) {
    try {
      // Merge with detailed data if available
      const detailedData = cityDetails[city.id] || {};

      const cityData = {
        name: city.name,
        region: city.region,
        status: city.status,
        image: city.image,
        eventData: detailedData.title ? {
          title: detailedData.title || '',
          description: detailedData.description || '',
          dates: detailedData.dates || '',
          location: detailedData.location || { name: '', address: '' },
          organizer: detailedData.organizer || { name: '', description: '' },
          pricing: detailedData.pricing || { individual: 10, currency: '€' },
          experiences: detailedData.experiences || [],
          booking: detailedData.booking || {
            advancePayment: false,
            limitedSpots: true,
            whatsapp: true,
            whatsappNumber: ''
          }
        } : {
          title: `Cultura Immersiva - ${city.name}`,
          description: '',
          dates: '',
          location: { name: '', address: '' },
          organizer: { name: '', description: '' },
          pricing: { individual: 10, currency: '€' },
          experiences: [],
          booking: {
            advancePayment: false,
            limitedSpots: true,
            whatsapp: true,
            whatsappNumber: ''
          }
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'cities', city.id), cityData);
      console.log(`✅ Migrated: ${city.name} (${city.id})`);
      successCount++;
    } catch (error) {
      console.error(`❌ Error migrating ${city.name}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   📈 Total: ${cities.length}`);
  console.log('\n🎉 Migration completed!');
  process.exit(0);
}

migrateCities().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
