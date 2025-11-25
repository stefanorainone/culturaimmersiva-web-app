#!/usr/bin/env node

/**
 * Test script per la funzione di aggiornamento disponibilità città
 *
 * Questo script testa la logica di aggiornamento disponibilità
 * senza dover aspettare il cron job schedulato
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin with application default credentials
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'culturaimmersiva-it'
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.log('\n💡 Hint: Make sure you are logged in with Firebase CLI:');
  console.log('   firebase login');
  console.log('   Or set GOOGLE_APPLICATION_CREDENTIALS environment variable');
  process.exit(1);
}

const db = admin.firestore();

async function testAvailabilityUpdate() {
  console.log('🔄 Starting manual city availability update test...\n');

  try {
    const citiesSnapshot = await db.collection('cities').get();

    let updatedCount = 0;
    let availableCount = 0;
    let unavailableCount = 0;
    const changes = [];

    // Get today's date at start of day
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`📅 Today: ${today.toLocaleDateString('it-IT')}\n`);

    // Process all cities
    for (const cityDoc of citiesSnapshot.docs) {
      const cityId = cityDoc.id;
      const cityData = cityDoc.data();
      const cityName = cityData.name || cityId;

      // Get time slots from eventData
      const timeSlots = cityData.eventData?.timeSlots || [];

      // Check if city has future dates available
      const futureDates = timeSlots.filter(slot => {
        if (!slot.date) return false;
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        return slotDate >= today;
      });

      const hasFutureDates = futureDates.length > 0;
      const newStatus = hasFutureDates ? 'available' : 'ended';
      const currentStatus = cityData.status;

      // Log details
      console.log(`\n📍 ${cityName} (${cityId})`);
      console.log(`   Current Status: ${currentStatus}`);
      console.log(`   Total Slots: ${timeSlots.length}`);
      console.log(`   Future Slots: ${futureDates.length}`);
      if (futureDates.length > 0) {
        const dates = futureDates.slice(0, 3).map(s => s.date).join(', ');
        console.log(`   Dates: ${dates}${futureDates.length > 3 ? '...' : ''}`);
      }
      console.log(`   New Status: ${newStatus}`);

      // Check if status changed
      if (currentStatus !== newStatus) {
        console.log(`   ⚠️  STATUS CHANGE: ${currentStatus} → ${newStatus}`);
        changes.push({
          cityId,
          cityName,
          oldStatus: currentStatus,
          newStatus,
          futureDatesCount: futureDates.length
        });
        updatedCount++;
      } else {
        console.log(`   ✓ No change needed`);
      }

      if (newStatus === 'available') {
        availableCount++;
      } else {
        unavailableCount++;
      }
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total Cities: ${citiesSnapshot.size}`);
    console.log(`Cities to Update: ${updatedCount}`);
    console.log(`Available Cities: ${availableCount}`);
    console.log(`Unavailable Cities: ${unavailableCount}`);

    if (changes.length > 0) {
      console.log('\n📝 CHANGES TO BE APPLIED:');
      changes.forEach(change => {
        console.log(`   ${change.cityName}: ${change.oldStatus} → ${change.newStatus} (${change.futureDatesCount} future dates)`);
      });

      // Ask for confirmation
      console.log('\n❓ Do you want to apply these changes to Firestore? (y/n)');

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('> ', async (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          console.log('\n✅ Applying changes...');

          const batch = db.batch();

          for (const change of changes) {
            const cityRef = db.collection('cities').doc(change.cityId);
            batch.update(cityRef, {
              status: change.newStatus,
              lastAvailabilityCheck: admin.firestore.FieldValue.serverTimestamp()
            });
          }

          await batch.commit();

          // Store summary
          const summary = {
            totalCities: citiesSnapshot.size,
            updatedCities: updatedCount,
            availableCities: availableCount,
            unavailableCities: unavailableCount,
            timestamp: new Date().toISOString(),
            manualRun: true
          };

          await db.collection('maintenance').doc('lastAvailabilityUpdate').set(summary);

          console.log('✨ Changes applied successfully!');
        } else {
          console.log('❌ Changes not applied (dry run only)');
        }

        readline.close();
        process.exit(0);
      });
    } else {
      console.log('\n✅ No changes needed - all cities have correct status');
      process.exit(0);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run test
testAvailabilityUpdate();
