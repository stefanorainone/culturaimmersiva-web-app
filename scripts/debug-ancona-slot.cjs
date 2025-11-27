const admin = require('firebase-admin');

// Initialize with project ID
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'culturaimmersiva-it'
  });
}

const db = admin.firestore();

async function debugAnconaSlot() {
  try {
    console.log('🔍 Debug slot Ancona 10:30...\n');

    // 1. Trova tutti gli slot di Ancona
    const slotsSnapshot = await db.collection('timeslots')
      .where('cityId', '==', 'ancona')
      .get();

    console.log(`📊 Trovati ${slotsSnapshot.size} slot per Ancona\n`);

    slotsSnapshot.forEach(doc => {
      const slot = doc.data();
      console.log(`Slot ${doc.id}:`);
      console.log(`  Date: ${slot.date}`);
      console.log(`  Time: ${slot.time}`);
      console.log(`  Total: ${slot.totalSpots}`);
      console.log(`  Booked: ${slot.bookedSpots}`);
      console.log(`  Available: ${slot.availableSpots}`);
      console.log('');
    });

    // 2. Trova tutte le prenotazioni per Ancona
    const bookingsSnapshot = await db.collection('bookings')
      .where('cityId', '==', 'ancona')
      .get();

    console.log(`📋 Trovate ${bookingsSnapshot.size} prenotazioni per Ancona\n`);

    const bookingsByTime = {};
    bookingsSnapshot.forEach(doc => {
      const booking = doc.data();
      const key = `${booking.date}_${booking.time}`;

      if (!bookingsByTime[key]) {
        bookingsByTime[key] = [];
      }

      bookingsByTime[key].push({
        id: doc.id,
        name: booking.name,
        spots: booking.spots,
        date: booking.date,
        time: booking.time
      });
    });

    console.log('Prenotazioni raggruppate per data/ora:');
    Object.keys(bookingsByTime).forEach(key => {
      console.log(`\n${key}:`);
      bookingsByTime[key].forEach(b => {
        console.log(`  - ${b.name}: ${b.spots} posti (ID: ${b.id})`);
      });
      const totalSpots = bookingsByTime[key].reduce((sum, b) => sum + (b.spots || 0), 0);
      console.log(`  TOTALE: ${totalSpots} posti`);
    });

    // 3. Focus su 10:30
    console.log('\n\n🎯 FOCUS su orario 10:30:\n');

    const slot1030 = slotsSnapshot.docs.find(doc => {
      const slot = doc.data();
      return slot.time === '10:30' || slot.time === '10.30';
    });

    if (slot1030) {
      const slotData = slot1030.data();
      console.log(`Slot 10:30 trovato (ID: ${slot1030.id}):`);
      console.log(`  Date: ${slotData.date}`);
      console.log(`  Time: ${slotData.time}`);
      console.log(`  Total Spots: ${slotData.totalSpots}`);
      console.log(`  Booked Spots: ${slotData.bookedSpots}`);
      console.log(`  Available Spots: ${slotData.availableSpots}`);

      // Trova prenotazioni per questo slot
      const key1030 = `${slotData.date}_10:30`;
      const key1030alt = `${slotData.date}_10.30`;
      const bookings1030 = bookingsByTime[key1030] || bookingsByTime[key1030alt] || [];

      console.log(`\nPrenotazioni per questo slot: ${bookings1030.length}`);
      bookings1030.forEach(b => {
        console.log(`  - ${b.name}: ${b.spots} posti (ID: ${b.id})`);
      });

      const totalBookedSpots = bookings1030.reduce((sum, b) => sum + (b.spots || 0), 0);
      console.log(`\nPosti prenotati (somma): ${totalBookedSpots}`);
      console.log(`Posti prenotati (DB): ${slotData.bookedSpots}`);
      console.log(`Posti disponibili (DB): ${slotData.availableSpots}`);
      console.log(`Posti disponibili (calcolati): ${slotData.totalSpots - totalBookedSpots}`);

      if (totalBookedSpots !== slotData.bookedSpots) {
        console.log(`\n❌ INCONSISTENZA TROVATA!`);
        console.log(`   Differenza: ${slotData.bookedSpots - totalBookedSpots} posti`);
      } else {
        console.log(`\n✅ Slot corretto`);
      }
    } else {
      console.log('⚠️  Slot 10:30 NON trovato!');
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  }

  process.exit(0);
}

debugAnconaSlot();
