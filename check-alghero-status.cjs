const admin = require('firebase-admin');

try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'culturaimmersiva-it'
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  process.exit(1);
}

const db = admin.firestore();

async function checkAlgheroStatus() {
  console.log('🔍 Checking Alghero status in Firestore...\n');

  try {
    const algheroDoc = await db.collection('cities').doc('alghero').get();

    if (!algheroDoc.exists) {
      console.log('❌ Alghero not found in Firestore!');
      return;
    }

    const data = algheroDoc.data();

    console.log('📋 Alghero Document Data:\n');
    console.log(`   Status: ${data.status}`);
    console.log(`   Name: ${data.name}`);
    console.log(`   Region: ${data.region}`);
    console.log(`   Has eventData: ${!!data.eventData}`);

    if (data.eventData) {
      console.log('\n📦 EventData:');
      console.log(`   Title: ${data.eventData.title || 'N/A'}`);
      console.log(`   Description: ${data.eventData.description ? 'Yes' : 'No'}`);
      console.log(`   Pricing: ${data.eventData.pricing ? JSON.stringify(data.eventData.pricing) : 'N/A'}`);
      console.log(`   TimeSlots: ${data.eventData.timeSlots ? data.eventData.timeSlots.length : 0} slots`);

      if (data.eventData.timeSlots && data.eventData.timeSlots.length > 0) {
        console.log('\n⏰ TimeSlots Preview:');
        data.eventData.timeSlots.slice(0, 3).forEach(slot => {
          console.log(`   - ${slot.day || 'N/A'}: ${slot.date || 'N/A'} ${slot.time || 'N/A'} (${slot.capacity || 0} posti)`);
        });
        if (data.eventData.timeSlots.length > 3) {
          console.log(`   ... and ${data.eventData.timeSlots.length - 3} more`);
        }

        // Check for future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const futureDates = data.eventData.timeSlots.filter(slot => {
          if (!slot.date) return false;
          const slotDate = new Date(slot.date);
          slotDate.setHours(0, 0, 0, 0);
          return slotDate >= today;
        });

        console.log(`\n📅 Future dates: ${futureDates.length}`);
        if (futureDates.length > 0) {
          console.log('   ✅ Has future dates - should be AVAILABLE');
        } else {
          console.log('   ❌ No future dates - should be ENDED');
        }
      }
    }

    console.log('\n🎯 Expected Status Based on Data:');
    if (data.status === 'available') {
      console.log('   Current: AVAILABLE ✅');
    } else {
      console.log('   Current: ENDED ❌');
    }

    // Recommendation
    console.log('\n💡 Recommendation:');
    if (data.status === 'ended') {
      console.log('   To make Alghero available:');
      console.log('   1. Set status to "available" in admin dashboard');
      console.log('   2. Add future dates in timeSlots');
      console.log('   3. Complete eventData (title, description, pricing)');
    } else {
      console.log('   Status is already "available" - check if eventData is complete');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

checkAlgheroStatus();
