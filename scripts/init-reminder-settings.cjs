// Simple script to initialize reminder settings in Firestore
// Run this from the browser console in the admin panel

const defaultSettings = {
  enabled: true,
  timing: {
    threeDaysBefore: {
      enabled: true,
      hoursBeforeEvent: 72,
      label: '3 giorni prima'
    },
    oneDayBefore: {
      enabled: true,
      hoursBeforeEvent: 24,
      label: '1 giorno prima'
    },
    oneHourBefore: {
      enabled: true,
      hoursBeforeEvent: 1,
      label: '1 ora prima'
    }
  },
  templates: {
    threeDaysBefore: {
      subject: 'Reminder: {cityName} tra 3 giorni',
      emoji: '⏰',
      title: 'Promemoria - 3 giorni all\'evento',
      message: 'Ti ricordiamo che la tua esperienza immersiva a <strong>{cityName}</strong> si terrà tra 3 giorni!'
    },
    oneDayBefore: {
      subject: 'Reminder: {cityName} domani',
      emoji: '🔔',
      title: 'Promemoria - Evento domani!',
      message: 'Ti ricordiamo che domani avrai la tua esperienza immersiva a <strong>{cityName}</strong>. Ci vediamo presto!'
    },
    oneHourBefore: {
      subject: 'Ultimo Reminder: {cityName} tra 1 ora',
      emoji: '🚨',
      title: 'Promemoria - Evento tra 1 ora!',
      message: 'La tua esperienza immersiva a <strong>{cityName}</strong> inizierà tra circa 1 ora. Ti aspettiamo!'
    }
  },
  variables: [
    '{cityName} - Nome della città',
    '{customerName} - Nome del cliente',
    '{eventDate} - Data dell\'evento',
    '{eventTime} - Orario dell\'evento',
    '{locationName} - Nome location',
    '{locationAddress} - Indirizzo location',
    '{spots} - Numero posti prenotati'
  ]
};

console.log('📋 Default Reminder Settings:');
console.log(JSON.stringify(defaultSettings, null, 2));
console.log('\n🔧 To initialize in Firestore, run this in browser console (when logged in as admin):');
console.log(`
import { db } from './config/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

const settings = ${JSON.stringify(defaultSettings, null, 2)};
settings.updatedAt = serverTimestamp();

await setDoc(doc(db, 'settings', 'reminders'), settings);
console.log('✅ Settings initialized!');
`);
