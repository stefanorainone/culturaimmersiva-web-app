import { db } from './src/config/firebase.js';
import { doc, getDoc } from 'firebase/firestore';

async function checkGenova() {
  try {
    const cityDoc = await getDoc(doc(db, 'cities', 'genova'));

    if (cityDoc.exists()) {
      console.log('Genova EXISTS in Firestore!');
      console.log('Data:', JSON.stringify(cityDoc.data(), null, 2));
    } else {
      console.log('Genova does NOT exist in Firestore (expected for ended cities)');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  process.exit(0);
}

checkGenova();
