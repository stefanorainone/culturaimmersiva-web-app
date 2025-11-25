#!/usr/bin/env node

/**
 * Test script per chiamare la funzione manuale di aggiornamento disponibilità
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin
try {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'culturaimmersiva-it'
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error.message);
  console.log('\n💡 Hint: Make sure you are logged in with Firebase CLI:');
  console.log('   firebase login');
  process.exit(1);
}

async function testManualTrigger() {
  console.log('🔄 Calling manual city availability update function...\n');

  try {
    // Get the function URL
    const projectId = 'culturaimmersiva-it';
    const region = 'europe-west1';
    const functionName = 'manualUpdateCityAvailability';

    console.log(`📞 Calling: https://${region}-${projectId}.cloudfunctions.net/${functionName}`);
    console.log('');

    // For HTTP callable functions, we need to use the client SDK or make an HTTP request
    // Let's use a direct HTTP call with proper authentication
    const { GoogleAuth } = require('google-auth-library');
    const auth = new GoogleAuth();
    const client = await auth.getClient();
    const projectNumber = await auth.getProjectId();

    const url = `https://${region}-${projectId}.cloudfunctions.net/${functionName}`;

    const res = await client.request({
      url: url,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: {
        data: {} // Empty data for callable function
      }
    });

    console.log('✅ Function executed successfully!\n');
    console.log('📊 Result:');
    console.log(JSON.stringify(res.data, null, 2));

  } catch (error) {
    console.error('❌ Error calling function:', error.message);
    if (error.response?.data) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

// Run test
testManualTrigger()
  .then(() => {
    console.log('\n✨ Test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
