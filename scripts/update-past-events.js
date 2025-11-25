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

// Funzione per estrarre l'ultima data da una stringa di date
function parseEventDate(dateString) {
  if (!dateString) return null;

  // Esempi di formati:
  // "Sabato 29 e Domenica 30 Novembre"
  // "14 e 15 Dicembre 2024"
  // "Sabato 7 e Domenica 8 Dicembre"

  const months = {
    'gennaio': 0, 'febbraio': 1, 'marzo': 2, 'aprile': 3,
    'maggio': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7,
    'settembre': 8, 'ottobre': 9, 'novembre': 10, 'dicembre': 11
  };

  const monthNames = Object.keys(months);
  let foundMonth = null;
  let foundYear = new Date().getFullYear(); // Default anno corrente

  // Cerca il mese nella stringa
  const lowerDateString = dateString.toLowerCase();
  for (const month of monthNames) {
    if (lowerDateString.includes(month)) {
      foundMonth = months[month];
      break;
    }
  }

  if (foundMonth === null) return null;

  // Cerca l'anno (4 cifre)
  const yearMatch = dateString.match(/\b(20\d{2})\b/);
  if (yearMatch) {
    foundYear = parseInt(yearMatch[1]);
  }

  // Estrai tutti i numeri (giorni)
  const dayNumbers = dateString.match(/\b(\d{1,2})\b/g);
  if (!dayNumbers || dayNumbers.length === 0) return null;

  // Usa l'ultimo numero come giorno finale dell'evento
  const lastDay = parseInt(dayNumbers[dayNumbers.length - 1]);

  // Se il numero è maggiore di 31, probabilmente è un anno, prendi il precedente
  const day = lastDay > 31 && dayNumbers.length > 1
    ? parseInt(dayNumbers[dayNumbers.length - 2])
    : lastDay;

  if (day > 31) return null;

  return new Date(foundYear, foundMonth, day, 23, 59, 59);
}

async function updatePastEvents() {
  console.log('🔍 Controllo date eventi...\n');

  try {
    const snapshot = await getDocs(collection(db, 'cities'));
    const cities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let updatedCount = 0;
    let skippedCount = 0;

    for (const city of cities) {
      const dateString = city.eventData?.dates;
      const currentStatus = city.status;

      console.log(`\n📍 ${city.name}:`);
      console.log(`   Date: ${dateString || 'N/A'}`);
      console.log(`   Status attuale: ${currentStatus}`);

      if (!dateString) {
        console.log(`   ⚠️  Nessuna data trovata - SKIP`);
        skippedCount++;
        continue;
      }

      const eventDate = parseEventDate(dateString);

      if (!eventDate) {
        console.log(`   ⚠️  Impossibile parsare la data - SKIP`);
        skippedCount++;
        continue;
      }

      console.log(`   📅 Data parsata: ${eventDate.toLocaleDateString('it-IT')}`);

      if (eventDate < today && currentStatus !== 'ended') {
        console.log(`   ✅ Evento passato - Aggiorno a "ended"`);
        await updateDoc(doc(db, 'cities', city.id), {
          status: 'ended'
        });
        updatedCount++;
      } else if (eventDate < today) {
        console.log(`   ℹ️  Già marcato come "ended"`);
      } else {
        console.log(`   ✨ Evento futuro - mantiene status "${currentStatus}"`);
      }
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

updatePastEvents();
