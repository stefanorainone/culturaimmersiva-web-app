const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, getDoc, setDoc, deleteDoc, updateDoc, query, where } = require('firebase/firestore');

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

const citiesToMigrate = [
  { oldId: 'snY8pjFmlVgJHOBLm2cD', newId: 'ancona', name: 'Ancona' },
  { oldId: 'reggio-calabria', newId: 'reggio-di-calabria', name: 'Reggio di Calabria' }
];

async function migrateCities() {
  console.log('\n=== MIGRAZIONE CITY IDS A SLUGS ===\n');

  for (const migration of citiesToMigrate) {
    const { oldId, newId, name } = migration;

    console.log(`\n📍 Migrazione: ${name}`);
    console.log(`   Da:  ${oldId}`);
    console.log(`   A:   ${newId}`);

    try {
      // 1. Leggi il documento originale
      const oldDocRef = doc(db, 'cities', oldId);
      const oldDocSnap = await getDoc(oldDocRef);

      if (!oldDocSnap.exists()) {
        console.log(`   ❌ Documento ${oldId} non trovato`);
        continue;
      }

      const cityData = oldDocSnap.data();

      // 2. Verifica se il nuovo ID esiste già
      const newDocRef = doc(db, 'cities', newId);
      const newDocSnap = await getDoc(newDocRef);

      if (newDocSnap.exists()) {
        console.log(`   ⚠️  ATTENZIONE: ${newId} esiste già! Saltato.`);
        continue;
      }

      // 3. Controlla prenotazioni associate
      const bookingsQuery = query(collection(db, 'bookings'), where('cityId', '==', oldId));
      const bookingsSnap = await getDocs(bookingsQuery);
      const bookingsCount = bookingsSnap.docs.length;

      console.log(`   ℹ️  Prenotazioni trovate: ${bookingsCount}`);

      // 4. Crea il nuovo documento
      const newCityData = {
        ...cityData,
        slug: newId
      };
      await setDoc(newDocRef, newCityData);
      console.log(`   ✅ Creato nuovo documento: ${newId}`);

      // 5. Aggiorna le prenotazioni
      if (bookingsCount > 0) {
        console.log(`   🔄 Aggiornamento ${bookingsCount} prenotazioni...`);
        for (const bookingDoc of bookingsSnap.docs) {
          await updateDoc(doc(db, 'bookings', bookingDoc.id), {
            cityId: newId
          });
        }
        console.log(`   ✅ Prenotazioni aggiornate`);
      }

      // 6. Controlla notifiche associate
      const notificationsQuery = query(collection(db, 'notifications'), where('cityId', '==', oldId));
      const notificationsSnap = await getDocs(notificationsQuery);
      const notificationsCount = notificationsSnap.docs.length;

      if (notificationsCount > 0) {
        console.log(`   ℹ️  Notifiche trovate: ${notificationsCount}`);
        console.log(`   🔄 Aggiornamento ${notificationsCount} notifiche...`);
        for (const notificationDoc of notificationsSnap.docs) {
          await updateDoc(doc(db, 'notifications', notificationDoc.id), {
            cityId: newId
          });
        }
        console.log(`   ✅ Notifiche aggiornate`);
      }

      // 7. Elimina il vecchio documento
      await deleteDoc(oldDocRef);
      console.log(`   🗑️  Eliminato vecchio documento: ${oldId}`);

      console.log(`   ✅ Migrazione completata per ${name}`);
      console.log(`   📍 Nuovo URL: /citta/${newId}`);

    } catch (error) {
      console.error(`   ❌ Errore durante la migrazione di ${name}:`, error);
    }
  }

  console.log('\n=== MIGRAZIONE COMPLETATA ===\n');
  process.exit(0);
}

migrateCities();
