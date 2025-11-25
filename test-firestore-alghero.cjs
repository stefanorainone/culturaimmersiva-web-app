const https = require('https');

console.log('🔍 Testing Firestore public API for Alghero...\n');

// Test using Firestore REST API (public read)
const url = 'https://firestore.googleapis.com/v1/projects/culturaimmersiva-it/databases/(default)/documents/cities/alghero';

https.get(url, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.log(`❌ HTTP ${res.statusCode}`);
      console.log(data);
      return;
    }

    try {
      const doc = JSON.parse(data);

      console.log('📋 Alghero Document from Firestore:\n');

      // Extract fields
      const fields = doc.fields || {};

      console.log(`   Status: ${fields.status?.stringValue || 'N/A'}`);
      console.log(`   Name: ${fields.name?.stringValue || 'N/A'}`);
      console.log(`   Region: ${fields.region?.stringValue || 'N/A'}`);
      console.log(`   Image: ${fields.image?.stringValue ? 'Yes' : 'No'}`);

      if (fields.eventData && fields.eventData.mapValue) {
        const eventData = fields.eventData.mapValue.fields || {};
        console.log('\n📦 EventData:');
        console.log(`   Title: ${eventData.title?.stringValue || 'N/A'}`);
        console.log(`   Description: ${eventData.description?.stringValue ? 'Yes (length: ' + eventData.description.stringValue.length + ')' : 'No'}`);

        if (eventData.pricing && eventData.pricing.mapValue) {
          const pricing = eventData.pricing.mapValue.fields || {};
          console.log(`   Pricing Individual: ${pricing.individual?.integerValue || pricing.individual?.doubleValue || 'N/A'}`);
          console.log(`   Pricing Group: ${pricing.group?.integerValue || pricing.group?.doubleValue || 'N/A'}`);
        } else {
          console.log('   Pricing: No');
        }

        if (eventData.timeSlots && eventData.timeSlots.arrayValue) {
          const slots = eventData.timeSlots.arrayValue.values || [];
          console.log(`   TimeSlots: ${slots.length} slots`);

          if (slots.length > 0) {
            console.log('\n   First 3 slots:');
            slots.slice(0, 3).forEach((slot, i) => {
              const slotFields = slot.mapValue?.fields || {};
              console.log(`     ${i+1}. ${slotFields.day?.stringValue || 'N/A'} ${slotFields.date?.stringValue || 'N/A'} ${slotFields.time?.stringValue || 'N/A'}`);
            });
          }
        } else {
          console.log('   TimeSlots: No slots');
        }
      } else {
        console.log('\n❌ EventData: NOT PRESENT or EMPTY');
      }

      console.log('\n✅ Document retrieved successfully');

    } catch (error) {
      console.error('❌ Error parsing JSON:', error.message);
      console.log('Raw data:', data.substring(0, 500));
    }
  });

}).on('error', (error) => {
  console.error('❌ Request error:', error.message);
});
