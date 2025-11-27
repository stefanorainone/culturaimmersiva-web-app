// This script uses Firebase Client SDK, run it in the browser console instead
// Or use gcloud auth application-default login first

console.log(`
⚠️  Questo script richiede autenticazione Firebase Admin.

Opzione 1: Esegui questo comando nella console del browser su https://culturaimmersiva-it.web.app
Opzione 2: Usa firebase CLI

Per ora, ti fornisco il codice da eseguire nella console del browser (F12):
`);

const browserScript = `
// COPIA E INCOLLA QUESTO CODICE NELLA CONSOLE DEL BROWSER (F12)
// Su: https://culturaimmersiva-it.web.app

(async function fixSlotsConsistency() {
  console.log('🔍 Verifica consistenza slot e prenotazioni...\\n');

  const { collection, getDocs, doc, updateDoc } = window.firebaseExports;
  const db = window.db;

  try {
    // 1. Carica tutti gli slot
    const slotsSnapshot = await getDocs(collection(db, 'timeslots'));
    const slots = slotsSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log(\`📊 Trovati \${slots.length} slot totali\\n\`);

    // 2. Carica tutte le prenotazioni
    const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
    const bookings = bookingsSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data()
    }));

    console.log(\`📋 Trovate \${bookings.length} prenotazioni totali\\n\`);

    // 3. Raggruppa prenotazioni per slot
    const bookingsBySlot = {};
    bookings.forEach(booking => {
      const key = \`\${booking.cityId}_\${booking.date}_\${booking.time}\`;
      if (!bookingsBySlot[key]) {
        bookingsBySlot[key] = [];
      }
      bookingsBySlot[key].push(booking);
    });

    console.log('🔄 Verifica slot...\\n');

    let corrected = 0;
    let alreadyCorrect = 0;
    const updates = [];

    for (const slot of slots) {
      const key = \`\${slot.cityId}_\${slot.date}_\${slot.time}\`;
      const slotBookings = bookingsBySlot[key] || [];

      // Calcola posti realmente prenotati
      const actualBookedSpots = slotBookings.reduce((sum, b) => sum + (b.spots || 1), 0);
      const currentBookedSpots = slot.bookedSpots || 0;
      const totalSpots = slot.totalSpots || 10;

      // Calcola posti disponibili corretti
      const correctAvailableSpots = totalSpots - actualBookedSpots;
      const currentAvailableSpots = slot.availableSpots || totalSpots;

      if (actualBookedSpots !== currentBookedSpots || correctAvailableSpots !== currentAvailableSpots) {
        console.log(\`❌ INCONSISTENZA trovata:\`);
        console.log(\`   Città: \${slot.cityName || slot.cityId}\`);
        console.log(\`   Data: \${slot.date} \${slot.time}\`);
        console.log(\`   Posti prenotati DB: \${currentBookedSpots} → Posti reali: \${actualBookedSpots}\`);
        console.log(\`   Posti disponibili DB: \${currentAvailableSpots} → Corretti: \${correctAvailableSpots}\`);
        console.log(\`   Prenotazioni trovate: \${slotBookings.length} (\${slotBookings.map(b => \`\${b.name}: \${b.spots}\`).join(', ')})\`);
        console.log('');

        updates.push({
          slotId: slot.id,
          data: {
            bookedSpots: actualBookedSpots,
            availableSpots: correctAvailableSpots
          },
          info: {
            cityName: slot.cityName || slot.cityId,
            date: slot.date,
            time: slot.time,
            old: { booked: currentBookedSpots, available: currentAvailableSpots },
            new: { booked: actualBookedSpots, available: correctAvailableSpots }
          }
        });
        corrected++;
      } else {
        alreadyCorrect++;
      }
    }

    console.log('\\n📈 Riepilogo:');
    console.log(\`   ✅ Slot già corretti: \${alreadyCorrect}\`);
    console.log(\`   🔧 Slot da correggere: \${corrected}\\n\`);

    if (updates.length > 0) {
      console.log('🔄 Applicazione correzioni...\\n');

      for (const update of updates) {
        await updateDoc(doc(db, 'timeslots', update.slotId), update.data);
        console.log(\`✅ Corretto: \${update.info.cityName} - \${update.info.date} \${update.info.time}\`);
        console.log(\`   Prenotati: \${update.info.old.booked} → \${update.info.new.booked}\`);
        console.log(\`   Disponibili: \${update.info.old.available} → \${update.info.new.available}\\n\`);
      }

      console.log(\`\\n🎉 \${updates.length} slot corretti con successo!\`);
    } else {
      console.log('🎉 Tutti gli slot sono già corretti!');
    }

  } catch (error) {
    console.error('❌ Errore:', error);
  }
})();
`;

console.log(browserScript);
console.log('\n\n✅ Codice pronto. Copia e incolla nella console del browser.\n');
