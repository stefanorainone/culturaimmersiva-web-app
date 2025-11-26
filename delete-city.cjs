const { initializeApp } = require('firebase/app');
const { getFirestore, doc, deleteDoc, getDoc } = require('firebase/firestore');

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

const cityIdToDelete = 'snY8pjFmlVgJHOBLm2cD';

async function deleteCity() {
  console.log('\n🗑️  ELIMINAZIONE CITTÀ\n');
  console.log(`ID da eliminare: ${cityIdToDelete}`);

  try {
    // Prima verifica che esista
    const cityRef = doc(db, 'cities', cityIdToDelete);
    const cityDoc = await getDoc(cityRef);

    if (!cityDoc.exists()) {
      console.log('❌ Città non trovata!');
      process.exit(1);
    }

    const cityData = cityDoc.data();
    console.log(`\n📍 Città trovata: ${cityData.name || 'Senza nome'}`);
    console.log(`   Region: ${cityData.region || 'N/A'}`);
    console.log(`   Status: ${cityData.status || 'N/A'}`);
    console.log(`   URL: /citta/${cityIdToDelete}`);

    // Elimina
    console.log('\n🗑️  Eliminazione in corso...');
    await deleteDoc(cityRef);

    console.log('✅ Città eliminata con successo!');
    console.log('\n✨ Operazione completata\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Errore durante l\'eliminazione:', error);
    process.exit(1);
  }
}

deleteCity();
