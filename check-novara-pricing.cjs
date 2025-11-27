const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkNovaraPricing() {
  try {
    console.log('🔍 Checking Novara pricing...\n');

    const cityDoc = await db.collection('cities').doc('novara').get();

    if (!cityDoc.exists) {
      console.log('❌ Novara not found in database');
      return;
    }

    const cityData = cityDoc.data();
    console.log('📊 Full city data:', JSON.stringify(cityData, null, 2));

    console.log('\n💰 Pricing data:');
    console.log('  - eventData exists:', !!cityData.eventData);
    console.log('  - eventData.pricing exists:', !!cityData.eventData?.pricing);
    console.log('  - Pricing object:', cityData.eventData?.pricing);
    console.log('  - individual:', cityData.eventData?.pricing?.individual);
    console.log('  - group:', cityData.eventData?.pricing?.group);
    console.log('  - groupSize:', cityData.eventData?.pricing?.groupSize);
    console.log('  - currency:', cityData.eventData?.pricing?.currency);

    console.log('\n✅ Check complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkNovaraPricing();
